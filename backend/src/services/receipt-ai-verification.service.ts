import path from "node:path";
import process from "node:process";

import prisma from "../db/prisma.js";
import { analyzeReceiptWithAiFallback } from "./receipt-ai.service.js";

const MIN_MATCH_CONFIDENCE = 0.7;

type ResponsibleManagerResolution =
  | {
      status: "FOUND";
      managerId: string;
      source: "BLOCK" | "SITE";
    }
  | {
      status: "NOT_FOUND" | "MULTIPLE";
      managerId: null;
      source: "BLOCK" | "SITE";
    };

function normalizeIban(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return normalized.length > 0 ? normalized : null;
}

async function resolveResponsibleManager(params: {
  blockId: string;
  siteId: string;
}): Promise<ResponsibleManagerResolution> {
  const blockAssignments = await prisma.managerAssignment.findMany({
    where: {
      scopeType: "BLOCK",
      blockId: params.blockId,
      manager: {
        role: "MANAGER",
        status: "ACTIVE",
      },
    },
    select: {
      managerId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const blockManagerIds = Array.from(
    new Set(blockAssignments.map((assignment) => assignment.managerId)),
  );

  if (blockManagerIds.length === 1) {
    return {
      status: "FOUND",
      managerId: blockManagerIds[0],
      source: "BLOCK",
    };
  }

  if (blockManagerIds.length > 1) {
    return {
      status: "MULTIPLE",
      managerId: null,
      source: "BLOCK",
    };
  }

  const siteAssignments = await prisma.managerAssignment.findMany({
    where: {
      scopeType: "SITE",
      siteId: params.siteId,
      manager: {
        role: "MANAGER",
        status: "ACTIVE",
      },
    },
    select: {
      managerId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const siteManagerIds = Array.from(
    new Set(siteAssignments.map((assignment) => assignment.managerId)),
  );

  if (siteManagerIds.length === 1) {
    return {
      status: "FOUND",
      managerId: siteManagerIds[0],
      source: "SITE",
    };
  }

  return {
    status: siteManagerIds.length > 1 ? "MULTIPLE" : "NOT_FOUND",
    managerId: null,
    source: "SITE",
  };
}

function getManagerResolutionReason(
  resolution: ResponsibleManagerResolution,
) {
  if (resolution.status === "NOT_FOUND") {
    return "Ödeme hesabından sorumlu aktif yönetici bulunamadı.";
  }

  if (resolution.status === "MULTIPLE") {
    return resolution.source === "BLOCK"
      ? "Blok için birden fazla sorumlu yönetici bulundu."
      : "Site için birden fazla sorumlu yönetici bulundu.";
  }

  return null;
}

export async function verifyPaymentReceiptWithAi(receiptId: string) {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: {
      id: receiptId,
    },
    select: {
      id: true,
      originalFileName: true,
      storedFileName: true,
      mimeType: true,
      paymentAllocation: {
        select: {
          amountKurus: true,
          apartment: {
            select: {
              block: {
                select: {
                  id: true,
                  site: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new Error("AI kontrolü yapılacak dekont bulunamadı.");
  }

  await prisma.paymentReceipt.update({
    where: {
      id: receipt.id,
    },
    data: {
      aiStatus: "PROCESSING",
      aiReasons: [],
      aiErrorMessage: null,
      aiVerifiedAt: null,
    },
  });

  const expectedAmountKurus = receipt.paymentAllocation.amountKurus;
  const blockId = receipt.paymentAllocation.apartment.block.id;
  const siteId = receipt.paymentAllocation.apartment.block.site.id;

  try {
    const managerResolution = await resolveResponsibleManager({
      blockId,
      siteId,
    });

    const managerResolutionReason =
      getManagerResolutionReason(managerResolution);

    let expectedIban: string | null = null;

    if (
      managerResolution.status === "FOUND" &&
      managerResolution.managerId
    ) {
      const bankAccount =
        await prisma.managerSiteBankAccount.findUnique({
          where: {
            managerId_siteId: {
              managerId: managerResolution.managerId,
              siteId,
            },
          },
          select: {
            iban: true,
          },
        });

      expectedIban = normalizeIban(bankAccount?.iban);
    }

    const receiptFilePath = path.join(
      process.cwd(),
      "uploads",
      "receipts",
      receipt.storedFileName,
    );

    const aiResult = await analyzeReceiptWithAiFallback({
      filePath: receiptFilePath,
      mimeType: receipt.mimeType,
      originalFileName: receipt.originalFileName,
    });

    if (!aiResult.provider) {
      return await prisma.paymentReceipt.update({
        where: {
          id: receipt.id,
        },
        data: {
          aiStatus: "FAILED",
          aiProvider: null,
          aiModelName: null,
          aiPayerName: null,
          aiAmountKurus: null,
          aiRecipientIban: null,
          aiExpectedAmountKurus: expectedAmountKurus,
          aiExpectedIban: expectedIban,
          aiAmountMatches: null,
          aiIbanMatches: null,
          aiApartmentNumber: null,
          aiDescription: null,
          aiPaymentDate: null,
          aiConfidence: 0,
          aiReasons: [
            "Aktif AI sağlayıcısından geçerli sonuç alınamadı.",
          ],
          aiErrorMessage:
            "AI sağlayıcısı kullanılamadı veya dekont okunamadı.",
          aiAnalyzedAt: null,
          aiVerifiedAt: new Date(),
        },
      });
    }

    const extractedIban = normalizeIban(aiResult.recipientIban);

    const amountMatches =
      aiResult.amountKurus === null
        ? null
        : aiResult.amountKurus === expectedAmountKurus;

    const ibanMatches =
      extractedIban && expectedIban
        ? extractedIban === expectedIban
        : null;

    const reasons: string[] = [];

    if (aiResult.amountKurus === null) {
      reasons.push("AI dekont tutarını okuyamadı.");
    } else if (!amountMatches) {
      reasons.push("Dekont tutarı beklenen ödeme tutarıyla eşleşmiyor.");
    }

    if (managerResolutionReason) {
      reasons.push(managerResolutionReason);
    } else if (!expectedIban) {
      reasons.push(
        "Sorumlu yöneticinin bu site için banka hesabı bulunamadı.",
      );
    }

    if (!extractedIban) {
      reasons.push("AI alıcı IBAN bilgisini okuyamadı.");
    } else if (expectedIban && !ibanMatches) {
      reasons.push("Dekonttaki alıcı IBAN, beklenen IBAN ile eşleşmiyor.");
    }

    if (aiResult.confidence < MIN_MATCH_CONFIDENCE) {
      reasons.push(
        "AI okuma güveni yeterli seviyenin altında.",
      );
    }

    const aiStatus =
      amountMatches === true &&
      ibanMatches === true &&
      aiResult.confidence >= MIN_MATCH_CONFIDENCE &&
      reasons.length === 0
        ? "MATCHED"
        : "REVIEW_REQUIRED";

    return await prisma.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        aiStatus,
        aiProvider: aiResult.provider,
        aiModelName: aiResult.modelName,
        aiPayerName: aiResult.payerName,
        aiAmountKurus: aiResult.amountKurus,
        aiRecipientIban: extractedIban,
        aiExpectedAmountKurus: expectedAmountKurus,
        aiExpectedIban: expectedIban,
        aiAmountMatches: amountMatches,
        aiIbanMatches: ibanMatches,
        aiApartmentNumber: aiResult.apartmentNumber,
        aiDescription: aiResult.description,
        aiPaymentDate: aiResult.paymentDate,
        aiConfidence: aiResult.confidence,
        aiReasons: reasons,
        aiErrorMessage: null,
        aiAnalyzedAt: new Date(),
        aiVerifiedAt: new Date(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "AI dekont kontrolü sırasında bilinmeyen hata oluştu.";

    return await prisma.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        aiStatus: "FAILED",
        aiReasons: ["AI dekont kontrolü tamamlanamadı."],
        aiErrorMessage: errorMessage.slice(0, 500),
        aiVerifiedAt: new Date(),
      },
    });
  }
}
