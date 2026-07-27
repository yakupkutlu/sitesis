import ExcelJS from "exceljs";

import {
  getScopedApartments,
  type ImportActor,
  type ScopedApartment,
} from "./resident-import.service.js";

const TEMPLATE_ROW_START = 5;
const TEMPLATE_ROW_END = 254;

type ResidentType = "OWNER" | "TENANT";

type TemplateBlock = {
  id: string;
  name: string;
  apartments: string[];
};

type TemplateSite = {
  id: string;
  name: string;
  blocks: TemplateBlock[];
};

type TemplateTypeDefinition = {
  type: ResidentType;
  label: "Ev Sahibi" | "Kiracı";
  sites: TemplateSite[];
};

export const COUNTRY_PHONE_CODE_OPTIONS = [
  "+90 Türkiye",
  "+963 Suriye",
  "+964 Irak",
  "+98 İran",
  "+994 Azerbaycan",
  "+995 Gürcistan",
  "+44 Birleşik Krallık",
  "+49 Almanya",
  "+33 Fransa",
  "+31 Hollanda",
  "+32 Belçika",
  "+43 Avusturya",
  "+41 İsviçre",
  "+39 İtalya",
  "+34 İspanya",
  "+1 ABD / Kanada",
  "+7 Rusya / Kazakistan",
  "+380 Ukrayna",
  "+40 Romanya",
  "+359 Bulgaristan",
  "+30 Yunanistan",
  "+966 Suudi Arabistan",
  "+971 Birleşik Arap Emirlikleri",
  "+974 Katar",
  "+965 Kuveyt",
  "+961 Lübnan",
  "+962 Ürdün",
  "+20 Mısır",
  "+212 Fas",
  "+213 Cezayir",
  "+216 Tunus",
  "+218 Libya",
  "+92 Pakistan",
  "+91 Hindistan",
  "+93 Afganistan",
  "+86 Çin",
  "+81 Japonya",
] as const;

