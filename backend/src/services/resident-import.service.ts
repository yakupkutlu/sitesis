import bcrypt from "bcryptjs";
import { z } from "zod";
import * as XLSX from "xlsx";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  getManagerScope,
  hasManagerScope,
} from "./manager-scope.service.js";
import { HttpError } from "../utils/http-error.js";
import { optionalInternationalPhoneSchema } from "../utils/phone.js";

export const MAX_RESIDENT_IMPORT_ROWS = 250;

const residentImportEditableRowSchema = z
  .object({
    rowNumber: z.number().int().min(1),
    countryCode: z.string().optional().default(""),
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    residentType: z.string(),
    siteName: z.string(),
    blockName: z.string(),
    apartmentNumber: z.string(),
    password: z.string(),
  })
  .strict();

export const residentImportRowsRequestSchema = z
  .object({
    rows: z
      .array(residentImportEditableRowSchema)
      .min(1, "En az bir sakin satırı gönderilmelidir.")
      .max(
        MAX_RESIDENT_IMPORT_ROWS,
        `Tek seferde en fazla ${MAX_RESIDENT_IMPORT_ROWS} sakin yüklenebilir.`
      ),
  })
  .strict();

export type ResidentImportEditableRow = z.infer<
  typeof residentImportEditableRowSchema
>;

type ResidentType = "OWNER" | "TENANT";
type ActorRole = "SUPER_ADMIN" | "MANAGER" | "RESIDENT";
type ImportStatus = "VALID" | "ERROR" | "SKIP";
type AccountState = "NEW" | "EXISTING" | "REACTIVATE";

export type ImportActor = {
  id: string;
  role: ActorRole;
};

type ExistingUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: ActorRole;
  status: "ACTIVE" | "PASSIVE";
};

export type ScopedApartment = {
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
  residents: Array<{
    id: string;
    apartmentId: string;
    userId: string;
    type: ResidentType;
    user: ExistingUser;
  }>;
};

export type ResidentImportValidationRow = ResidentImportEditableRow & {
  residentType: string;
  normalizedPhone: string;
  apartmentId: string | null;
  status: ImportStatus;
  errors: string[];
  warnings: string[];
  action: string;
  accountState: AccountState | null;
};

export type ResidentImportValidationResult = {
  rows: ResidentImportValidationRow[];
  summary: {
    total: number;
    valid: number;
    error: number;
    skip: number;
    warning: number;
  };
};

type WorkingValidationRow = ResidentImportValidationRow & {
  normalizedEmail: string;
  normalizedResidentType: ResidentType | null;
  matchedApartment: ScopedApartment | null;
  existingUser: ExistingUser | null;
  linkAlreadyExists: boolean;
  skipReason: string | null;
};

const HEADER_ALIASES = {
  countryCode: [
    "ulke kodu",
    "telefon ulke kodu",
    "ulke telefon kodu",
    "devlet numarasi",
  ],
  fullName: ["ad soyad", "adsoyad"],
  email: ["e posta", "eposta", "email"],
  phone: ["telefon", "telefon numarasi", "telefon no"],
  residentType: ["kayit tipi", "sakin tipi", "tip"],
  siteName: ["site adi", "site"],
  blockName: ["blok apartman adi", "blok adi", "apartman adi", "blok"],
  apartmentNumber: ["daire no", "daire numarasi", "daire"],
  password: ["gecici sifre", "sifre"],
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeLookupText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function normalizeApartmentNumber(value: unknown) {
  return normalizeLookupText(value).replace(/^daire\s*/i, "");
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getCellText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function extractDialCode(value: unknown) {
  const match = String(value ?? "").match(/\+\d{1,4}/);

  return match?.[0] ?? "";
}

function normalizeInternationalPhone(countryCode: string, phone: string) {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return "";
  }

  const phoneDigits = trimmedPhone.replace(/\D/g, "");

  if (trimmedPhone.startsWith("+")) {
    return phoneDigits ? `+${phoneDigits}` : "";
  }

  const dialCode = extractDialCode(countryCode);
  const dialCodeDigits = dialCode.replace(/\D/g, "");
  const localDigits = phoneDigits.replace(/^0+/, "");

  if (!dialCodeDigits || !localDigits) {
    return "";
  }

  return `+${dialCodeDigits}${localDigits}`;
}

function normalizeResidentType(value: unknown): ResidentType | null {
  const normalized = normalizeHeader(value);

  if (["owner", "ev sahibi", "evsahibi"].includes(normalized)) {
    return "OWNER";
  }

  if (["tenant", "kiraci"].includes(normalized)) {
    return "TENANT";
  }

  return null;
}

function getHeaderColumnMap(headerRow: unknown[]) {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const result = {} as Record<HeaderKey, number>;

  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [HeaderKey, readonly string[]]
  >) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) =>
      normalizedAliases.includes(header)
    );

    /*
     * Eski Excel şablonlarında ülke kodu sütunu yoktu. Bu sütun
     * geriye dönük uyumluluk için isteğe bağlı tutulur.
     */
    if (index < 0 && key === "countryCode") {
      result[key] = -1;
      continue;
    }

    if (index < 0) {
      return null;
    }

    result[key] = index;
  }

  return result;
}

