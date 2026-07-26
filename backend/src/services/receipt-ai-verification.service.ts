import path from "node:path";
import process from "node:process";

import prisma from "../db/prisma.js";
import {
  buildReceiptTransactionFingerprint,
  parseReceiptTransactionAt,
} from "./receipt-fingerprint.service.js";
import {
  notifyReceiptAutoRejected,
  type ReceiptAutoRejectReason,
} from "./receipt-notification.service.js";
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

function formatKurusAsTry(amountKurus: number) {
  return `${(Math.max(0, amountKurus) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
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

function getAutoRejectReviewNote(reason: ReceiptAutoRejectReason) {
  if (reason === "IBAN_MISMATCH") {
    return "Dekontta okunan alıcı IBAN, sistemde kayıtlı ödeme IBAN'ı ile eşleşmediği için dekont otomatik olarak reddedildi.";
  }

  if (reason === "DUPLICATE_TRANSACTION") {
    return "Aynı ödeme işlemini gösteren dekont daha önce sisteme yüklendiği için dekont otomatik olarak reddedildi.";
  }

  return "Aynı dekont dosyası daha önce sisteme yüklendiği için dekont otomatik olarak reddedildi.";
}

function buildReviewNote(params: {
  aiStatus:
    | "MATCHED"
    | "OVERPAYMENT"
    | "PARTIAL_PAYMENT"
    | "REVIEW_REQUIRED";
  expectedAmountKurus: number;
  aiAmountKurus: number | null;
  overpaymentAmountKurus: number;
  shortfallAmountKurus: number;
  reasons: string[];
}) {
  if (
    params.aiStatus === "OVERPAYMENT" &&
    params.aiAmountKurus !== null
  ) {
    return (
      `Beklenen ödeme tutarı ${formatKurusAsTry(
        params.expectedAmountKurus,
      )}, dekontta okunan tutar ${formatKurusAsTry(
        params.aiAmountKurus,
      )}'dir. ${formatKurusAsTry(
        params.overpaymentAmountKurus,
      )} fazla ödeme tespit edildi. Dekont yönetici onayı bekliyor.`
    );
  }

  if (
    params.aiStatus === "PARTIAL_PAYMENT" &&
    params.aiAmountKurus !== null
  ) {
    return (
      `Beklenen ödeme tutarı ${formatKurusAsTry(
        params.expectedAmountKurus,
      )}, dekontta okunan tutar ${formatKurusAsTry(
        params.aiAmountKurus,
      )}'dir. ${formatKurusAsTry(
        params.shortfallAmountKurus,
      )} eksik ödeme bulundu. Dekont kısmi ödeme olarak yönetici onayı bekliyor.`
    );
  }

  if (params.aiStatus === "MATCHED") {
    return "Dekont tutarı ve alıcı IBAN bilgisi beklenen ödeme kaydıyla eşleşti. Dekont yönetici onayı bekliyor.";
  }

  return params.reasons.length > 0
    ? params.reasons.join(" ")
    : "Dekont için manuel kontrol gerekiyor.";
}

async function autoRejectReceipt(params: {
  receiptId: string;
  reason: ReceiptAutoRejectReason;
  aiData: {
    aiProvider: "OPENAI" | "GEMINI" | "CUSTOM";
    aiModelName: string | null;
    aiPayerName: string | null;
    aiAmountKurus: number | null;
    aiRecipientIban: string | null;
    aiExpectedAmountKurus: number;
    aiExpectedIban: string | null;
    aiAmountMatches: boolean | null;
    aiIbanMatches: boolean | null;
    aiApartmentNumber: string | null;
    aiDescription: string | null;
    aiPaymentDate: string | null;
    aiTransactionReference: string | null;
    aiOverpaymentAmountKurus: number;
    aiShortfallAmountKurus: number;
    aiConfidence: number;
    transactionAt: Date | null;
    transactionReference: string | null;
    transactionFingerprint: string | null;
  };
}) {
  const now = new Date();
  const reviewNote = getAutoRejectReviewNote(params.reason);

  const rejectedReceipt = await prisma.paymentReceipt.update({
    where: {
      id: params.receiptId,
    },
    data: {
      status: "REJECTED",
      aiStatus: "AUTO_REJECTED",
      ...params.aiData,
      aiReasons: [reviewNote],
      aiErrorMessage: null,
      aiAnalyzedAt: now,
      aiVerifiedAt: now,
      reviewNote,
      reviewedAt: now,
      reviewedByUserId: null,
      autoRejectReason: params.reason,
      autoRejectedAt: now,
    },
  });

  try {
    await notifyReceiptAutoRejected({
      receiptId: rejectedReceipt.id,
      reason: params.reason,
    });
  } catch (notificationError) {
    console.error("Otomatik reddedilen dekont bildirimi gönderilemedi:", {
      receiptId: rejectedReceipt.id,
      reason: params.reason,
      error: notificationError,
    });
  }

  return rejectedReceipt;
}

export async function verifyPaymentReceiptWithAi(receiptId: string) {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: {
      id: receiptId,
    },
    select: {
      id: true,
      status: true,
      originalFileName: true,
      storedFileName: true,
      mimeType: true,
      fileHash: true,
      uploadedByUserId: true,
      paymentAllocation: {
        select: {
          amountKurus: true,
          paidAmountKurus: true,
          apartment: {
            select: {
              id: true,
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

  if (receipt.status !== "PENDING") {
    return prisma.paymentReceipt.findUniqueOrThrow({
      where: {
        id: receipt.id,
      },
    });
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
      autoRejectReason: null,
      autoRejectedAt: null,
    },
  });

  const expectedAmountKurus = Math.max(
    receipt.paymentAllocation.amountKurus -
      receipt.paymentAllocation.paidAmountKurus,
    0,
  );
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
          aiTransactionReference: null,
          aiOverpaymentAmountKurus: null,
          aiShortfallAmountKurus: null,
          aiConfidence: 0,
          aiReasons: [
            "Aktif AI sağlayıcısından geçerli sonuç alınamadı.",
          ],
          aiErrorMessage:
            "AI sağlayıcısı kullanılamadı veya dekont okunamadı.",
          aiAnalyzedAt: null,
          aiVerifiedAt: new Date(),
          transactionAt: null,
          transactionReference: null,
          transactionFingerprint: null,
          reviewNote:
            "AI sağlayıcısı kullanılamadı veya dekont okunamadı. Manuel kontrol gerekiyor.",
        },
      });
    }

    const extractedIban = normalizeIban(aiResult.recipientIban);
    const transactionAt = parseReceiptTransactionAt(aiResult.paymentDate);
    const transactionFingerprint =
      buildReceiptTransactionFingerprint({
        paymentDate: aiResult.paymentDate,
        transactionAt,
        amountKurus: aiResult.amountKurus,
        recipientIban: extractedIban,
        transactionReference: aiResult.transactionReference,
      });

    const amountMatches =
      aiResult.amountKurus === null
        ? null
        : aiResult.amountKurus === expectedAmountKurus;

    const ibanMatches =
      extractedIban && expectedIban
        ? extractedIban === expectedIban
        : null;

    const overpaymentAmountKurus =
      aiResult.amountKurus === null
        ? 0
        : Math.max(aiResult.amountKurus - expectedAmountKurus, 0);

    const shortfallAmountKurus =
      aiResult.amountKurus === null
        ? 0
        : Math.max(expectedAmountKurus - aiResult.amountKurus, 0);

    const commonAiData = {
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
      aiTransactionReference: aiResult.transactionReference,
      aiOverpaymentAmountKurus: overpaymentAmountKurus,
      aiShortfallAmountKurus: shortfallAmountKurus,
      aiConfidence: aiResult.confidence,
      transactionAt,
      transactionReference: aiResult.transactionReference,
      transactionFingerprint,
    };

    if (transactionFingerprint) {
      const duplicateTransaction =
        await prisma.paymentReceipt.findFirst({
          where: {
            id: {
              not: receipt.id,
            },
            transactionFingerprint,
          },
          select: {
            id: true,
          },
        });

      if (duplicateTransaction) {
        return await autoRejectReceipt({
          receiptId: receipt.id,
          reason: "DUPLICATE_TRANSACTION",
          aiData: commonAiData,
        });
      }
    }

    /*
     * PDF'nin ekran görüntüsü alındığında dosya hash'i değişir.
     * AI de önceki kayıtta masraflı toplamı, yeni görüntüde gerçek havale
     * tutarını okuyabilir. Bu durumda tutarı içeren fingerprint değişir.
     *
     * Aynı kullanıcı, aynı daire, aynı alıcı IBAN ve dekont üzerindeki aynı
     * işlem saniyesi güçlü bir tekrar sinyalidir. Böylece ekran görüntüsü
     * olarak yeniden yüklenen aynı banka işlemi yakalanır.
     */
    if (transactionAt && extractedIban) {
      const transactionWindowStart = new Date(transactionAt.getTime() - 1_000);
      const transactionWindowEnd = new Date(transactionAt.getTime() + 1_000);

      const duplicateTransactionByCoreFields =
        await prisma.paymentReceipt.findFirst({
          where: {
            id: {
              not: receipt.id,
            },
            uploadedByUserId: receipt.uploadedByUserId,
            aiRecipientIban: extractedIban,
            transactionAt: {
              gte: transactionWindowStart,
              lte: transactionWindowEnd,
            },
            paymentAllocation: {
              apartmentId: receipt.paymentAllocation.apartment.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateTransactionByCoreFields) {
        return await autoRejectReceipt({
          receiptId: receipt.id,
          reason: "DUPLICATE_TRANSACTION",
          aiData: commonAiData,
        });
      }
    }

    if (ibanMatches === false) {
      return await autoRejectReceipt({
        receiptId: receipt.id,
        reason: "IBAN_MISMATCH",
        aiData: commonAiData,
      });
    }

    const reasons: string[] = [];

    if (aiResult.amountKurus === null) {
      reasons.push("AI dekont tutarını okuyamadı.");
    } else if (overpaymentAmountKurus > 0) {
      reasons.push(
        `${formatKurusAsTry(
          overpaymentAmountKurus,
        )} fazla ödeme tespit edildi.`,
      );
    } else if (shortfallAmountKurus > 0) {
      reasons.push(
        `${formatKurusAsTry(
          shortfallAmountKurus,
        )} eksik ödeme tespit edildi.`,
      );
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
    }

    if (aiResult.confidence < MIN_MATCH_CONFIDENCE) {
      reasons.push(
        "AI okuma güveni yeterli seviyenin altında.",
      );
    }

    const canTrustPaymentDecision =
      ibanMatches === true &&
      aiResult.amountKurus !== null &&
      aiResult.confidence >= MIN_MATCH_CONFIDENCE &&
      !managerResolutionReason &&
      Boolean(expectedIban);

    const aiStatus =
      canTrustPaymentDecision && overpaymentAmountKurus > 0
        ? ("OVERPAYMENT" as const)
        : canTrustPaymentDecision && shortfallAmountKurus > 0
          ? ("PARTIAL_PAYMENT" as const)
          : canTrustPaymentDecision &&
              amountMatches === true &&
              reasons.length === 0
            ? ("MATCHED" as const)
            : ("REVIEW_REQUIRED" as const);

    const reviewNote = buildReviewNote({
      aiStatus,
      expectedAmountKurus,
      aiAmountKurus: aiResult.amountKurus,
      overpaymentAmountKurus,
      shortfallAmountKurus,
      reasons,
    });

    return await prisma.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        aiStatus,
        ...commonAiData,
        aiReasons: reasons,
        aiErrorMessage: null,
        aiAnalyzedAt: new Date(),
        aiVerifiedAt: new Date(),
        reviewNote,
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
        reviewNote:
          "AI dekont kontrolü tamamlanamadı. Manuel kontrol gerekiyor.",
      },
    });
  }
}
