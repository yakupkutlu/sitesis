import ExcelJS from "exceljs";

import {
  getScopedApartments,
  type ImportActor,
} from "./resident-import.service.js";

const TEMPLATE_ROW_START = 5;
const TEMPLATE_ROW_END = 254;

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

function buildTemplateSites(
  apartments: Awaited<ReturnType<typeof getScopedApartments>>
) {
  const siteMap = new Map<string, TemplateSite>();

  for (const apartment of apartments) {
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
    .sort((first, second) =>
      first.name.localeCompare(second.name, "tr", { numeric: true })
    )
    .map((site) => ({
      ...site,
      blocks: site.blocks
        .sort((first, second) =>
          first.name.localeCompare(second.name, "tr", { numeric: true })
        )
        .map((block) => ({
          ...block,
          apartments: [...block.apartments].sort((first, second) =>
            first.localeCompare(second, "tr", { numeric: true })
          ),
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

export async function createResidentImportTemplate(params: {
  actor: ImportActor;
}) {
  const scopedApartments = await getScopedApartments(params.actor);

  if (scopedApartments.length === 0) {
    throw new Error("Şablona eklenecek yetkili daire bulunamadı.");
  }

  const sites = buildTemplateSites(scopedApartments);
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Sitesis";
  workbook.company = "Sitesis";
  workbook.subject = "Kiracı ve ev sahibi toplu yükleme şablonu";
  workbook.title = "Sitesis Sakin Toplu Yükleme Şablonu";
  workbook.created = new Date();

  const inputSheet = workbook.addWorksheet("Sakin Yükleme", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  const guideSheet = workbook.addWorksheet("Açıklamalar");
  const exampleSheet = workbook.addWorksheet("Örnekler");
  const listSheet = workbook.addWorksheet("Listeler");

  listSheet.state = "veryHidden";

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
    "Ülke kodu, site, blok ve daire alanlarını açılır listeden seçin. " +
    "Yönetici şablonunda yalnızca yetkili olunan daireler bulunur.";
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
  inputSheet.getRow(2).height = 30;

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

  inputSheet.getRow(4).eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
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

  const widths = [19, 19, 24, 30, 17, 25, 25, 14, 20];
  widths.forEach((width, index) => {
    inputSheet.getColumn(index + 1).width = width;
  });

  for (let rowNumber = TEMPLATE_ROW_START; rowNumber <= TEMPLATE_ROW_END; rowNumber += 1) {
    const row = inputSheet.getRow(rowNumber);
    row.height = 22;

    for (let columnNumber = 1; columnNumber <= headers.length; columnNumber += 1) {
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
      "=SITE_LIST",
      "Site",
      "Yetkiniz dahilindeki siteyi seçin."
    );

    applyListValidation(
      row.getCell(7),
      `=INDIRECT(IFERROR(VLOOKUP(F${rowNumber},SITE_BLOCK_MAP,2,FALSE),"EMPTY_LIST"))`,
      "Blok / Apartman",
      "Önce siteyi, sonra bu listeden bloğu seçin."
    );

    applyListValidation(
      row.getCell(8),
      `=INDIRECT(IFERROR(VLOOKUP(F${rowNumber}&"|"&G${rowNumber},BLOCK_APARTMENT_MAP,2,FALSE),"EMPTY_LIST"))`,
      "Daire",
      "Önce site ve bloğu, sonra daireyi seçin."
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

  listSheet.getCell("C1").value = "Site Listesi";
  sites.forEach((site, index) => {
    listSheet.getCell(index + 2, 3).value = site.name;
  });

  listSheet.getCell("D1").value = "Site";
  listSheet.getCell("E1").value = "Blok Liste Adı";
  listSheet.getCell("F1").value = "Site|Blok";
  listSheet.getCell("G1").value = "Daire Liste Adı";
  listSheet.getCell("H1").value = "Boş Liste";
  listSheet.getCell("H2").value = "";

  const sheetReference = quoteSheetName(listSheet.name);

  workbook.definedNames.add(
    `${sheetReference}!$A$2:$A$${COUNTRY_PHONE_CODE_OPTIONS.length + 1}`,
    "COUNTRY_CODES"
  );
  workbook.definedNames.add(
    `${sheetReference}!$B$2:$B$3`,
    "RESIDENT_TYPES"
  );
  workbook.definedNames.add(
    `${sheetReference}!$C$2:$C$${sites.length + 1}`,
    "SITE_LIST"
  );
  workbook.definedNames.add(
    `${sheetReference}!$H$2:$H$2`,
    "EMPTY_LIST"
  );

  let listColumnNumber = 10;
  let siteMapRow = 2;
  let blockMapRow = 2;

  for (const site of sites) {
    const siteRangeName = sanitizeDefinedName("SITE", site.id);
    const siteColumnLetter = getColumnLetter(listColumnNumber);

    listSheet.getCell(1, listColumnNumber).value = siteRangeName;

    site.blocks.forEach((block, index) => {
      listSheet.getCell(index + 2, listColumnNumber).value = block.name;
    });

    workbook.definedNames.add(
      `${sheetReference}!$${siteColumnLetter}$2:$${siteColumnLetter}$${
        site.blocks.length + 1
      }`,
      siteRangeName
    );

    listSheet.getCell(siteMapRow, 4).value = site.name;
    listSheet.getCell(siteMapRow, 5).value = siteRangeName;
    siteMapRow += 1;
    listColumnNumber += 1;

    for (const block of site.blocks) {
      const blockRangeName = sanitizeDefinedName("BLOCK", block.id);
      const blockColumnLetter = getColumnLetter(listColumnNumber);

      listSheet.getCell(1, listColumnNumber).value = blockRangeName;

      block.apartments.forEach((apartmentNumber, index) => {
        listSheet.getCell(index + 2, listColumnNumber).value =
          apartmentNumber;
      });

      workbook.definedNames.add(
        `${sheetReference}!$${blockColumnLetter}$2:$${blockColumnLetter}$${
          block.apartments.length + 1
        }`,
        blockRangeName
      );

      listSheet.getCell(blockMapRow, 6).value = `${site.name}|${block.name}`;
      listSheet.getCell(blockMapRow, 7).value = blockRangeName;
      blockMapRow += 1;
      listColumnNumber += 1;
    }
  }

  workbook.definedNames.add(
    `${sheetReference}!$D$2:$E$${siteMapRow - 1}`,
    "SITE_BLOCK_MAP"
  );
  workbook.definedNames.add(
    `${sheetReference}!$F$2:$G$${blockMapRow - 1}`,
    "BLOCK_APARTMENT_MAP"
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
  guideSheet.getColumn(2).width = 78;

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
      "Site / Blok / Daire",
      "Önce siteyi seçin. Blok listesi siteye, daire listesi blok seçimine göre açılır.",
    ],
    [
      "Yönetici yetkisi",
      "Yönetici tarafından indirilen şablonda yalnızca yetki alanındaki site, blok ve daireler bulunur.",
    ],
    [
      "Süper admin",
      "Süper admin tarafından indirilen şablonda sistemdeki tüm site, blok ve daireler bulunur.",
    ],
    [
      "Geçici şifre",
      "Yeni hesapta en az 8 karakter zorunludur. Var olan aktif hesapta boş bırakılabilir.",
    ],
    [
      "Kontrol",
      "Dosya yüklenince kayıtlar önce kontrol ekranına gelir. Hatalar düzeltilmeden veritabanına kayıt yapılmaz.",
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
  exampleSheet.getRow(3).eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4C1D95" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });

  const firstSite = sites[0];
  const firstBlock = firstSite?.blocks[0];
  const firstApartment = firstBlock?.apartments[0] ?? "";

  exampleSheet.addRow([
    "+90 Türkiye",
    "05321234567",
    "Ahmet Yılmaz",
    "ahmet@example.com",
    "Ev Sahibi",
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
