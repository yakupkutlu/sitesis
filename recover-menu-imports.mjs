import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const projectParent = path.dirname(projectRoot);
const srcRoot = path.join(projectRoot, "src");

if (!fs.existsSync(srcRoot)) {
  console.error("");
  console.error("HATA: Bu dosyayı Sitesis ana klasöründe çalıştırmalısınız.");
  console.error("Beklenen klasör:", srcRoot);
  process.exit(1);
}

const menuBackups = fs
  .readdirSync(projectParent, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && entry.name.startsWith("sitesis-menu-backup-")
  )
  .map((entry) => {
    const fullPath = path.join(projectParent, entry.name);

    return {
      name: entry.name,
      fullPath,
      modifiedAt: fs.statSync(fullPath).mtimeMs,
    };
  })
  .sort((left, right) => right.modifiedAt - left.modifiedAt);

if (menuBackups.length === 0) {
  console.error("");
  console.error("HATA: sitesis-menu-backup-* yedek klasörü bulunamadı.");
  console.error(
    "Önce proje klasörünün bir üst dizininde bu yedek klasörün bulunduğunu kontrol edin."
  );
  process.exit(1);
}

const sourceBackupRoot = menuBackups[0].fullPath;
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const brokenFilesBackupRoot = path.join(
  projectParent,
  `sitesis-broken-menu-imports-backup-${timestamp}`
);

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function backupCurrentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const relativePath = path.relative(projectRoot, filePath);
  const backupPath = path.join(brokenFilesBackupRoot, relativePath);

  ensureDirectory(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
}

function copyFileWithSafety(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  backupCurrentFile(targetPath);
  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);

  return true;
}

function walkFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }

      return [fullPath];
    });
}

const restoredFiles = [];

const backupManagerPagesDir = path.join(
  sourceBackupRoot,
  "src",
  "pages",
  "manager"
);

for (const sourcePath of walkFiles(backupManagerPagesDir)) {
  if (!sourcePath.endsWith(".jsx")) {
    continue;
  }

  const relativePath = path.relative(sourceBackupRoot, sourcePath);
  const targetPath = path.join(projectRoot, relativePath);

  if (copyFileWithSafety(sourcePath, targetPath)) {
    restoredFiles.push(relativePath);
  }
}

const backupManagerDashboardPath = path.join(
  sourceBackupRoot,
  "src",
  "pages",
  "dashboards",
  "ManagerDashboard.jsx"
);

const managerDashboardTargetPath = path.join(
  srcRoot,
  "pages",
  "dashboards",
  "ManagerDashboard.jsx"
);

if (
  copyFileWithSafety(
    backupManagerDashboardPath,
    managerDashboardTargetPath
  )
) {
  restoredFiles.push(
    path.relative(projectRoot, managerDashboardTargetPath)
  );
}

if (restoredFiles.length === 0) {
  console.error("");
  console.error("HATA: Menü yedeğinde geri yüklenecek JSX dosyası bulunamadı.");
  console.error("Kullanılan yedek:", sourceBackupRoot);
  process.exit(1);
}

const configDirectory = path.join(srcRoot, "config");
const managerNavigationPath = path.join(
  configDirectory,
  "managerNavigation.jsx"
);

ensureDirectory(configDirectory);
backupCurrentFile(managerNavigationPath);

const managerNavigationContent = `import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  ReceiptText,
  Settings,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";

export const managerNavItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  {
    label: "Kasa / Ön Muhasebe",
    path: "/manager/accounting",
    icon: WalletCards,
  },
  {
    label: "Gelirler",
    path: "/manager/accounting/income",
    icon: TrendingUp,
  },
  {
    label: "Giderler",
    path: "/manager/accounting/expenses",
    icon: TrendingDown,
  },
  {
    label: "Aidat ve Ödemeler",
    path: "/manager/payments",
    icon: CreditCard,
  },
  { label: "Dekontlar", path: "/manager/receipts", icon: ReceiptText },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];
`;

fs.writeFileSync(
  managerNavigationPath,
  managerNavigationContent,
  "utf8"
);

function findClosingBracket(text, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingIndex; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (character === "*" && nextCharacter === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote = character;
      continue;
    }

    if (character === "[") {
      depth += 1;
      continue;
    }

    if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function removeLocalNavItems(text) {
  const marker = "const navItems = [";
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    return text;
  }

  const openingBracketIndex = text.indexOf("[", markerIndex);
  const closingBracketIndex = findClosingBracket(
    text,
    openingBracketIndex
  );

  if (closingBracketIndex === -1) {
    throw new Error("navItems kapanış parantezi bulunamadı.");
  }

  let endIndex = closingBracketIndex + 1;

  while (/\s/.test(text[endIndex] ?? "")) {
    endIndex += 1;
  }

  if (text[endIndex] === ";") {
    endIndex += 1;
  }

  while (
    text[endIndex] === "\r" ||
    text[endIndex] === "\n"
  ) {
    endIndex += 1;
  }

  return text.slice(0, markerIndex) + text.slice(endIndex);
}

