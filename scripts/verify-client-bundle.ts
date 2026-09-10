import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const clientDirectory = join(process.cwd(), "dist", "client");
const inspectedExtensions = new Set([".html", ".js", ".css", ".json", ".map"]);

const forbiddenText = [
  "OPENAI_API_KEY",
  "PEXELS_API_KEY",
  "PUBLIC_FORM_RATE_LIMIT_SECRET",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "hymlcgucxgdzencbketz.supabase.co",
] as const;

const credentialPatterns = [
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bwhsec_[A-Za-z0-9]{16,}\b/g,
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
] as const;

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : Promise.resolve([path]);
    }),
  );
  return files.flat();
}

const files = (await listFiles(clientDirectory)).filter((file) =>
  inspectedExtensions.has(extname(file)),
);
const violations: string[] = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const marker of forbiddenText) {
    if (content.includes(marker)) violations.push(`${file}: contains forbidden marker ${marker}`);
  }
  for (const pattern of credentialPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) violations.push(`${file}: contains a server credential pattern`);
  }
}

if (violations.length > 0) {
  console.error("Client bundle verification failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Client bundle verification passed (${files.length} files inspected).`);
