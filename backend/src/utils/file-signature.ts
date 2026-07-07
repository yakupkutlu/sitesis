import fs from "node:fs/promises";

const allowedSignatures = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
};

function startsWithSignature(buffer: Buffer, signature: number[]) {
  return signature.every((byte, index) => {
    return buffer[index] === byte;
  });
}

export async function isAllowedReceiptFile(filePath: string, mimeType: string) {
  const fileBuffer = await fs.readFile(filePath);
  const firstBytes = fileBuffer.subarray(0, 12);

  if (mimeType === "application/pdf") {
    return startsWithSignature(firstBytes, allowedSignatures.pdf);
  }

  if (mimeType === "image/png") {
    return startsWithSignature(firstBytes, allowedSignatures.png);
  }

  if (mimeType === "image/jpeg") {
    return startsWithSignature(firstBytes, allowedSignatures.jpg);
  }

  if (mimeType === "image/webp") {
    const startsWithRiff = startsWithSignature(firstBytes, allowedSignatures.webp);
    const hasWebpSignature = firstBytes.subarray(8, 12).toString("ascii") === "WEBP";

    return startsWithRiff && hasWebpSignature;
  }

  return false;
}
