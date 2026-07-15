import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

if (!fs.existsSync(srcRoot)) {
  console.error("HATA: Bu komutu Sitesis ana klasöründe çalıştırmalısınız.");
  process.exit(1);
}

const configDir = path.join(srcRoot, "config");
const managerNavigationPath = path.join(configDir, "managerNavigation.jsx");

fs.mkdirSync(configDir, { recursive: true });

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

fs.writeFileSync(managerNavigationPath, managerNavigationContent, "utf8");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(
  path.dirname(projectRoot),
  `sitesis-menu-backup-${timestamp}`
);

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const relativePath = path.relative(projectRoot, filePath);
  const backupPath = path.join(backupRoot, relativePath);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function findClosingBracket(text, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
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

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") depth += 1;

    if (char === "]") {
      depth -= 1;

      if (depth === 0) return index;
    }
  }

  return -1;
}

function removeLocalNavItems(text) {
  const marker = "const navItems = [";
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) return text;

  const openingBracketIndex = text.indexOf("[", markerIndex);
  const closingBracketIndex = findClosingBracket(text, openingBracketIndex);

  if (closingBracketIndex === -1) {
    throw new Error("navItems dizisinin kapanış parantezi bulunamadı.");
  }

  let endIndex = closingBracketIndex + 1;

  while (/\s/.test(text[endIndex] ?? "")) endIndex += 1;
  if (text[endIndex] === ";") endIndex += 1;
  while (text[endIndex] === "\r" || text[endIndex] === "\n") endIndex += 1;

  return text.slice(0, markerIndex) + text.slice(endIndex);
}

function ensureImport(text, filePath) {
  if (text.includes('managerNavigation"')) return text;

  let relativePath = path.relative(
    path.dirname(filePath),
    path.join(srcRoot, "config", "managerNavigation")
  );

  relativePath = relativePath.split(path.sep).join("/");

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return `import { managerNavItems } from "${relativePath}";\n${text}`;
}

function removeUnusedLucideImports(text) {
  const pattern =
    /import\s*\{\s*([\s\S]*?)\s*\}\s*from\s*["']lucide-react["'];?/m;

  const match = text.match(pattern);
  if (!match) return text;

  const names = match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const withoutImport =
    text.slice(0, match.index) +
    text.slice(match.index + match[0].length);

  const usedNames = names.filter((name) => {
    const localName = name.split(/\s+as\s+/i).pop().trim();
    return new RegExp(`\\b${localName}\\b`).test(withoutImport);
  });

  if (usedNames.length === 0) {
    return withoutImport.replace(/^\s*\n/, "");
  }

  const nextImport = `import {\n  ${usedNames.join(",\n  ")},\n} from "lucide-react";`;

  return (
    text.slice(0, match.index) +
    nextImport +
    text.slice(match.index + match[0].length)
  );
}

function patchPage(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const original = fs.readFileSync(filePath, "utf8");

  if (
    !original.includes("navItems={navItems}") &&
    !original.includes("navItems={managerNavItems}")
  ) {
    return false;
  }

  let next = removeLocalNavItems(original);
  next = next.replace(/navItems=\{navItems\}/g, "navItems={managerNavItems}");
  next = ensureImport(next, filePath);
  next = removeUnusedLucideImports(next);

  if (next === original) return false;

  backupFile(filePath);
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

const filesToPatch = [];

const managerPagesDir = path.join(srcRoot, "pages", "manager");

if (fs.existsSync(managerPagesDir)) {
  for (const name of fs.readdirSync(managerPagesDir)) {
    if (name.endsWith(".jsx")) {
      filesToPatch.push(path.join(managerPagesDir, name));
    }
  }
}

filesToPatch.push(
  path.join(srcRoot, "pages", "dashboards", "ManagerDashboard.jsx")
);

let patchedCount = 0;

for (const filePath of filesToPatch) {
  if (patchPage(filePath)) {
    patchedCount += 1;
    console.log("Düzeltildi:", path.relative(projectRoot, filePath));
  }
}

console.log("");
console.log("Yönetici menüsü düzeltildi.");
console.log("Düzeltilen sayfa sayısı:", patchedCount);
console.log("Ortak menü dosyası:", path.relative(projectRoot, managerNavigationPath));
console.log("Yedek klasörü:", backupRoot);
console.log("");
console.log("Şimdi çalıştırın:");
console.log("npm run lint");
console.log("npm run build");
console.log("npm run dev");
