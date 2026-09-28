import { gzip } from "node:zlib";

export const compressionMiddleware = (req, res, next) => {
  const accept = req.headers["accept-encoding"] || "";
  if (!/\bgzip\b/.test(accept)) return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    let payload;
    try {
      payload = Buffer.from(JSON.stringify(body));
    } catch {
      return originalJson(body);
    }
    if (payload.length < 1024) return originalJson(body);
    gzip(payload, (error, zipped) => {
      if (error || res.headersSent) {
        if (!res.headersSent) originalJson(body);
        return;
      }
      res.set("Content-Encoding", "gzip");
      res.set("Content-Type", "application/json; charset=utf-8");
      res.set("Vary", "Accept-Encoding");
      res.send(zipped);
    });
    return res;
  };
  next();
};