function hasExcelFileSignature(buffer: Buffer) {
  if (buffer.length < 8) {
    return false;
  }

  const isZipBasedXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isLegacyXls =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1;

  return isZipBasedXlsx || isLegacyXls;
}

export function parseResidentWorkbook(buffer: Buffer) {
  if (!hasExcelFileSignature(buffer)) {
    throw new HttpError(
      400,
      "Yüklenen dosya geçerli bir Excel dosyası değildir."
    );
  }

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
    });
  } catch {
    throw new HttpError(400, "Excel dosyası okunamadı veya bozuk.");
  }

  const preferredSheetName = workbook.SheetNames.find(
    (sheetName) => normalizeHeader(sheetName) === "sakin yukleme"
  );
  const sheetName = preferredSheetName ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new HttpError(400, "Excel dosyasında çalışma sayfası bulunamadı.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  let headerIndex = -1;
  let headerColumns: Record<HeaderKey, number> | null = null;

  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const candidate = getHeaderColumnMap(matrix[index] ?? []);

    if (candidate) {
      headerIndex = index;
      headerColumns = candidate;
      break;
    }
  }

  if (headerIndex < 0 || !headerColumns) {
    throw new HttpError(
      400,
      "Excel sütunları şablonla eşleşmiyor. Lütfen sistemden indirilen şablonu kullanın."
    );
  }

  const rows: ResidentImportEditableRow[] = [];

  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index] ?? [];
    const rowValues = Object.values(headerColumns).map((columnIndex) =>
      getCellText(sourceRow[columnIndex])
    );

    if (rowValues.every((value) => value.length === 0)) {
      continue;
    }

    rows.push({
      rowNumber: index + 1,
      countryCode:
        headerColumns.countryCode >= 0
          ? getCellText(sourceRow[headerColumns.countryCode])
          : "",
      fullName: getCellText(sourceRow[headerColumns.fullName]),
      email: getCellText(sourceRow[headerColumns.email]),
      phone: getCellText(sourceRow[headerColumns.phone]),
      residentType: getCellText(sourceRow[headerColumns.residentType]),
      siteName: getCellText(sourceRow[headerColumns.siteName]),
      blockName: getCellText(sourceRow[headerColumns.blockName]),
      apartmentNumber: getCellText(
        sourceRow[headerColumns.apartmentNumber]
      ),
      password: getCellText(sourceRow[headerColumns.password]),
    });

    if (rows.length > MAX_RESIDENT_IMPORT_ROWS) {
      throw new HttpError(
        400,
        `Excel dosyası en fazla ${MAX_RESIDENT_IMPORT_ROWS} sakin satırı içerebilir.`
      );
    }
  }

  if (rows.length === 0) {
    throw new HttpError(400, "Excel dosyasında sakin kaydı bulunamadı.");
  }

  return rows;
}