function ensureManagerNavigationImport(text, filePath) {
  if (
    /import\s*\{\s*managerNavItems\s*\}\s*from\s*["'][^"']*managerNavigation["']/.test(
      text
    )
  ) {
    return text;
  }

  let relativeImportPath = path.relative(
    path.dirname(filePath),
    path.join(srcRoot, "config", "managerNavigation")
  );

  relativeImportPath = relativeImportPath
    .split(path.sep)
    .join("/");

  if (!relativeImportPath.startsWith(".")) {
    relativeImportPath = `./${relativeImportPath}`;
  }

  return `import { managerNavItems } from "${relativeImportPath}";\n${text}`;
}

function removeUnusedLucideImportsSafely(text) {
  const lucideImportPattern =
    /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']lucide-react["'];?/m;

  const match = text.match(lucideImportPattern);

  if (!match) {
    return text;
  }

  const importStart = match.index;
  const importEnd = importStart + match[0].length;

  const importedParts = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const textWithoutLucideImport =
    text.slice(0, importStart) + text.slice(importEnd);

  const usedParts = importedParts.filter((part) => {
    const localName = part
      .split(/\s+as\s+/i)
      .pop()
      .trim();

    return new RegExp(`\\b${localName}\\b`).test(
      textWithoutLucideImport
    );
  });

  if (usedParts.length === 0) {
    return textWithoutLucideImport.replace(/^\s*\n/, "");
  }

  const replacement = `import {\n  ${usedParts.join(
    ",\n  "
  )},\n} from "lucide-react";`;

  return (
    text.slice(0, importStart) +
    replacement +
    text.slice(importEnd)
  );
}

function patchManagerPage(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const original = fs.readFileSync(filePath, "utf8");
  let nextText = original;

  if (nextText.includes("const navItems = [")) {
    nextText = removeLocalNavItems(nextText);
  }

  nextText = nextText.replace(
    /navItems=\{navItems\}/g,
    "navItems={managerNavItems}"
  );

  if (nextText.includes("navItems={managerNavItems}")) {
    nextText = ensureManagerNavigationImport(
      nextText,
      filePath
    );
  }

  nextText = removeUnusedLucideImportsSafely(nextText);

  if (nextText === original) {
    return false;
  }

  fs.writeFileSync(filePath, nextText, "utf8");
  return true;
}

const filesToPatch = restoredFiles.map((relativePath) =>
  path.join(projectRoot, relativePath)
);

const accountingPages = [
  "AccountingOverviewPage.jsx",
  "AccountingIncomePage.jsx",
  "AccountingExpensesPage.jsx",
].map((fileName) =>
  path.join(srcRoot, "pages", "manager", fileName)
);

for (const accountingPagePath of accountingPages) {
  if (
    fs.existsSync(accountingPagePath) &&
    !filesToPatch.includes(accountingPagePath)
  ) {
    filesToPatch.push(accountingPagePath);
  }
}

let patchedCount = 0;

for (const filePath of filesToPatch) {
  if (patchManagerPage(filePath)) {
    patchedCount += 1;
  }
}

const packageJsonPath = path.join(projectRoot, "package.json");

if (fs.existsSync(packageJsonPath)) {
  const packageJsonText = fs.readFileSync(
    packageJsonPath,
    "utf8"
  );
  const packageJson = JSON.parse(packageJsonText);

  if (
    packageJson.scripts?.lint === "eslint ."
  ) {
    backupCurrentFile(packageJsonPath);

    packageJson.scripts.lint =
      "eslint . --ignore-pattern backend/dist/**";

    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      "utf8"
    );
  }
}

console.log("");
console.log("BAŞARILI: Silinen importlar yedekten geri getirildi.");
console.log("Kullanılan sağlam yedek:", sourceBackupRoot);
console.log(
  "Bozuk mevcut dosyaların yeni yedeği:",
  brokenFilesBackupRoot
);
console.log("Geri yüklenen dosya sayısı:", restoredFiles.length);
console.log("Ortak menüye geçirilen sayfa sayısı:", patchedCount);
console.log("");
console.log("Şimdi sırayla çalıştırın:");
console.log("npm run lint");
console.log("npm run build");
console.log("npm run dev");
console.log("");
