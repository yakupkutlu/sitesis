import "dotenv/config";
import process from "node:process";
import bcrypt from "bcryptjs";
import { z } from "zod";

import prisma from "../src/db/prisma.js";

const seedSchema = z.object({
  SUPER_ADMIN_FULL_NAME: z.string().trim().min(2),
  SUPER_ADMIN_EMAIL: z.string().trim().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(12, "SUPER_ADMIN_PASSWORD en az 12 karakter olmalidir."),
});

async function main() {
  const result = seedSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Super Admin seed bilgileri eksik veya hatali:", result.error.flatten().fieldErrors);
    process.exit(1);
  }

  const { SUPER_ADMIN_FULL_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: {
      email: SUPER_ADMIN_EMAIL,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (existingUser) {
    if (existingUser.role !== "SUPER_ADMIN") {
      console.error("Bu e-posta ile zaten farkli role sahip bir kullanici var. Islem durduruldu.");
      process.exit(1);
    }

    console.log("Super Admin zaten mevcut. Yeni kullanici olusturulmadi.");
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      fullName: SUPER_ADMIN_FULL_NAME,
      email: SUPER_ADMIN_EMAIL,
      phone: null,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Ilk Super Admin basariyla olusturuldu.");
}

main()
  .catch((error) => {
    console.error("Super Admin seed calistirilirken hata olustu:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
