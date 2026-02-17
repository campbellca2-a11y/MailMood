import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && thisFile === process.argv[1]) {
  app.listen(port, () => {
    console.log(`MailMood API listening on http://localhost:${port}`);
  });
}
