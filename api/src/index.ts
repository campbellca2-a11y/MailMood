// Copyright (c) 2026 Bill Campbell. All rights reserved.
// MailMood — https://github.com/campbellca2-a11y/MailMood
// Licensed under the Business Source License 1.1. See LICENSE for details.
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
