import express, { type Request, type Response } from "express";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("RESIDENT"));

function buildResidentApartmentWhere(
  userId: string,
  selectedApartmentId: string | null
) {
  return {
    AND: [
      {
        residents: {
          some: {
            userId,
          },
        },
      },
      ...(selectedApartmentId
        ? [
            {
              id: selectedApartmentId,
            },
          ]
        : []),
    ],
  } satisfies Prisma.ApartmentWhereInput;
}


type ResidentAlertTone = "yellow" | "red" | "blue";
type ResidentAlertKind =
  | "PARTIAL_PAYMENT"
  | "WRONG_IBAN"
  | "DUPLICATE_RECEIPT"
  | "OVERPAYMENT";

function getResidentAlertDate(receipt: {
  reviewedAt: Date | null;
  autoRejectedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}) {
  return (
    receipt.reviewedAt ??
    receipt.autoRejectedAt ??
    receipt.updatedAt ??
    receipt.createdAt
  );
}

function mapReceiptToResidentAlert(receipt: {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  aiStatus:
    | "NOT_CHECKED"
    | "PROCESSING"
    | "MATCHED"
    | "OVERPAYMENT"
    | "PARTIAL_PAYMENT"
    | "AUTO_REJECTED"
    | "REVIEW_REQUIRED"
    | "FAILED";
  aiShortfallAmountKurus: number | null;
  aiOverpaymentAmountKurus: number | null;
  paymentAmountKurus: number | null;
  autoRejectReason: string | null;
  autoRejectedAt: Date | null;
  paymentAllocation: {
    amountKurus: number;
    paidAmountKurus: number;
    paymentBatch: {
      id: string;
      title: string;
    };
    apartment: {
      id: string;
      number: string;
      block: {
        id: string;
        name: string;
        site: {
          id: string;
          name: string;
        };
      };
    };
  };
}) {
  const paymentTitle = receipt.paymentAllocation.paymentBatch.title;
  const apartment = receipt.paymentAllocation.apartment;
  const apartmentLabel =
    `${apartment.block.site.name} / ${apartment.block.name} / ` +
    `Daire ${apartment.number}`;
  const alertDate = getResidentAlertDate(receipt);

  if (receipt.autoRejectReason === "IBAN_MISMATCH") {
    return {
      id: receipt.id,
      kind: "WRONG_IBAN" as ResidentAlertKind,
      tone: "red" as ResidentAlertTone,
      title: "Yanlış IBAN Uyarısı",
      description:
        receipt.reviewNote ??
        "Gönderdiğiniz dekont, ödemenin sistemde kayıtlı IBAN yerine farklı bir IBAN'a gönderildiği tespit edildiği için reddedildi.",
      paymentTitle,
      apartmentLabel,
      amountKurus: receipt.paymentAmountKurus,
      differenceAmountKurus: null,
      date: alertDate,
    };
  }

  if (
    receipt.autoRejectReason === "DUPLICATE_FILE" ||
    receipt.autoRejectReason === "DUPLICATE_TRANSACTION"
  ) {
    return {
      id: receipt.id,
      kind: "DUPLICATE_RECEIPT" as ResidentAlertKind,
      tone: "red" as ResidentAlertTone,
      title: "Tekrarlanan Dekont Uyarısı",
      description:
        receipt.reviewNote ??
        "Aynı dekont veya aynı banka işlemi daha önce sisteme yüklendiği için kayıt otomatik olarak reddedildi.",
      paymentTitle,
      apartmentLabel,
      amountKurus: receipt.paymentAmountKurus,
      differenceAmountKurus: null,
      date: alertDate,
    };
  }

  const overpaymentAmountKurus = Math.max(
    Number(receipt.aiOverpaymentAmountKurus ?? 0),
    0,
  );

  if (
    receipt.status === "APPROVED" &&
    (receipt.aiStatus === "OVERPAYMENT" || overpaymentAmountKurus > 0)
  ) {
    return {
      id: receipt.id,
      kind: "OVERPAYMENT" as ResidentAlertKind,
      tone: "blue" as ResidentAlertTone,
      title: "Fazla Ödeme Bilgisi",
      description:
        receipt.reviewNote ??
        "Ödemeniz onaylandı ve fazla yatırılan tutar hesabınıza bakiye olarak kaydedildi.",
      paymentTitle,
      apartmentLabel,
      amountKurus: receipt.paymentAmountKurus,
      differenceAmountKurus: overpaymentAmountKurus,
      date: alertDate,
    };
  }

  const shortfallAmountKurus = Math.max(
    Number(receipt.aiShortfallAmountKurus ?? 0),
    0,
  );

  if (
    receipt.status === "APPROVED" &&
    (receipt.aiStatus === "PARTIAL_PAYMENT" || shortfallAmountKurus > 0)
  ) {
    return {
      id: receipt.id,
      kind: "PARTIAL_PAYMENT" as ResidentAlertKind,
      tone: "yellow" as ResidentAlertTone,
      title: "Eksik Ödeme Uyarısı",
      description:
        receipt.reviewNote ??
        "Kısmi ödemeniz onaylandı. Kalan borç tutarını ödeme kayıtlarınızdan takip edebilirsiniz.",
      paymentTitle,
      apartmentLabel,
      amountKurus: receipt.paymentAmountKurus,
      differenceAmountKurus: shortfallAmountKurus,
      date: alertDate,
    };
  }

  return null;
}

