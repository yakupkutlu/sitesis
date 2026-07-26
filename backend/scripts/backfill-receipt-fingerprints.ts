import path from "node:path";
import process from "node:process";

import prisma from "../src/db/prisma.js";
import {
  buildReceiptTransactionFingerprint,
  calculateReceiptFileHash,
  parseReceiptTransactionAt,
} from "../src/services/receipt-fingerprint.service.js";

async function run() {
  const receipts = await prisma.paymentReceipt.findMany({
    where: {
      OR: [
        {
          fileHash: null,
        },
        {
          transactionFingerprint: null,
        },
      ],
    },
    select: {
      id: true,
      storedFileName: true,
      fileHash: true,
      aiPaymentDate: true,
      aiAmountKurus: true,
      aiRecipientIban: true,
      aiTransactionReference: true,
      transactionAt: true,
      transactionReference: true,
      transactionFingerprint: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let updatedCount = 0;
  let missingFileCount = 0;

  for (const receipt of receipts) {
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "receipts",
      receipt.storedFileName,
    );

    let fileHash = receipt.fileHash;

    if (!fileHash) {
      try {
        fileHash = await calculateReceiptFileHash(filePath);
      } catch {
        missingFileCount += 1;
        console.warn(`Dekont dosyası bulunamadı: ${receipt.id}`);
      }
    }

    const transactionAt =
      receipt.transactionAt ??
      parseReceiptTransactionAt(receipt.aiPaymentDate);

    const transactionReference =
      receipt.transactionReference ??
      receipt.aiTransactionReference ??
      null;

    const transactionFingerprint =
      receipt.transactionFingerprint ??
      buildReceiptTransactionFingerprint({
        paymentDate: receipt.aiPaymentDate,
        transactionAt,
        amountKurus: receipt.aiAmountKurus,
        recipientIban: receipt.aiRecipientIban,
        transactionReference,
      });

    await prisma.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        fileHash,
        transactionAt,
        transactionReference,
        transactionFingerprint,
      },
    });

    updatedCount += 1;
  }

  console.log({
    scanned: receipts.length,
    updated: updatedCount,
    missingFiles: missingFileCount,
  });
}

run()
  .catch((error) => {
    console.error("Dekont hash backfill işlemi başarısız:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
