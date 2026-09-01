import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "power-apps-preview");
const target = resolve(root, "public", "power-apps-preview");

await mkdir(target, { recursive: true });
const html = await readFile(resolve(source, "index.html"), "utf8");
await writeFile(
  resolve(target, "index.html"),
  html
    .replace('href="/styles.css"', 'href="styles.css"')
    .replace('src="/app.js"', 'src="app.js"'),
  "utf8",
);
await Promise.all([
  copyFile(resolve(source, "styles.css"), resolve(target, "styles.css")),
  copyFile(resolve(source, "app.js"), resolve(target, "app.js")),
]);
