import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "src/index.html"), "utf8");
const css = await readFile(resolve(root, "src/styles.css"), "utf8");
const client = await readFile(resolve(root, "src/app.js"), "utf8");
const runtime = await readFile(resolve(root, "server/worker-runtime.js"), "utf8");
const hosting = JSON.parse(await readFile(resolve(root, ".openai/hosting.json"), "utf8"));

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(resolve(root, "dist/server"), { recursive: true });
await mkdir(resolve(root, "dist/.openai"), { recursive: true });

const worker = [
  `const INDEX_HTML = ${JSON.stringify(html)};`,
  `const STYLES_CSS = ${JSON.stringify(css)};`,
  `const CLIENT_JS = ${JSON.stringify(client)};`,
  runtime,
].join("\n\n");

await writeFile(resolve(root, "dist/server/index.js"), worker);
await writeFile(resolve(root, "dist/server/wrangler.json"), JSON.stringify({
  main: "index.js",
  compatibility_date: "2026-09-01",
  compatibility_flags: ["nodejs_compat"],
  triggers: { crons: ["* * * * *"] },
}, null, 2));
await writeFile(resolve(root, "dist/.openai/hosting.json"), JSON.stringify(hosting, null, 2) + "\n");
await cp(resolve(root, "drizzle"), resolve(root, "dist/.openai/drizzle"), { recursive: true });

console.log(`Built Moodwire Worker (${worker.length.toLocaleString()} bytes)`);