router.get(
  "/payments",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const residentApartmentWhere = buildResidentApartmentWhere(
      authenticatedRequest.user.id,
      authenticatedRequest.user.selectedApartmentId
    );

    const payments = await prisma.paymentAllocation.findMany({
      where: {
        apartment: residentApartmentWhere,
      },
      include: {
        paymentBatch: {
          select: {
            id: true,
            title: true,
            description: true,
            totalAmountKurus: true,
            scopeType: true,
            dueDate: true,
            createdAt: true,
          },
        },
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            block: {
              select: {
                id: true,
                name: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
        receipts: {
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            sizeBytes: true,
            status: true,
            note: true,
            reviewNote: true,
            reviewedAt: true,
            aiStatus: true,
            aiAmountMatches: true,
            aiIbanMatches: true,
            aiReasons: true,
            aiErrorMessage: true,
            aiConfidence: true,
            aiAnalyzedAt: true,
            aiVerifiedAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: payments,
    });
  })
);

router.get(
  "/apartments",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const apartments = await prisma.apartmentResident.findMany({
      where: {
        userId: authenticatedRequest.user.id,
      },
      include: {
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            description: true,
            block: {
              select: {
                id: true,
                name: true,
                description: true,
                site: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    description: true,
                    hasElevator: true,
                    systems: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.status(200).json({
      success: true,
      data: apartments,
    });
  })
);


router.get(
  "/alerts",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const requestedLimit = Number(request.query.limit);
    const limit =
      Number.isInteger(requestedLimit) &&
      requestedLimit > 0 &&
      requestedLimit <= 100
        ? requestedLimit
        : 100;

    const residentApartmentWhere = buildResidentApartmentWhere(
      authenticatedRequest.user.id,
      authenticatedRequest.user.selectedApartmentId,
    );

    const receipts = await prisma.paymentReceipt.findMany({
      where: {
        paymentAllocation: {
          apartment: residentApartmentWhere,
        },
        OR: [
          {
            status: "REJECTED",
            autoRejectReason: {
              in: [
                "IBAN_MISMATCH",
                "DUPLICATE_FILE",
                "DUPLICATE_TRANSACTION",
              ],
            },
          },
          {
            status: "APPROVED",
            aiStatus: "PARTIAL_PAYMENT",
          },
          {
            status: "APPROVED",
            aiStatus: "OVERPAYMENT",
          },
          {
            status: "APPROVED",
            aiShortfallAmountKurus: {
              gt: 0,
            },
          },
          {
            status: "APPROVED",
            aiOverpaymentAmountKurus: {
              gt: 0,
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        aiStatus: true,
        aiShortfallAmountKurus: true,
        aiOverpaymentAmountKurus: true,
        paymentAmountKurus: true,
        autoRejectReason: true,
        autoRejectedAt: true,
        paymentAllocation: {
          select: {
            amountKurus: true,
            paidAmountKurus: true,
            paymentBatch: {
              select: {
                id: true,
                title: true,
              },
            },
            apartment: {
              select: {
                id: true,
                number: true,
                block: {
                  select: {
                    id: true,
                    name: true,
                    site: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: limit,
    });

    const alerts = receipts
      .map(mapReceiptToResidentAlert)
      .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

    response.status(200).json({
      success: true,
      data: alerts,
    });
  }),
);

router.get(
  "/dashboard-summary",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const residentApartmentWhere = buildResidentApartmentWhere(
      authenticatedRequest.user.id,
      authenticatedRequest.user.selectedApartmentId
    );

    const payments = await prisma.paymentAllocation.findMany({
      where: {
        apartment: residentApartmentWhere,
      },
      select: {
        id: true,
        amountKurus: true,
        paidAmountKurus: true,
        status: true,
        apartmentId: true,
        paymentBatch: {
          select: {
            dueDate: true,
          },
        },
        receipts: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const apartmentIds = new Set<string>();
    const now = new Date();

    let totalDebtKurus = 0;
    let paidAmountKurus = 0;
    let remainingAmountKurus = 0;
    let overpaymentAmountKurus = 0;
    let overduePaymentCount = 0;
    let pendingReceiptCount = 0;

    for (const payment of payments) {
      apartmentIds.add(payment.apartmentId);

      if (payment.status !== "CANCELLED") {
        const totalAmountKurus = Math.max(0, payment.amountKurus);
        const collectedAmountKurus = Math.max(0, payment.paidAmountKurus);
        const remainingKurus = Math.max(
          totalAmountKurus - collectedAmountKurus,
          0
        );

        totalDebtKurus += totalAmountKurus;
        paidAmountKurus += collectedAmountKurus;
        remainingAmountKurus += remainingKurus;
        overpaymentAmountKurus += Math.max(
          collectedAmountKurus - totalAmountKurus,
          0
        );

        if (remainingKurus > 0 && payment.paymentBatch.dueDate < now) {
          overduePaymentCount += 1;
        }
      }

      pendingReceiptCount += payment.receipts.filter((receipt) => {
        return receipt.status === "PENDING";
      }).length;
    }

    response.status(200).json({
      success: true,
      data: {
        apartmentCount: apartmentIds.size,
        totalPaymentCount: payments.length,
        totalDebtKurus,
        paidAmountKurus,
        remainingAmountKurus,
        overpaymentAmountKurus,
        overduePaymentCount,
        pendingReceiptCount,
      },
    });
  })
);
export default router;
