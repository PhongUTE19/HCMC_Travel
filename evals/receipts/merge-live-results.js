/** Merge independently checkpointed live result files without calling Gemini. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const primaryPath = path.join(root, 'live-results.json');
const supplementalPath = path.join(root, process.argv[2] || 'live-results-case-18.json');
const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
const supplemental = JSON.parse(await fs.readFile(supplementalPath, 'utf8'));

for (const entry of supplemental.fixtureManifest) {
  primary.fixtureManifest = primary.fixtureManifest.filter((current) => current.id !== entry.id);
  primary.fixtureManifest.push(entry);
}
for (const entry of supplemental.results) {
  primary.results = primary.results.filter((current) => !(current.fixture === entry.fixture && current.promptVersion === entry.promptVersion));
  primary.results.push(entry);
}
const versions = Object.keys(primary.prompts);
const groups = [...new Set(primary.results.map((entry) => entry.group))];
const summarize = (entries) => {
  const passed = entries.filter((entry) => entry.pass).length;
  return { total: entries.length, passed, failed: entries.length - passed, passRate: entries.length ? Number(((passed / entries.length) * 100).toFixed(1)) : null, meanLatencyMs: entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.latencyMs, 0) / entries.length) : null, tokensReported: entries.filter((entry) => entry.tokenUsage.totalTokenCount !== null).length };
};
primary.fixtureCount = primary.fixtureManifest.length;
primary.generatedAt = new Date().toISOString();
primary.summary = Object.fromEntries(versions.map((version) => [version, summarize(primary.results.filter((entry) => entry.promptVersion === version))]));
primary.groupSummary = Object.fromEntries(versions.map((version) => [version, Object.fromEntries(groups.map((group) => [group, summarize(primary.results.filter((entry) => entry.promptVersion === version && entry.group === group))]))]));
await fs.writeFile(primaryPath, `${JSON.stringify(primary, null, 2)}\n`);
console.log(`Merged ${supplemental.results.length} result entries; ${primary.fixtureCount} fixtures and ${primary.results.length} calls are now recorded.`);
