import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
export function serveFrontend(app) {
  const directory = fileURLToPath(new URL("../../../frontend/dist/", import.meta.url));
  if (!existsSync(path.join(directory, "index.html"))) throw new Error("Frontend build missing. Run npm run build in frontend first.");
  app.use((req, res, next) => {
    if (/^\/(api|health)(\/|$)/.test(req.path)) return next();
    res.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
    next();
  });
  app.use("/assets", express.static(path.join(directory, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }));
  app.use(express.static(directory, { index: false, maxAge: 0 }));
  app.get("*", (req, res, next) => {
    if (/^\/(api|health)(\/|$)/.test(req.path) || path.extname(req.path) || !req.accepts("html")) return next();
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(directory, "index.html"));
  });
}
