import {
  normaliseChangelog,
  paths,
  readJson,
  readLatestChangelogEntry,
  readText,
  renderVersioningDoc,
  writeJson,
  writeText,
} from './lib.mjs';

const versionMeta = readJson(paths.version);

const nextChangelog = normaliseChangelog(readText(paths.changelog), versionMeta);
writeText(paths.changelog, nextChangelog);

const latestEntry = readLatestChangelogEntry(nextChangelog);
if (latestEntry.version !== versionMeta.version) {
  throw new Error(
    `version.json is ${versionMeta.version} but the latest changelog entry is ${latestEntry.version}. Use version-bump.ps1 or update CHANGELOG.md.`,
  );
}

const packageJson = readJson(paths.packageJson);
packageJson.version = versionMeta.version;
writeJson(paths.packageJson, packageJson);

const packageLock = readJson(paths.packageLock);
packageLock.version = versionMeta.version;
if (packageLock.packages?.['']) {
  packageLock.packages[''].version = versionMeta.version;
}
writeJson(paths.packageLock, packageLock);

const versioningDoc = renderVersioningDoc(versionMeta, latestEntry);
writeText(paths.versioningDoc, versioningDoc);

console.log(`Synchronized versioning files for NexusOS ${versionMeta.version} (build ${versionMeta.build}).`);

