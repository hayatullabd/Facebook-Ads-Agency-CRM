import crypto from "node:crypto";
import { env } from "../config/env.js";

export const TOKEN_PREFIX = "enc:v1:";

let cachedKey;

function encryptionKey() {
  if (!cachedKey) cachedKey = crypto.scryptSync(env.jwtSecret, "adflow-facebook-token-v1", 32);
  return cachedKey;
}

export function sealToken(plain) {
  const value = String(plain ?? "");
  if (!value || value.startsWith(TOKEN_PREFIX)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return TOKEN_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openToken(stored) {
  const value = String(stored ?? "");
  if (!value.startsWith(TOKEN_PREFIX)) return value;
  try {
    const raw = Buffer.from(value.slice(TOKEN_PREFIX.length), "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Facebook token could not be read. Save the token again.");
  }
}
