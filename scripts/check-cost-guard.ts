import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function walk(directory: string): string[] {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const path = join(absolute, name);
    return statSync(path).isDirectory() ? walk(relative(root, path)) : [relative(root, path).replace(/\\/g, "/")];
  });
}

const packageJson = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const allowedProductionDependencies = new Set(["react", "react-dom", "@huggingface/transformers"]);
for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
  if (!allowedProductionDependencies.has(dependency)) fail(`Unapproved production dependency: ${dependency}`);
}

for (const requiredScript of ["dev", "build", "lint", "typecheck", "test", "test:client", "test:worker", "test:e2e", "cost:check", "verify", "deploy", "db:migrate:local", "db:migrate:remote"]) {
  if (!packageJson.scripts?.[requiredScript]) fail(`Missing required script: ${requiredScript}`);
}

const wrangler = read("wrangler.jsonc");
const forbiddenBindings = ["r2_buckets", "kv_namespaces", "durable_objects", "queues", "vectorize", "analytics_engine_datasets", "hyperdrive", "services"];
for (const binding of forbiddenBindings) {
  if (new RegExp(`\\b${binding}\\b`, "i").test(wrangler)) fail(`Forbidden Cloudflare binding in wrangler.jsonc: ${binding}`);
}
if (!/"d1_databases"/.test(wrangler)) fail("D1 binding is required");
if (!/"cpu_ms"\s*:\s*10\b/.test(wrangler)) fail("Workers Free CPU guard must remain at 10ms");
if (!/"subrequests"\s*:\s*10\b/.test(wrangler)) fail("Subrequest guard must remain at 10");
if (!/"CASE_TTL_DAYS"\s*:\s*"90"/.test(wrangler)) fail("Case TTL must remain 90 days or less");

const sourceFiles = [...walk("src/server"), ...walk("src/shared")].filter((path) => /\.(ts|tsx|sql)$/.test(path));
const forbiddenPackages = /from\s+["'](?:express|@nestjs|next|firebase|@supabase|typeorm|prisma|sequelize|mongoose)/;
for (const path of sourceFiles) {
  const contents = read(path);
  if (forbiddenPackages.test(contents)) fail(`Forbidden server or paid-service dependency in ${path}`);
  if (/SELECT\s+\*/i.test(contents)) fail(`SELECT * is forbidden in ${path}`);
  if (/setInterval\s*\(/.test(contents)) fail(`Polling is forbidden in ${path}`);
}

const migration = read("migrations/0001_initial.sql");
for (const table of ["cases", "votes", "reports", "rate_limits", "daily_usage"]) {
  if (!new RegExp(`CREATE TABLE ${table}\\b`).test(migration)) fail(`Missing D1 table: ${table}`);
}
if ((migration.match(/CREATE INDEX/g) ?? []).length < 6) fail("D1 schema must keep the cleanup and lookup indexes");

let trackedFiles: string[] = [];
try {
  trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
} catch {
  fail("Unable to inspect tracked files");
}
for (const path of trackedFiles) {
  const isExample = path === ".env.example" || path === ".dev.vars.example";
  if (!isExample && (/^\.env(?:\.|$)/.test(path) || /^\.dev\.vars(?:\.|$)/.test(path))) fail(`Secret-bearing file must not be tracked: ${path}`);
  if (/\.(?:pem|key)$/.test(path)) fail(`Private key file must not be tracked: ${path}`);
}

const costDoc = read("docs/COST_GUARD.md");
for (const statement of ["100,000 requests/day", "5 million rows read/day", "100,000 rows written/day", "5 GB total"]) {
  if (!costDoc.includes(statement)) fail(`Cost documentation is missing the verified Free limit: ${statement}`);
}

if (errors.length > 0) {
  console.error("Cost guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Cost guard passed: D1-only storage, approved local AI dependencies, Free limits, and secret boundaries are intact.");
}
