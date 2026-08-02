import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const PREFIX = "enc:v1:";

function key() {
  return env.facebookTokenEncryptionKey;
}

export function encryptFacebookToken(token) {
  const encryptionKey = key();
  if (!token || !encryptionKey) return token;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptFacebookToken(stored) {
  if (!stored || !stored.startsWith(PREFIX)) return stored || "";
  const encryptionKey = key();
  if (!encryptionKey) throw new Error("FACEBOOK_TOKEN_ENCRYPTION_KEY is required to read encrypted Facebook credentials");
  const [ivValue, tagValue, ciphertextValue] = stored.slice(PREFIX.length).split(":");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Encrypted Facebook credential is malformed");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64")), decipher.final()]).toString("utf8");
}
