import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const indexHtmlPath = path.join(repoRoot, 'index.html');
const allowedDirectStorage = new Set([
  path.join(srcRoot, 'lib', 'safe-storage.js'),
  path.join(srcRoot, 'core', 'data', 'safe-storage.js'),
]);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walkFiles(currentPath, files = []) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const nextPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(nextPath, files);
      continue;
    }

    files.push(nextPath);
  }

  return files;
}

const failures = [];
const srcFiles = walkFiles(srcRoot).filter((filePath) => /\.(js|jsx|ts|tsx|css)$/.test(filePath));
const indexHtml = readText(indexHtmlPath);

if (/src=["']\/src\//.test(indexHtml)) {
  failures.push('index.html uses a root-relative Vite entry script. Use a relative path for Base44 preview safety.');
}

if (/<link[^>]+href=["']https?:\/\//i.test(indexHtml)) {
  failures.push('index.html references an external asset. Keep editor bootstrap assets local or inline.');
}

if (/document\.write\s*\(/.test(indexHtml)) {
  failures.push('index.html uses document.write(), which is brittle in embedded preview runtimes.');
}

for (const filePath of srcFiles) {
  const source = readText(filePath);
  const relativePath = path.relative(repoRoot, filePath);

  if (source.includes('@base44/sdk/dist')) {
    failures.push(`${relativePath} imports internal @base44/sdk paths. Use public SDK exports only.`);
  }

  if (source.includes('?raw')) {
    failures.push(`${relativePath} uses a raw asset import. Prefer generated modules inside src for Base44 compatibility.`);
  }

  if (/document\.write\s*\(/.test(source)) {
    failures.push(`${relativePath} uses document.write(), which is unsafe for Base44 preview/editor runtimes.`);
  }

  if (!allowedDirectStorage.has(filePath) && (/\bwindow\.localStorage\b/.test(source) || /\blocalStorage\b/.test(source) || /\bsessionStorage\b/.test(source))) {
    failures.push(`${relativePath} touches browser storage directly. Route storage access through the safe-storage helper.`);
  }
}

if (failures.length > 0) {
  console.error('Base44 editor compatibility issues detected:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Base44 editor audit passed.');
