import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const dist = resolve(root, "dist");

mkdirSync(resolve(dist, "content"), { recursive: true });
cpSync(resolve(root, "manifest.json"), resolve(dist, "manifest.json"));
cpSync(resolve(root, "src/content/styles.css"), resolve(dist, "content/styles.css"));