function sanitizeDefinedName(prefix: string, id: string) {
  return `${prefix}_${id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function quoteSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

function getColumnLetter(columnNumber: number) {
  let result = "";
  let current = columnNumber;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function compareText(leftValue: string, rightValue: string) {
  return leftValue.localeCompare(rightValue, "tr", {
    numeric: true,
    sensitivity: "base",
  });
}

function apartmentHasType(apartment: ScopedApartment, type: ResidentType) {
  return apartment.residents.some((resident) => resident.type === type);
}

function isApartmentAvailableForType(
  apartment: ScopedApartment,
  type: ResidentType
) {
  return !apartmentHasType(apartment, type);
}

function buildTemplateSites(
  apartments: ScopedApartment[],
  type: ResidentType
) {
  const siteMap = new Map<string, TemplateSite>();

  for (const apartment of apartments) {
    if (!isApartmentAvailableForType(apartment, type)) {
      continue;
    }

    const site = apartment.block.site;
    const block = apartment.block;

    let siteEntry = siteMap.get(site.id);

    if (!siteEntry) {
      siteEntry = {
        id: site.id,
        name: site.name,
        blocks: [],
      };
      siteMap.set(site.id, siteEntry);
    }

    let blockEntry = siteEntry.blocks.find((item) => item.id === block.id);

    if (!blockEntry) {
      blockEntry = {
        id: block.id,
        name: block.name,
        apartments: [],
      };
      siteEntry.blocks.push(blockEntry);
    }

    if (!blockEntry.apartments.includes(apartment.number)) {
      blockEntry.apartments.push(apartment.number);
    }
  }

  return Array.from(siteMap.values())
    .sort((first, second) => compareText(first.name, second.name))
    .map((site) => ({
      ...site,
      blocks: site.blocks
        .sort((first, second) => compareText(first.name, second.name))
        .map((block) => ({
          ...block,
          apartments: [...block.apartments].sort(compareText),
        })),
    }));
}

function applyListValidation(
  cell: ExcelJS.Cell,
  formula: string,
  promptTitle: string,
  prompt: string
) {
  cell.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Geçersiz seçim",
    error: "Lütfen açılır listeden geçerli bir değer seçin.",
    showInputMessage: true,
    promptTitle,
    prompt,
  };
}

function styleHeaderRow(row: ExcelJS.Row, fillColor: string) {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function populateAvailabilitySheet(params: {
  sheet: ExcelJS.Worksheet;
  apartments: ScopedApartment[];
  type: ResidentType;
}) {
  const { sheet, apartments, type } = params;
  const title =
    type === "TENANT"
      ? "KİRACI İÇİN UYGUN DAİRELER"
      : "EV SAHİBİ İÇİN UYGUN DAİRELER";

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 15,
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: type === "TENANT" ? "FFB45309" : "FF0369A1" },
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet.getRow(1).height = 28;

  sheet.mergeCells("A2:E2");
  sheet.getCell("A2").value =
    type === "TENANT"
      ? "Bu listede kiracı bağlantısı bulunmayan daireler gösterilir. Ev sahibi bulunmayan dairelere kiracı eklenebilir; yönetici tablosunda sarı uyarı oluşur."
      : "Bu listede ev sahibi bağlantısı bulunmayan daireler gösterilir. Kiracısı bulunan daireye ev sahibi eklendiğinde sarı uyarı otomatik olarak kalkar.";
  sheet.getCell("A2").alignment = {
    vertical: "middle",
    wrapText: true,
  };
  sheet.getCell("A2").font = {
    italic: true,
    color: { argb: "FF334155" },
  };
  sheet.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  sheet.getRow(2).height = 42;

  const headers = [
    "Site",
    "Blok / Apartman",
    "Daire No",
    "Mevcut Durum",
    "Açıklama",
  ];
  sheet.getRow(4).values = headers;
  styleHeaderRow(sheet.getRow(4), "FF0F172A");
  sheet.getRow(4).height = 30;

  const eligibleApartments = apartments
    .filter((apartment) => isApartmentAvailableForType(apartment, type))
    .sort((first, second) => {
      const siteComparison = compareText(
        first.block.site.name,
        second.block.site.name
      );

      if (siteComparison !== 0) {
        return siteComparison;
      }

      const blockComparison = compareText(first.block.name, second.block.name);

      if (blockComparison !== 0) {
        return blockComparison;
      }

      return compareText(first.number, second.number);
    });

  eligibleApartments.forEach((apartment, index) => {
    const hasOwner = apartmentHasType(apartment, "OWNER");
    const hasTenant = apartmentHasType(apartment, "TENANT");
    const row = sheet.getRow(index + 5);

    const currentStatus = hasOwner
      ? "Ev Sahibi Var"
      : hasTenant
        ? "Kiracı Var"
        : "Boş";

    const explanation =
      type === "TENANT"
        ? hasOwner
          ? "Kiracı eklenebilir."
          : "Kiracı eklenebilir. Ev sahibi bilgisi eksik uyarısı gösterilir."
        : hasTenant
          ? "Ev sahibi eklenebilir. Mevcut sarı uyarı otomatik kalkar."
          : "Ev sahibi eklenebilir.";

    row.values = [
      apartment.block.site.name,
      apartment.block.name,
      apartment.number,
      currentStatus,
      explanation,
    ];
    row.height = 25;
    row.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    const hasWarning = type === "TENANT" ? !hasOwner : hasTenant;

    if (hasWarning) {
      row.getCell(4).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
      row.getCell(4).font = {
        bold: true,
        color: { argb: "FF92400E" },
      };
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFBEB" },
      };
    }
  });

  if (eligibleApartments.length === 0) {
    sheet.mergeCells("A5:E5");
    sheet.getCell("A5").value =
      type === "TENANT"
        ? "Kiracı eklenebilecek daire bulunamadı."
        : "Ev sahibi eklenebilecek daire bulunamadı.";
    sheet.getCell("A5").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    sheet.getCell("A5").font = {
      italic: true,
      color: { argb: "FF64748B" },
    };
  }

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 64;

  if (eligibleApartments.length > 0) {
    sheet.autoFilter = {
      from: "A4",
      to: `E${eligibleApartments.length + 4}`,
    };
  }

  sheet.views = [{ state: "frozen", ySplit: 4 }];
}

export async function createResidentImportTemplate(params: {
  actor: ImportActor;
}) {
  const scopedApartments = (await getScopedApartments(
    params.actor
  )) as ScopedApartment[];

  if (scopedApartments.length === 0) {
    throw new Error("Şablona eklenecek yetkili daire bulunamadı.");
  }

  const typeDefinitions: TemplateTypeDefinition[] = [
    {
      type: "OWNER",
      label: "Ev Sahibi",
      sites: buildTemplateSites(scopedApartments, "OWNER"),
    },
    {
      type: "TENANT",
      label: "Kiracı",
      sites: buildTemplateSites(scopedApartments, "TENANT"),
    },
  ];

  const totalAvailableApartmentCount = typeDefinitions.reduce(
    (total, definition) =>
      total +
      definition.sites.reduce(
        (siteTotal, site) =>
          siteTotal +
          site.blocks.reduce(
            (blockTotal, block) => blockTotal + block.apartments.length,
            0
          ),
        0
      ),
    0
  );

  if (totalAvailableApartmentCount === 0) {
    throw new Error(
      "Kiracı veya ev sahibi eklenebilecek uygun daire bulunamadı."
    );
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Sitesis";
  workbook.company = "Sitesis";
  workbook.subject = "Kiracı ve ev sahibi toplu yükleme şablonu";
  workbook.title = "Sitesis Sakin Toplu Yükleme Şablonu";
  workbook.created = new Date();

  const inputSheet = workbook.addWorksheet("Sakin Yükleme", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  const tenantAvailabilitySheet = workbook.addWorksheet(
    "Kiracı İçin Uygun Daireler"
  );
  const ownerAvailabilitySheet = workbook.addWorksheet(
    "Ev Sahibi İçin Uygun Daireler"
  );
  const guideSheet = workbook.addWorksheet("Açıklamalar");
  const exampleSheet = workbook.addWorksheet("Örnekler");
  const listSheet = workbook.addWorksheet("Listeler");

  listSheet.state = "veryHidden";

  populateAvailabilitySheet({
    sheet: tenantAvailabilitySheet,
    apartments: scopedApartments,
    type: "TENANT",
  });
  populateAvailabilitySheet({
    sheet: ownerAvailabilitySheet,
    apartments: scopedApartments,
    type: "OWNER",
  });

  inputSheet.mergeCells("A1:I1");
  const titleCell = inputSheet.getCell("A1");
  titleCell.value = "SİTESİS — SAKİN TOPLU YÜKLEME ŞABLONU";
  titleCell.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 16,
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1D4ED8" },
  };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  inputSheet.getRow(1).height = 28;

  inputSheet.mergeCells("A2:I2");
  const infoCell = inputSheet.getCell("A2");
  infoCell.value =
    "Önce kayıt tipini seçin. Site, blok ve daire listeleri seçilen tipe göre yalnızca uygun kayıtları gösterecektir. " +
    "Şablondaki uygunluk bilgileri dosyanın indirildiği ana aittir; yükleme sırasında sistem tekrar kontrol eder.";
  infoCell.font = {
    italic: true,
    color: { argb: "FF1E3A8A" },
  };
  infoCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDBEAFE" },
  };
  infoCell.alignment = {
    vertical: "middle",
    wrapText: true,
  };
  inputSheet.getRow(2).height = 42;

  const headers = [
    "Ülke Kodu",
    "Telefon Numarası",
    "Ad Soyad *",
    "E-posta *",
    "Kayıt Tipi *",
    "Site Adı *",
    "Blok / Apartman Adı *",
    "Daire No *",
    "Geçici Şifre",
  ];

  inputSheet.getRow(4).values = headers;
  inputSheet.getRow(4).height = 34;
  styleHeaderRow(inputSheet.getRow(4), "FF0F172A");

  const widths = [19, 19, 24, 30, 17, 25, 25, 14, 20];
  widths.forEach((width, index) => {
    inputSheet.getColumn(index + 1).width = width;
  });

  for (
    let rowNumber = TEMPLATE_ROW_START;
    rowNumber <= TEMPLATE_ROW_END;
    rowNumber += 1
  ) {
    const row = inputSheet.getRow(rowNumber);
    row.height = 22;

    for (
      let columnNumber = 1;
      columnNumber <= headers.length;
      columnNumber += 1
    ) {
      const cell = row.getCell(columnNumber);
      cell.numFmt = "@";
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }

    applyListValidation(
      row.getCell(1),
      "=COUNTRY_CODES",
      "Ülke Kodu",
      "Telefon numarası yazılacaksa ülke kodunu listeden seçin."
    );
    applyListValidation(
      row.getCell(5),
      "=RESIDENT_TYPES",
      "Kayıt Tipi",
      "Ev Sahibi veya Kiracı seçin."
    );
    applyListValidation(
      row.getCell(6),
      `=INDIRECT(IFERROR(VLOOKUP(E${rowNumber},TYPE_SITE_MAP,2,FALSE),"EMPTY_LIST"))`,
      "Site",
      "Önce kayıt tipini, sonra uygun siteyi seçin."
    );
    applyListValidation(
      row.getCell(7),
      `=INDIRECT(IFERROR(VLOOKUP(E${rowNumber}&"|"&F${rowNumber},TYPE_SITE_BLOCK_MAP,2,FALSE),"EMPTY_LIST"))`,
      "Blok / Apartman",
      "Önce kayıt tipi ve siteyi, sonra uygun bloğu seçin."
    );
    applyListValidation(
      row.getCell(8),
      `=INDIRECT(IFERROR(VLOOKUP(E${rowNumber}&"|"&F${rowNumber}&"|"&G${rowNumber},TYPE_BLOCK_APARTMENT_MAP,2,FALSE),"EMPTY_LIST"))`,
      "Daire",
      "Seçilen sakin tipine göre yalnızca uygun daireler gösterilir."
    );
  }

  inputSheet.autoFilter = {
    from: "A4",
    to: `I${TEMPLATE_ROW_END}`,
  };

  const requiredColumnFills = ["C", "D", "E", "F", "G", "H"];

  for (const columnLetter of requiredColumnFills) {
    for (
      let rowNumber = TEMPLATE_ROW_START;
      rowNumber <= TEMPLATE_ROW_END;
      rowNumber += 1
    ) {
      inputSheet.getCell(`${columnLetter}${rowNumber}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
    }
  }

  // Lists used by Excel dropdowns.
  listSheet.getCell("A1").value = "Ülke Kodları";
  COUNTRY_PHONE_CODE_OPTIONS.forEach((option, index) => {
    listSheet.getCell(index + 2, 1).value = option;
  });

  listSheet.getCell("B1").value = "Kayıt Tipleri";
  listSheet.getCell("B2").value = "Ev Sahibi";
  listSheet.getCell("B3").value = "Kiracı";

  listSheet.getCell("C1").value = "Kayıt Tipi";
  listSheet.getCell("D1").value = "Site Liste Adı";
  listSheet.getCell("E1").value = "Kayıt Tipi|Site";
  listSheet.getCell("F1").value = "Blok Liste Adı";
  listSheet.getCell("G1").value = "Kayıt Tipi|Site|Blok";
  listSheet.getCell("H1").value = "Daire Liste Adı";
  listSheet.getCell("I1").value = "Boş Liste";
  listSheet.getCell("I2").value = "";

  const sheetReference = quoteSheetName(listSheet.name);

  workbook.definedNames.add(
    `${sheetReference}!$A$2:$A$${COUNTRY_PHONE_CODE_OPTIONS.length + 1}`,
    "COUNTRY_CODES"
  );
  workbook.definedNames.add(
    `${sheetReference}!$B$2:$B$3`,
    "RESIDENT_TYPES"
  );
  workbook.definedNames.add(`${sheetReference}!$I$2:$I$2`, "EMPTY_LIST");

  let listColumnNumber = 11;
  let typeSiteMapRow = 2;
  let typeSiteBlockMapRow = 2;
  let typeBlockApartmentMapRow = 2;

  for (const definition of typeDefinitions) {
    let siteListRangeName = "EMPTY_LIST";

    if (definition.sites.length > 0) {
      siteListRangeName = sanitizeDefinedName(
        `${definition.type}_SITES`,
        definition.type
      );
      const siteColumnLetter = getColumnLetter(listColumnNumber);

      listSheet.getCell(1, listColumnNumber).value = siteListRangeName;
      definition.sites.forEach((site, index) => {
        listSheet.getCell(index + 2, listColumnNumber).value = site.name;
      });

      workbook.definedNames.add(
        `${sheetReference}!$${siteColumnLetter}$2:$${siteColumnLetter}$${
          definition.sites.length + 1
        }`,
        siteListRangeName
      );
      listColumnNumber += 1;
    }

    listSheet.getCell(typeSiteMapRow, 3).value = definition.label;
    listSheet.getCell(typeSiteMapRow, 4).value = siteListRangeName;
    typeSiteMapRow += 1;

    for (const site of definition.sites) {
      const blockRangeName = sanitizeDefinedName(
        `${definition.type}_SITE`,
        site.id
      );
      const blockColumnLetter = getColumnLetter(listColumnNumber);

      listSheet.getCell(1, listColumnNumber).value = blockRangeName;
      site.blocks.forEach((block, index) => {
        listSheet.getCell(index + 2, listColumnNumber).value = block.name;
      });

      workbook.definedNames.add(
        `${sheetReference}!$${blockColumnLetter}$2:$${blockColumnLetter}$${
          site.blocks.length + 1
        }`,
        blockRangeName
      );

      listSheet.getCell(typeSiteBlockMapRow, 5).value =
        `${definition.label}|${site.name}`;
      listSheet.getCell(typeSiteBlockMapRow, 6).value = blockRangeName;
      typeSiteBlockMapRow += 1;
      listColumnNumber += 1;

      for (const block of site.blocks) {
        const apartmentRangeName = sanitizeDefinedName(
          `${definition.type}_BLOCK`,
          block.id
        );
        const apartmentColumnLetter = getColumnLetter(listColumnNumber);

        listSheet.getCell(1, listColumnNumber).value = apartmentRangeName;
        block.apartments.forEach((apartmentNumber, index) => {
          listSheet.getCell(index + 2, listColumnNumber).value =
            apartmentNumber;
        });

        workbook.definedNames.add(
          `${sheetReference}!$${apartmentColumnLetter}$2:$${apartmentColumnLetter}$${
            block.apartments.length + 1
          }`,
          apartmentRangeName
        );

        listSheet.getCell(typeBlockApartmentMapRow, 7).value =
          `${definition.label}|${site.name}|${block.name}`;
        listSheet.getCell(typeBlockApartmentMapRow, 8).value =
          apartmentRangeName;
        typeBlockApartmentMapRow += 1;
        listColumnNumber += 1;
      }
    }
  }

  if (typeSiteBlockMapRow === 2) {
    listSheet.getCell("E2").value = "";
    listSheet.getCell("F2").value = "EMPTY_LIST";
    typeSiteBlockMapRow = 3;
  }

  if (typeBlockApartmentMapRow === 2) {
    listSheet.getCell("G2").value = "";
    listSheet.getCell("H2").value = "EMPTY_LIST";
    typeBlockApartmentMapRow = 3;
  }

  workbook.definedNames.add(
    `${sheetReference}!$C$2:$D$${typeSiteMapRow - 1}`,
    "TYPE_SITE_MAP"
  );
  workbook.definedNames.add(
    `${sheetReference}!$E$2:$F$${typeSiteBlockMapRow - 1}`,
    "TYPE_SITE_BLOCK_MAP"
  );
  workbook.definedNames.add(
    `${sheetReference}!$G$2:$H$${typeBlockApartmentMapRow - 1}`,
    "TYPE_BLOCK_APARTMENT_MAP"
  );

  // Instructions sheet.
  guideSheet.mergeCells("A1:B1");
  guideSheet.getCell("A1").value = "ŞABLON KULLANIM AÇIKLAMALARI";
  guideSheet.getCell("A1").font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 15,
  };
  guideSheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  guideSheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  guideSheet.getColumn(1).width = 27;
  guideSheet.getColumn(2).width = 82;

  const guideRows = [
    ["Kural", "Açıklama"],
    [
      "Ülke kodu",
      "Telefon yazılacaksa önce ülke kodunu seçin. Örnek: +90 Türkiye.",
    ],
    [
      "Telefon numarası",
      "Yerel numarayı yazın. Başındaki 0 otomatik kaldırılır. Örnek: 05321234567.",
    ],
    [
      "Kayıt tipine göre seçim",
      "Önce Ev Sahibi veya Kiracı seçin. Site, blok ve daire listeleri bu seçime göre yalnızca uygun kayıtları gösterir.",
    ],
    [
      "Kiracı için uygun daire",
      "Kiracı bağlantısı bulunmayan daireler listelenir. Ev sahibi bulunmasa da kiracı eklenebilir ve yönetici tablosunda sarı uyarı görünür.",
    ],
    [
      "Ev sahibi için uygun daire",
      "Ev sahibi bağlantısı bulunmayan daireler listelenir. Dairede kiracı varsa ev sahibi eklendiğinde sarı uyarı otomatik kalkar.",
    ],
    [
      "Uygun daire sayfaları",
      "Kiracı İçin Uygun Daireler ve Ev Sahibi İçin Uygun Daireler sayfalarından güncel durumu görebilirsiniz.",
    ],
    [
      "Yönetici yetkisi",
      "Yönetici tarafından indirilen şablonda yalnızca yetki alanındaki site, blok ve daireler bulunur.",
    ],
    [
      "Geçici şifre",
      "Yeni hesapta en az 8 karakter zorunludur. Var olan aktif hesapta boş bırakılabilir.",
    ],
    [
      "Güncellik ve güvenlik",
      "Excel listeleri dosyanın indirildiği andaki durumu gösterir. Yükleme sırasında backend yetki ve doluluk kontrollerini yeniden yapar.",
    ],
    [
      "Kontrol",
      "Kırmızı hatalar düzeltilmeden kayıt yapılamaz. Sarı uyarılı satırlar geçerlidir ve kaydedilebilir.",
    ],
  ];

  guideRows.forEach((values, index) => {
    const row = guideSheet.getRow(index + 3);
    row.values = values;
    row.alignment = {
      vertical: "top",
      wrapText: true,
    };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    if (index === 0) {
      row.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF134E4A" },
        };
      });
    } else {
      row.getCell(1).font = {
        bold: true,
        color: { argb: "FF134E4A" },
      };
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCFBF1" },
      };
    }
  });

  // Example sheet.
  exampleSheet.mergeCells("A1:I1");
  exampleSheet.getCell("A1").value = "ÖRNEK SATIRLAR — BU SAYFA YÜKLENMEZ";
  exampleSheet.getCell("A1").font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 14,
  };
  exampleSheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7C3AED" },
  };
  exampleSheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  exampleSheet.getRow(3).values = headers;
  styleHeaderRow(exampleSheet.getRow(3), "FF4C1D95");

  const firstDefinition =
    typeDefinitions.find((definition) => definition.sites.length > 0) ??
    typeDefinitions[0];
  const firstSite = firstDefinition?.sites[0];
  const firstBlock = firstSite?.blocks[0];
  const firstApartment = firstBlock?.apartments[0] ?? "";

  exampleSheet.addRow([
    "+90 Türkiye",
    "05321234567",
    "Ahmet Yılmaz",
    "ahmet@example.com",
    firstDefinition?.label ?? "Ev Sahibi",
    firstSite?.name ?? "",
    firstBlock?.name ?? "",
    firstApartment,
    "Gecici123!",
  ]);

  widths.forEach((width, index) => {
    exampleSheet.getColumn(index + 1).width = width;
  });

  const output = await workbook.xlsx.writeBuffer();

  return Buffer.from(output);
}
