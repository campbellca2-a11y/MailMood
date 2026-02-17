import cors from "cors";
import express from "express";
import helmet from "helmet";
import { analyzeTone } from "./analyzer.js";
import { rewriteDraft } from "./rewrite.js";
import type { AnalyzeRequest, RewriteRequest } from "./types.js";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "mailmood-api",
      privacy: "process-and-forget",
      timestamp: new Date().toISOString()
    });
  });

  app.post("/analyze", (req, res) => {
    const body = req.body as Partial<AnalyzeRequest>;
    const text = (body.text ?? "").trim();

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const analysis = analyzeTone(text);
    res.json(analysis);
  });

  app.post("/rewrite", (req, res) => {
    const body = req.body as Partial<RewriteRequest>;
    const text = (body.text ?? "").trim();

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const rewrite = rewriteDraft(text, body.targetTone);
    res.json(rewrite);
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "internal_error", message: err.message });
  });

  return app;
}
