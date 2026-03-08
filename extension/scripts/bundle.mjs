import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
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
};

// Background service worker — maps to dist/background.js
const bgEntry = {
  ...shared,
  entryPoints: [resolve(root, "src/background.ts")],
  outdir: dist,
};

// Content script — maps to dist/content/index.js
const contentEntry = {
  ...shared,
  entryPoints: {
    'index': resolve(root, "src/content/index.ts")
  },
  outdir: resolve(dist, "content"),
};

// Copy static assets (manifest, CSS, icons)
function copyStatic() {
  mkdirSync(resolve(dist, "content"), { recursive: true });
  mkdirSync(resolve(dist, "assets"), { recursive: true });
  cpSync(resolve(root, "manifest.json"), resolve(dist, "manifest.json"));
  cpSync(
    resolve(root, "src/content/styles.css"),
    resolve(dist, "content/styles.css")
  );
  cpSync(resolve(root, "assets"), resolve(dist, "assets"), { recursive: true });
  console.log("[mailmood] Static assets copied.");
}

if (isWatch) {
  const [bgCtx, contentCtx] = await Promise.all([
    context(bgEntry),
    context(contentCtx),
  ]);
  copyStatic();
  await Promise.all([bgCtx.watch(), contentCtx.watch()]);
  console.log("[mailmood] Watching for changes...");
} else {
  // Clean dist before build
  rmSync(dist, { recursive: true, force: true });
  await Promise.all([build(bgEntry), build(contentEntry)]);
  copyStatic();
  console.log("[mailmood] Build complete.");
}