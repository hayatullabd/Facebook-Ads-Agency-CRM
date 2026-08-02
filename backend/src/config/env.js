import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : "development-only-jwt-secret-change-me");
const mongodbUri = process.env.MONGODB_URI;
const configuredClientUrl = process.env.CLIENT_URL;
const clientUrl = configuredClientUrl || (isProduction ? "" : "http://localhost:5173");
const placeholderSecretPattern = /^(change|replace|your|development)[-_ ]?(this[-_ ]?)?(only[-_ ]?)?(secret|jwt)/i;

function parseBoundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function parseClientOrigins(value) {
  const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CLIENT_URL must contain valid http/https origins");
    }

    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== "/")) {
      throw new Error("CLIENT_URL entries must be http/https origins without paths, credentials, query strings, or fragments");
    }
  }
  return origins.map((origin) => origin.replace(/\/$/, ""));
}

if (!mongodbUri) throw new Error("MONGODB_URI is required");
if (!jwtSecret || (isProduction && (jwtSecret.length < 32 || placeholderSecretPattern.test(jwtSecret)))) {
  throw new Error("JWT_SECRET must be a non-placeholder secret of at least 32 characters in production");
}
if (isProduction && !configuredClientUrl) throw new Error("CLIENT_URL is required in production");

const clientUrls = parseClientOrigins(clientUrl);
if (isProduction && clientUrls.length === 0) throw new Error("CLIENT_URL must include at least one origin in production");

const facebookGraphVersion = process.env.FACEBOOK_GRAPH_VERSION?.trim() || "v20.0";
if (!/^v\d+\.\d+$/.test(facebookGraphVersion)) throw new Error("FACEBOOK_GRAPH_VERSION must use the format v20.0");

export const env = {
  nodeEnv,
  isProduction,
  port: parseBoundedInteger("PORT", 5000, 1, 65535),
  clientUrl,
  clientUrls,
  jwtSecret,
  mongodbUri,
  trustProxy: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1",
  facebookRequestTimeoutMs: parseBoundedInteger("FACEBOOK_REQUEST_TIMEOUT_MS", 15000, 1000, 120000),
  facebookGraphVersion,
  facebookSyncMaxPages: parseBoundedInteger("FACEBOOK_SYNC_MAX_PAGES", 50, 1, 200),
  facebookSyncConcurrency: parseBoundedInteger("FACEBOOK_SYNC_CONCURRENCY", 2, 1, 5),
  shutdownTimeoutMs: parseBoundedInteger("SHUTDOWN_TIMEOUT_MS", 10000, 1000, 120000),
};
