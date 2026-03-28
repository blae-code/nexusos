import fs from 'node:fs';
import path from 'node:path';
import { buildRunId, writeArtifact } from './lib/live-proof.mjs';

const SOURCE_ROOT = path.resolve(process.cwd(), 'src');
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const EXCLUDED_FILES = new Set([
  'src/pages.config.js',
]);
const ALLOWLIST = [
  {
    path: 'src/components/admin/ReadinessAuditPanel.jsx',
    regex: /sample-data|SAMPLE DATA|sample flags/i,
    reason: 'Admin readiness copy describing the audit itself',
  },
  {
    path: 'src/pages/NexusTodo.jsx',
    regex: /sample-data/i,
    reason: 'Readiness page copy describing the audit itself',
  },
];
const CHECKS = [
  {
    id: 'named_demo_dataset',
    regex: /\bconst\s+[A-Z0-9_]*(?:DEMO|MOCK|SAMPLE|EXAMPLE|FIXTURE)[A-Z0-9_]*\s*=/i,
    message: 'Possible hardcoded demo dataset constant in user-facing code',
  },
  {
    id: 'generic_demo_marker',
    regex: /\b(?:demo|mock|sample|example|fixture)\b/i,
    message: 'Generic demo/sample marker found in user-facing code',
  },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(nextPath);
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) {
      return [];
    }
    return [nextPath];
  });
}

function isAllowlisted(relativePath, lineText) {
  return ALLOWLIST.some((rule) => rule.path === relativePath && rule.regex.test(lineText));
}

function collectFindings() {
  const files = walk(SOURCE_ROOT);
  const findings = [];

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    if (EXCLUDED_FILES.has(relativePath)) {
      continue;
    }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/u);

    lines.forEach((lineText, index) => {
      for (const check of CHECKS) {
        if (!check.regex.test(lineText)) {
          continue;
        }
        if (isAllowlisted(relativePath, lineText)) {
          continue;
        }

        findings.push({
          check: check.id,
          file: relativePath,
          line: index + 1,
          message: check.message,
          snippet: lineText.trim(),
        });
      }
    });
  }

  return findings;
}

const runId = buildRunId('repo-sample-audit');
const findings = collectFindings();
const artifact = {
  run_id: runId,
  executed_at: new Date().toISOString(),
  ok: findings.length === 0,
  findings,
};
const artifactFile = writeArtifact(`${runId}.json`, artifact);

console.log(`Repo sample-data audit artifact: ${artifactFile}`);
console.log(`Repo sample-data audit ok: ${findings.length === 0}`);

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line} [${finding.check}] ${finding.message}`);
    console.log(`  ${finding.snippet}`);
  }
  process.exitCode = 1;
}