export async function getScopedApartments(actor: ImportActor) {
  let where: Prisma.ApartmentWhereInput = {};

  if (actor.role === "MANAGER") {
    const managerScope = await getManagerScope(actor.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(
        403,
        "Bu yöneticiye atanmış bir site veya blok bulunamadı."
      );
    }

    where = {
      OR: [
        {
          blockId: {
            in: managerScope.blockIds,
          },
        },
        {
          block: {
            siteId: {
              in: managerScope.siteIds,
            },
          },
        },
      ],
    };
  }

  return prisma.apartment.findMany({
    where,
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
      residents: {
        select: {
          id: true,
          apartmentId: true,
          userId: true,
          type: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

function buildApartmentLookup(apartments: ScopedApartment[]) {
  const lookup = new Map<string, ScopedApartment[]>();

  for (const apartment of apartments) {
    const key = [
      normalizeLookupText(apartment.block.site.name),
      normalizeLookupText(apartment.block.name),
      normalizeApartmentNumber(apartment.number),
    ].join("|");
    const current = lookup.get(key) ?? [];
    current.push(apartment);
    lookup.set(key, current);
  }

  return lookup;
}

function addError(row: WorkingValidationRow, message: string) {
  if (!row.errors.includes(message)) {
    row.errors.push(message);
  }
}

function addWarning(row: WorkingValidationRow, message: string) {
  if (!row.warnings.includes(message)) {
    row.warnings.push(message);
  }
}

function getRowsByKey<T>(
  rows: T[],
  getKey: (row: T) => string | null
) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);

    if (!key) {
      continue;
    }

    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
  }

  return map;
}

function getResidentTypeLabel(type: ResidentType) {
  return type === "OWNER" ? "Ev Sahibi" : "Kiracı";
}

function finalizeValidationRows(rows: WorkingValidationRow[]) {
  for (const row of rows) {
    if (row.errors.length > 0) {
      row.status = "ERROR";
      row.action = "Düzeltme gerekli";
      continue;
    }

    if (row.skipReason) {
      row.status = "SKIP";
      row.action = row.skipReason;
      continue;
    }

    row.status = "VALID";

    if (row.accountState === "NEW") {
      row.action = "Yeni hesap ve daire bağlantısı oluşturulacak";
    } else if (row.accountState === "REACTIVATE") {
      row.action = row.linkAlreadyExists
        ? "Pasif hesap yeniden aktifleştirilecek"
        : "Pasif hesap aktifleştirilip daireye bağlanacak";
    } else {
      row.action = "Mevcut hesap daireye bağlanacak";
    }

    if (row.warnings.length > 0) {
      row.action = `${row.action} — Uyarılı kayıt`;
    }
  }
}

export async function validateResidentImportRows(params: {
  actor: ImportActor;
  rows: ResidentImportEditableRow[];
}): Promise<ResidentImportValidationResult> {
  const scopedApartments = (await getScopedApartments(
    params.actor
  )) as ScopedApartment[];
  const apartmentLookup = buildApartmentLookup(scopedApartments);

  const normalizedEmails = Array.from(
    new Set(
      params.rows
        .map((row) => normalizeEmail(row.email))
        .filter((email) => z.string().email().safeParse(email).success)
    )
  );

  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: normalizedEmails,
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  const existingUserByEmail = new Map(
    existingUsers.map((user) => [user.email.toLowerCase(), user as ExistingUser])
  );

  const globalTenantLinks =
    existingUsers.length > 0
      ? await prisma.apartmentResident.findMany({
          where: {
            type: "TENANT",
            userId: {
              in: existingUsers.map((user) => user.id),
            },
          },
          select: {
            id: true,
            userId: true,
            apartmentId: true,
          },
        })
      : [];

  const tenantLinksByUserId = getRowsByKey(globalTenantLinks, (link) =>
    link.userId ? link.userId : null
  );

  const workingRows: WorkingValidationRow[] = params.rows.map((sourceRow) => {
    const normalizedEmail = normalizeEmail(sourceRow.email);
    const normalizedResidentType = normalizeResidentType(
      sourceRow.residentType
    );
    const errors: string[] = [];
    const warnings: string[] = [];

    const countryCode = sourceRow.countryCode.trim();
    const fullName = sourceRow.fullName.trim();
    const phone = sourceRow.phone.trim();
    const normalizedPhone = normalizeInternationalPhone(countryCode, phone);
    const siteName = sourceRow.siteName.trim();
    const blockName = sourceRow.blockName.trim();
    const apartmentNumber = sourceRow.apartmentNumber.trim();
    const password = sourceRow.password.trim();

    if (fullName.length < 2) {
      errors.push("Ad soyad en az 2 karakter olmalıdır.");
    }

    if (!z.string().email().safeParse(normalizedEmail).success) {
      errors.push("Geçerli bir e-posta adresi girilmelidir.");
    }

    if (phone && !phone.trim().startsWith("+") && !extractDialCode(countryCode)) {
      errors.push("Telefon numarası için ülke kodu seçilmelidir.");
    }

    if (
      phone &&
      !optionalInternationalPhoneSchema.safeParse(normalizedPhone).success
    ) {
      errors.push(
        "Telefon numarası geçerli değildir. Ülke kodunu seçip numarayı başında 0 olmadan yazın."
      );
    }

    if (!normalizedResidentType) {
      errors.push('Kayıt tipi "Ev Sahibi" veya "Kiracı" olmalıdır.');
    }

    if (!siteName) {
      errors.push("Site adı zorunludur.");
    }

    if (!blockName) {
      errors.push("Blok / apartman adı zorunludur.");
    }

    if (!apartmentNumber) {
      errors.push("Daire numarası zorunludur.");
    }

    if (password && password.length < 8) {
      errors.push("Geçici şifre en az 8 karakter olmalıdır.");
    }

    const apartmentKey = [
      normalizeLookupText(siteName),
      normalizeLookupText(blockName),
      normalizeApartmentNumber(apartmentNumber),
    ].join("|");
    const apartmentMatches = apartmentLookup.get(apartmentKey) ?? [];
    const matchedApartment =
      apartmentMatches.length === 1 ? apartmentMatches[0] : null;

    if (siteName && blockName && apartmentNumber) {
      if (apartmentMatches.length === 0) {
        errors.push(
          params.actor.role === "MANAGER"
            ? "Daire bulunamadı veya bu daire yönetici yetki alanında değil."
            : "Site, blok ve daire eşleşmesi bulunamadı."
        );
      } else if (apartmentMatches.length > 1) {
        errors.push(
          "Site, blok ve daire bilgileri birden fazla kayıtla eşleşti."
        );
      }
    }

    const existingUser = existingUserByEmail.get(normalizedEmail) ?? null;
    let accountState: AccountState | null = null;

    if (z.string().email().safeParse(normalizedEmail).success) {
      if (!existingUser) {
        accountState = "NEW";
      } else if (existingUser.status === "PASSIVE") {
        accountState = "REACTIVATE";

        if (existingUser.role !== "RESIDENT") {
          errors.push(
            "Pasif yönetim hesabı Excel yüklemesiyle aktifleştirilemez."
          );
        }
      } else {
        accountState = "EXISTING";
      }

      if (
        existingUser?.role === "SUPER_ADMIN" &&
        params.actor.role !== "SUPER_ADMIN"
      ) {
        errors.push(
          "Süper admin hesabını sakin olarak yalnızca süper admin bağlayabilir."
        );
      }

      if (
        existingUser?.status === "ACTIVE" &&
        existingUser.fullName.trim() !== fullName
      ) {
        warnings.push(
          `Bu e-posta mevcut "${existingUser.fullName}" hesabına aittir; mevcut hesap adı korunacaktır.`
        );
      }

      if (
        existingUser?.status === "ACTIVE" &&
        normalizedPhone &&
        existingUser.phone &&
        existingUser.phone !== normalizedPhone
      ) {
        warnings.push(
          "E-posta mevcut bir hesaba ait olduğu için kayıtlı telefon numarası korunacaktır."
        );
      }

      if (existingUser?.status === "ACTIVE" && password) {
        warnings.push(
          "Mevcut aktif hesabın şifresi Excel yüklemesiyle değiştirilmeyecektir."
        );
      }
    }

    const row: WorkingValidationRow = {
      rowNumber: sourceRow.rowNumber,
      countryCode,
      fullName,
      email: normalizedEmail,
      phone,
      normalizedPhone,
      residentType: normalizedResidentType ?? sourceRow.residentType.trim(),
      siteName,
      blockName,
      apartmentNumber,
      password,
      apartmentId: matchedApartment?.id ?? null,
      status: "ERROR",
      errors,
      warnings,
      action: "Düzeltme gerekli",
      accountState,
      normalizedEmail,
      normalizedResidentType,
      matchedApartment,
      existingUser,
      linkAlreadyExists: false,
      skipReason: null,
    };

    if (matchedApartment && normalizedResidentType && existingUser) {
      const exactLink = matchedApartment.residents.find(
        (link) =>
          link.userId === existingUser.id &&
          link.type === normalizedResidentType
      );
      const occupiedType = matchedApartment.residents.find(
        (link) => link.type === normalizedResidentType
      );

      if (exactLink) {
        row.linkAlreadyExists = true;

        if (existingUser.status === "ACTIVE") {
          row.skipReason = "Bu sakin-daire bağlantısı zaten kayıtlı; atlanacak";
        }
      } else if (occupiedType) {
        addError(
          row,
          normalizedResidentType === "OWNER"
            ? "Bu daireye başka bir ev sahibi atanmış."
            : "Bu daireye başka bir kiracı atanmış."
        );
      }

      if (normalizedResidentType === "TENANT") {
        const userTenantLinks = tenantLinksByUserId.get(existingUser.id) ?? [];
        const differentTenantLink = userTenantLinks.find(
          (link) => link.apartmentId !== matchedApartment.id
        );

        if (differentTenantLink) {
          addError(
            row,
            "Bu kullanıcı hesabı başka bir daireye kiracı olarak bağlı."
          );
        }
      }
    } else if (matchedApartment && normalizedResidentType) {
      const occupiedType = matchedApartment.residents.find(
        (link) => link.type === normalizedResidentType
      );

      if (occupiedType) {
        addError(
          row,
          normalizedResidentType === "OWNER"
            ? "Bu daireye başka bir ev sahibi atanmış."
            : "Bu daireye başka bir kiracı atanmış."
        );
      }
    }

    return row;
  });

  const emailGroups = getRowsByKey(workingRows, (row) =>
    row.normalizedEmail ? row.normalizedEmail : null
  );

  for (const rows of emailGroups.values()) {
    const uniqueNames = new Set(
      rows.map((row) => normalizeLookupText(row.fullName)).filter(Boolean)
    );
    const uniquePhones = new Set(
      rows.map((row) => row.normalizedPhone).filter(Boolean)
    );
    const uniquePasswords = new Set(
      rows.map((row) => row.password).filter(Boolean)
    );
    const tenantApartmentIds = new Set(
      rows
        .filter((row) => row.normalizedResidentType === "TENANT")
        .map((row) => row.apartmentId)
        .filter(Boolean)
    );
    const requiresNewAccountPassword = rows.some(
      (row) => row.accountState === "NEW"
    );

    if (requiresNewAccountPassword && uniquePasswords.size === 0) {
      rows.forEach((row) =>
        addError(
          row,
          "Yeni kullanıcı hesabı için aynı e-postaya ait satırlardan en az birinde 8 karakterli geçici şifre bulunmalıdır."
        )
      );
    }

    if (uniqueNames.size > 1) {
      rows.forEach((row) =>
        addError(
          row,
          "Aynı e-posta için Excel içinde farklı ad soyad bilgileri kullanılmış."
        )
      );
    }

    if (uniquePhones.size > 1) {
      rows.forEach((row) =>
        addError(
          row,
          "Aynı e-posta için Excel içinde farklı telefon numaraları kullanılmış."
        )
      );
    }

    if (uniquePasswords.size > 1) {
      rows.forEach((row) =>
        addError(
          row,
          "Aynı e-posta için Excel içinde farklı geçici şifreler kullanılmış."
        )
      );
    }

    if (tenantApartmentIds.size > 1) {
      rows
        .filter((row) => row.normalizedResidentType === "TENANT")
        .forEach((row) =>
          addError(
            row,
            "Bir kullanıcı aynı anda yalnızca bir dairede kiracı olabilir."
          )
        );
    }
  }

  const exactRowGroups = getRowsByKey(workingRows, (row) => {
    if (!row.apartmentId || !row.normalizedResidentType || !row.normalizedEmail) {
      return null;
    }

    return `${row.normalizedEmail}|${row.normalizedResidentType}|${row.apartmentId}`;
  });

  for (const rows of exactRowGroups.values()) {
    if (rows.length > 1) {
      rows.forEach((row) =>
        addError(row, "Aynı sakin-daire satırı Excel içinde tekrar ediyor.")
      );
    }
  }

  const apartmentTypeGroups = getRowsByKey(workingRows, (row) => {
    if (!row.apartmentId || !row.normalizedResidentType) {
      return null;
    }

    return `${row.apartmentId}|${row.normalizedResidentType}`;
  });

  for (const rows of apartmentTypeGroups.values()) {
    const uniqueEmails = new Set(
      rows.map((row) => row.normalizedEmail).filter(Boolean)
    );

    if (uniqueEmails.size > 1) {
      rows.forEach((row) =>
        addError(
          row,
          row.normalizedResidentType === "OWNER"
            ? "Excel içinde aynı daireye birden fazla ev sahibi yazılmış."
            : "Excel içinde aynı daireye birden fazla kiracı yazılmış."
        )
      );
    }
  }

  for (const tenantRow of workingRows.filter(
    (row) =>
      row.normalizedResidentType === "TENANT" && row.matchedApartment
  )) {
    const apartment = tenantRow.matchedApartment as ScopedApartment;
    const databaseOwner = apartment.residents.find(
      (link) => link.type === "OWNER"
    );
    const batchOwnerRows = workingRows.filter(
      (row) =>
        row.apartmentId === apartment.id &&
        row.normalizedResidentType === "OWNER"
    );
    const validBatchOwner = batchOwnerRows.find(
      (row) =>
        row.errors.length === 0 &&
        row.normalizedEmail !== tenantRow.normalizedEmail
    );

    const hasDatabaseOwner = Boolean(databaseOwner);

    if (!hasDatabaseOwner && !validBatchOwner) {
      addWarning(
        tenantRow,
        "Bu dairede ev sahibi bilgisi bulunmuyor. Kiracı kaydedilecek ve yönetici tablosunda sarı uyarı gösterilecek."
      );
    }

    if (
      batchOwnerRows.some(
        (row) => row.normalizedEmail === tenantRow.normalizedEmail
      )
    ) {
      addError(
        tenantRow,
        "Aynı kullanıcı aynı dairede hem ev sahibi hem kiracı olamaz."
      );
    }
  }

  finalizeValidationRows(workingRows);

  const publicRows: ResidentImportValidationRow[] = workingRows.map((row) => ({
    rowNumber: row.rowNumber,
    countryCode: row.countryCode,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    normalizedPhone: row.normalizedPhone,
    residentType: row.normalizedResidentType ?? row.residentType,
    siteName: row.siteName,
    blockName: row.blockName,
    apartmentNumber: row.apartmentNumber,
    password: row.password,
    apartmentId: row.apartmentId,
    status: row.status,
    errors: row.errors,
    warnings: row.warnings,
    action: row.action,
    accountState: row.accountState,
  }));

  return {
    rows: publicRows,
    summary: {
      total: publicRows.length,
      valid: publicRows.filter((row) => row.status === "VALID").length,
      error: publicRows.filter((row) => row.status === "ERROR").length,
      skip: publicRows.filter((row) => row.status === "SKIP").length,
      warning: publicRows.filter((row) => row.warnings.length > 0).length,
    },
  };
}

async function buildPasswordHashByEmail(rows: ResidentImportValidationRow[]) {
  const passwordByEmail = new Map<string, string>();

  for (const row of rows) {
    if (row.status !== "VALID" || !row.password) {
      continue;
    }

    const email = normalizeEmail(row.email);

    if (!passwordByEmail.has(email)) {
      passwordByEmail.set(email, row.password);
    }
  }

  const hashEntries = await Promise.all(
    Array.from(passwordByEmail.entries()).map(async ([email, password]) => [
      email,
      await bcrypt.hash(password, 12),
    ] as const)
  );

  return new Map(hashEntries);
}

export async function commitResidentImportRows(params: {
  actor: ImportActor;
  rows: ResidentImportEditableRow[];
}) {
  const validation = await validateResidentImportRows(params);

  if (validation.summary.error > 0) {
    throw new HttpError(
      400,
      "Hatalı satırlar düzeltilmeden toplu yükleme tamamlanamaz.",
      {
        rows: validation.rows,
        summary: validation.summary,
      }
    );
  }

  const actionableRows = validation.rows.filter(
    (row) => row.status === "VALID"
  );
  const passwordHashByEmail = await buildPasswordHashByEmail(actionableRows);

  const result = await prisma.$transaction(
    async (transaction) => {
      const userCache = new Map<string, ExistingUser>();
      const reactivatedUserIds = new Set<string>();
      let createdAccounts = 0;
      let reactivatedAccounts = 0;
      let linksCreated = 0;
      let existingLinksKept = 0;

      const sortedRows = [...actionableRows].sort((first, second) => {
        if (first.residentType === second.residentType) {
          return first.rowNumber - second.rowNumber;
        }

        return first.residentType === "OWNER" ? -1 : 1;
      });

      for (const row of sortedRows) {
        const email = normalizeEmail(row.email);
        const residentType = row.residentType as ResidentType;
        let user: ExistingUser | null = userCache.get(email) ?? null;

        if (!user) {
          user = (await transaction.user.findUnique({
            where: {
              email,
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          })) as ExistingUser | null;
        }

        if (!user) {
          const passwordHash = passwordHashByEmail.get(email);

          if (!passwordHash) {
            throw new HttpError(
              400,
              `${row.rowNumber}. satırdaki yeni kullanıcı için geçici şifre bulunamadı.`
            );
          }

          user = (await transaction.user.create({
            data: {
              fullName: row.fullName.trim(),
              email,
              phone: row.normalizedPhone || null,
              passwordHash,
              mustChangePassword: true,
              role: "RESIDENT",
              status: "ACTIVE",
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          })) as ExistingUser;
          createdAccounts += 1;
        } else if (user.status === "PASSIVE") {
          if (user.role !== "RESIDENT") {
            throw new HttpError(
              409,
              `${row.rowNumber}. satırdaki pasif yönetim hesabı otomatik aktifleştirilemez.`
            );
          }

          if (!reactivatedUserIds.has(user.id)) {
            const passwordHash = passwordHashByEmail.get(email);

            user = (await transaction.user.update({
              where: {
                id: user.id,
              },
              data: {
                status: "ACTIVE",
                fullName: row.fullName.trim(),
                phone: row.normalizedPhone || null,
                ...(passwordHash
                  ? {
                      passwordHash,
                      mustChangePassword: true,
                    }
                  : {}),
              },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                status: true,
              },
            })) as ExistingUser;
            reactivatedUserIds.add(user.id);
            reactivatedAccounts += 1;
          }
        }

        if (!user) {
          throw new HttpError(500, "Sakin hesabı hazırlanamadı.");
        }

        userCache.set(email, user);

        const exactLink = await transaction.apartmentResident.findUnique({
          where: {
            apartmentId_userId_type: {
              apartmentId: row.apartmentId as string,
              userId: user.id,
              type: residentType,
            },
          },
          select: {
            id: true,
          },
        });

        if (exactLink) {
          existingLinksKept += 1;
          continue;
        }

        const occupiedType = await transaction.apartmentResident.findFirst({
          where: {
            apartmentId: row.apartmentId as string,
            type: residentType,
          },
          select: {
            id: true,
          },
        });

        if (occupiedType) {
          throw new HttpError(
            409,
            residentType === "OWNER"
              ? `${row.rowNumber}. satırdaki daireye başka bir ev sahibi atanmış.`
              : `${row.rowNumber}. satırdaki daireye başka bir kiracı atanmış.`
          );
        }

        if (residentType === "TENANT") {
          const existingTenantLink =
            await transaction.apartmentResident.findFirst({
              where: {
                userId: user.id,
                type: "TENANT",
              },
              select: {
                id: true,
                apartmentId: true,
              },
            });

          if (existingTenantLink) {
            throw new HttpError(
              409,
              `${row.rowNumber}. satırdaki kullanıcı başka bir daireye kiracı olarak bağlı.`
            );
          }

        }

        await transaction.apartmentResident.create({
          data: {
            apartmentId: row.apartmentId as string,
            userId: user.id,
            type: residentType,
          },
        });
        linksCreated += 1;
      }

      return {
        totalRows: validation.summary.total,
        importedRows: actionableRows.length,
        skippedRows: validation.summary.skip,
        createdAccounts,
        reactivatedAccounts,
        linksCreated,
        existingLinksKept,
      };
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    }
  );

  return {
    ...result,
    message:
      `${result.linksCreated} daire bağlantısı oluşturuldu, ` +
      `${result.createdAccounts} yeni hesap açıldı, ` +
      `${result.reactivatedAccounts} pasif hesap aktifleştirildi, ` +
      `${result.skippedRows + result.existingLinksKept} mevcut kayıt atlandı.`,
  };
}

export function getResidentTypeDisplayLabel(type: string) {
  const normalizedType = normalizeResidentType(type);

  return normalizedType ? getResidentTypeLabel(normalizedType) : type;
}
