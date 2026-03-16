import {
  normaliseChangelog,
  paths,
  readJson,
  readLatestChangelogEntry,
  readText,
  renderAppVersionModule,
  renderVersioningDoc,
} from './lib.mjs';

const failures = [];
const versionMeta = readJson(paths.version);
const changelog = readText(paths.changelog);
const expectedChangelog = normaliseChangelog(changelog, versionMeta);

if (changelog !== expectedChangelog) {
  failures.push('CHANGELOG.md is not normalized. Run `npm run version:sync`.');
}

const latestEntry = readLatestChangelogEntry(expectedChangelog);
if (latestEntry.version !== versionMeta.version) {
  failures.push(
    `Latest CHANGELOG.md entry is ${latestEntry.version} but version.json is ${versionMeta.version}.`,
  );
}

const packageJson = readJson(paths.packageJson);
if (packageJson.version !== versionMeta.version) {
  failures.push(
    `package.json version is ${packageJson.version} but version.json is ${versionMeta.version}.`,
  );
}

const packageLock = readJson(paths.packageLock);
if (packageLock.version !== versionMeta.version) {
  failures.push(
    `package-lock.json version is ${packageLock.version} but version.json is ${versionMeta.version}.`,
  );
}

if (packageLock.packages?.['']?.version !== versionMeta.version) {
  failures.push(
    `package-lock.json packages[""].version is ${packageLock.packages?.['']?.version ?? 'missing'} but version.json is ${versionMeta.version}.`,
  );
}

const versioningDoc = readText(paths.versioningDoc);
const expectedVersioningDoc = renderVersioningDoc(versionMeta, latestEntry);
if (versioningDoc !== expectedVersioningDoc) {
  failures.push('docs/versioning.md is out of date. Run `npm run version:sync`.');
}

const appVersionModule = readText(paths.appVersionModule);
const expectedAppVersionModule = renderAppVersionModule(versionMeta, expectedChangelog);
if (appVersionModule !== expectedAppVersionModule) {
  failures.push('src/lib/generated/versioning.js is out of date. Run `npm run version:sync`.');
}

if (failures.length > 0) {
  console.error('Versioning drift detected:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Versioning files are aligned for NexusOS ${versionMeta.version}.`);

