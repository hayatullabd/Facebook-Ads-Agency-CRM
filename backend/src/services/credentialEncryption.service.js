import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
const key = env.encryptionKey ? Buffer.from(env.encryptionKey, "hex") : createHash("sha256").update(env.jwtSecret).digest();
export const encryptCredential = value => {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ciphertext.toString("base64")}`;
};
export const decryptCredential = value => {
  if (!value) return "";
  if (!value.startsWith("enc:v1:")) {
    if (env.isProduction) throw new Error("Unencrypted credential requires migration");
    return value;
  }
  const [, , iv, tag, ciphertext] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
};
