import prisma from "../db/prisma.js";
import {
  createNotificationLog,
  queueEmailNotification,
  queueSmsNotification,
} from "./notification.service.js";

export type ReceiptAutoRejectReason =
  | "IBAN_MISMATCH"
  | "DUPLICATE_FILE"
  | "DUPLICATE_TRANSACTION";

type ReceiptNotificationRecipient = {
  id: string;
  email: string | null;
  phone: string | null;
};

function formatKurusAsTry(amountKurus: number) {
  return `${(Math.max(0, amountKurus) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function getAutoRejectMessage(reason: ReceiptAutoRejectReason) {
  if (reason === "IBAN_MISMATCH") {
    return {
      subject: "Dekontunuz Reddedildi",
      sms:
        "Değerli sakinimiz, gönderdiğiniz dekont reddedilmiştir. Red nedeni: Ödeme, sistemde kayıtlı IBAN yerine farklı bir IBAN'a gönderilmiştir. Lütfen ödeme bilgilerini kontrol ederek doğru hesaba ait dekontu yükleyiniz.",
      email:
        "Değerli sakinimiz,\n\nGönderdiğiniz ödeme dekontu reddedilmiştir.\n\nRed nedeni: Ödeme, sistemde kayıtlı IBAN yerine farklı bir IBAN'a gönderilmiştir.\n\nLütfen ödeme bilgilerini kontrol ederek doğru hesaba ait dekontu yükleyiniz.",
    };
  }

  return {
    subject: "Dekontunuz Reddedildi",
    sms:
      "Değerli sakinimiz, gönderdiğiniz dekont reddedilmiştir. Red nedeni: Aynı ödeme dekontu daha önce sisteme yüklenmiştir. Lütfen farklı ve geçerli bir ödeme dekontu yükleyiniz.",
    email:
      "Değerli sakinimiz,\n\nGönderdiğiniz ödeme dekontu reddedilmiştir.\n\nRed nedeni: Aynı ödeme dekontu daha önce sisteme yüklenmiştir.\n\nLütfen farklı ve geçerli bir ödeme dekontu yükleyiniz.",
  };
}

async function createMissingContactLog(params: {
  channel: "SMS" | "EMAIL";
  receiptId: string;
  recipientUserId: string;
  subject?: string;
  message: string;
  missingField: "telefon" | "e-posta";
  metadata: Record<string, string | number>;
  createdByUserId?: string;
}) {
  return createNotificationLog({
    channel: params.channel,
    status: "SKIPPED",
    sourceType: "SYSTEM",
    recipientUserId: params.recipientUserId,
    ...(params.subject ? { subject: params.subject } : {}),
    message: params.message,
    entityType: "PaymentReceipt",
    entityId: params.receiptId,
    errorMessage: `Kullanıcının ${params.missingField} bilgisi bulunamadı.`,
    metadata: params.metadata,
    createdByUserId: params.createdByUserId,
  });
}

async function resolveReceiptNotificationRecipients(
  receiptId: string,
): Promise<ReceiptNotificationRecipient[]> {
  const receipt = await prisma.paymentReceipt.findUnique({
    where: {
      id: receiptId,
    },
    select: {
      uploadedByUser: {
        select: {
          id: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      paymentAllocation: {
        select: {
          apartment: {
            select: {
              residents: {
                where: {
                  user: {
                    is: {
                      status: "ACTIVE",
                    },
                  },
                },
                select: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      phone: true,
                      status: true,
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
    return [];
  }

  const apartmentResidents =
    receipt.paymentAllocation.apartment.residents.map(
      (residentRelation) => residentRelation.user,
    );

  /*
   * Kullanıcı SUPER_ADMIN veya MANAGER rolüne sahip olsa bile aynı zamanda
   * bu daireye sakin olarak bağlı olabilir. Eski kod yalnızca role=RESIDENT
   * kontrolü yaptığı için böyle hesaplarda bildirim kaydı oluşmuyordu.
   */
  const uploaderIsApartmentResident = apartmentResidents.some(
    (resident) => resident.id === receipt.uploadedByUser.id,
  );

  const candidates = uploaderIsApartmentResident
    ? [receipt.uploadedByUser]
    : apartmentResidents;

  const uniqueRecipients = new Map<string, ReceiptNotificationRecipient>();

  for (const candidate of candidates) {
    if (candidate.status !== "ACTIVE") {
      continue;
    }

    uniqueRecipients.set(candidate.id, {
      id: candidate.id,
      email: candidate.email,
      phone: candidate.phone,
    });
  }

  return [...uniqueRecipients.values()];
}

async function sendToReceiptRecipient(params: {
  receiptId: string;
  recipient: ReceiptNotificationRecipient;
  subject: string;
  smsMessage: string;
  emailMessage: string;
  metadata: Record<string, string | number>;
  createdByUserId?: string;
}) {
  const notificationJobs: Promise<unknown>[] = [];

  if (params.recipient.email?.trim()) {
    notificationJobs.push(
      queueEmailNotification({
        recipientUserId: params.recipient.id,
        recipientEmail: params.recipient.email.trim(),
        subject: params.subject,
        message: params.emailMessage,
        sourceType: "SYSTEM",
        entityType: "PaymentReceipt",
        entityId: params.receiptId,
        metadata: params.metadata,
        createdByUserId: params.createdByUserId,
      }),
    );
  } else {
    notificationJobs.push(
      createMissingContactLog({
        channel: "EMAIL",
        receiptId: params.receiptId,
        recipientUserId: params.recipient.id,
        subject: params.subject,
        message: params.emailMessage,
        missingField: "e-posta",
        metadata: params.metadata,
        createdByUserId: params.createdByUserId,
      }),
    );
  }

  if (params.recipient.phone?.trim()) {
    notificationJobs.push(
      queueSmsNotification({
        recipientUserId: params.recipient.id,
        recipientPhone: params.recipient.phone.trim(),
        message: params.smsMessage,
        sourceType: "SYSTEM",
        entityType: "PaymentReceipt",
        entityId: params.receiptId,
        metadata: params.metadata,
        createdByUserId: params.createdByUserId,
      }),
    );
  } else {
    notificationJobs.push(
      createMissingContactLog({
        channel: "SMS",
        receiptId: params.receiptId,
        recipientUserId: params.recipient.id,
        message: params.smsMessage,
        missingField: "telefon",
        metadata: params.metadata,
        createdByUserId: params.createdByUserId,
      }),
    );
  }

  const results = await Promise.allSettled(notificationJobs);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Dekont bildirimi oluşturulamadı:", {
        receiptId: params.receiptId,
        recipientUserId: params.recipient.id,
        error: result.reason,
      });
    }
  }
}

async function sendReceiptNotification(params: {
  receiptId: string;
  subject: string;
  smsMessage: string;
  emailMessage: string;
  metadata: Record<string, string | number>;
  createdByUserId?: string;
}) {
  const recipients = await resolveReceiptNotificationRecipients(
    params.receiptId,
  );

  if (recipients.length === 0) {
    console.warn("Dekont bildirimi için aktif sakin bulunamadı:", {
      receiptId: params.receiptId,
    });
    return;
  }

  for (const recipient of recipients) {
    await sendToReceiptRecipient({
      ...params,
      recipient,
    });
  }
}

export async function notifyReceiptAutoRejected(params: {
  receiptId: string;
  reason: ReceiptAutoRejectReason;
}) {
  const message = getAutoRejectMessage(params.reason);

  await sendReceiptNotification({
    receiptId: params.receiptId,
    subject: message.subject,
    smsMessage: message.sms,
    emailMessage: message.email,
    metadata: {
      purpose: "PAYMENT_RECEIPT_AUTO_REJECTED",
      reason: params.reason,
    },
  });
}

export async function notifyReceiptPaymentApproved(params: {
  receiptId: string;
  expectedAmountKurus: number;
  paymentAmountKurus: number;
  remainingAmountKurus: number;
  overpaymentAmountKurus: number;
  automaticDistributedAmountKurus?: number;
  remainingBalanceKurus?: number;
  automaticPaymentCount?: number;
  approvedByUserId: string;
}) {
  const expectedAmountText = formatKurusAsTry(params.expectedAmountKurus);
  const paymentAmountText = formatKurusAsTry(params.paymentAmountKurus);
  const remainingAmountText = formatKurusAsTry(params.remainingAmountKurus);
  const overpaymentAmountText = formatKurusAsTry(
    params.overpaymentAmountKurus,
  );
  const automaticDistributedAmountKurus = Math.max(
    0,
    params.automaticDistributedAmountKurus ?? 0,
  );
  const remainingBalanceKurus = Math.max(
    0,
    params.remainingBalanceKurus ?? 0,
  );
  const automaticDistributedAmountText = formatKurusAsTry(
    automaticDistributedAmountKurus,
  );
  const remainingBalanceText = formatKurusAsTry(remainingBalanceKurus);

  /*
   * Tam ödeme için bildirim gönderilmez.
   * Yalnızca kısmi ödeme veya fazla ödeme onaylandığında SMS ve e-posta
   * kayıtları oluşturulur.
   */
  if (
    params.overpaymentAmountKurus <= 0 &&
    params.remainingAmountKurus <= 0
  ) {
    return;
  }

  let message: string;
  let purpose: string;

  if (params.overpaymentAmountKurus > 0) {
    purpose = "PAYMENT_RECEIPT_OVERPAYMENT_APPROVED";
    message =
      `Değerli sakinimiz, ödemeniz onaylanmıştır. ` +
      `Ödenmesi gereken tutar: ${expectedAmountText}. ` +
      `Ödenen tutar: ${paymentAmountText}. ` +
      `Fazla ödeme tutarı: ${overpaymentAmountText}. ` +
      `Diğer borçlarınıza otomatik kullanılan tutar: ${automaticDistributedAmountText}. ` +
      `Hesabınızda kalan fazla bakiye: ${remainingBalanceText}.`;
  } else {
    purpose = "PAYMENT_RECEIPT_PARTIAL_PAYMENT_APPROVED";
    message =
      `Değerli sakinimiz, kısmi ödemeniz onaylanmıştır. ` +
      `Ödenmesi gereken tutar: ${expectedAmountText}. ` +
      `Ödenen tutar: ${paymentAmountText}. ` +
      `Kalan borç tutarı: ${remainingAmountText}.`;
  }

  await sendReceiptNotification({
    receiptId: params.receiptId,
    subject:
      params.remainingAmountKurus > 0
        ? "Kısmi Ödemeniz Onaylandı"
        : "Ödemeniz Onaylandı",
    smsMessage: message,
    emailMessage: message,
    metadata: {
      purpose,
      expectedAmountKurus: params.expectedAmountKurus,
      paymentAmountKurus: params.paymentAmountKurus,
      remainingAmountKurus: params.remainingAmountKurus,
      overpaymentAmountKurus: params.overpaymentAmountKurus,
      automaticDistributedAmountKurus,
      remainingBalanceKurus,
      automaticPaymentCount: params.automaticPaymentCount ?? 0,
    },
    createdByUserId: params.approvedByUserId,
  });
}
