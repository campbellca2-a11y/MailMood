import { build, context } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");
const isWatch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: false,
  minify: false,
  outdir: dist,
};

// Background service worker — single self-contained bundle
const bgEntry = {
  ...shared,
  entryPoints: [resolve(root, "src/background.ts")],
  outdir: dist,
};

// Content script — single self-contained bundle
const contentEntry = {
  ...shared,
  entryPoints: [resolve(root, "src/content/index.ts")],
  outdir: resolve(dist, "content"),
};

// Copy static assets (manifest, CSS)
function copyStatic() {
  mkdirSync(resolve(dist, "content"), { recursive: true });
  cpSync(resolve(root, "manifest.json"), resolve(dist, "manifest.json"));
  cpSync(
    resolve(root, "src/content/styles.css"),
    resolve(dist, "content/styles.css")
  );
  console.log("[mailmood] Static assets copied.");
}

if (isWatch) {
  const [bgCtx, contentCtx] = await Promise.all([
    context(bgEntry),
    context(contentEntry),
  ]);
  copyStatic();
  await Promise.all([bgCtx.watch(), contentCtx.watch()]);
  console.log("[mailmood] Watching for changes...");
} else {
  await Promise.all([build(bgEntry), build(contentEntry)]);
  copyStatic();
  console.log("[mailmood] Build complete.");
}
