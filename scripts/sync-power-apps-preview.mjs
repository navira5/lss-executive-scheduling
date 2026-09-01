import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function syncPreview(name) {
  const source = resolve(root, name);
  const target = resolve(root, "public", name);

  await mkdir(target, { recursive: true });
  const html = await readFile(resolve(source, "index.html"), "utf8");
  await writeFile(
    resolve(target, "index.html"),
    html
      .replaceAll('href="/styles.css"', 'href="styles.css"')
      .replaceAll('src="/app.js"', 'src="app.js"'),
    "utf8",
  );
  await Promise.all([
    copyFile(resolve(source, "styles.css"), resolve(target, "styles.css")),
    copyFile(resolve(source, "app.js"), resolve(target, "app.js")),
  ]);
}

await Promise.all([
  syncPreview("power-apps-preview"),
  syncPreview("native-power-apps-preview"),
]);
