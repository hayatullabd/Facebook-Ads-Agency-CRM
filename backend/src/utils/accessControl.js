export const FEATURE_KEYS = {
  dashboard: "dashboard",
  clients: "clients",
  requests: "requests",
  campaigns: "campaigns",
  adaccounts: "adaccounts",
  billing: "billing",
  payment_details: "payment_details",
  planner: "planner",
  updates: "updates",
  users: "users",
  settings: "settings",
};

export const ROLE_FEATURES = {
  owner: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.adaccounts, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users, FEATURE_KEYS.settings],
  admin: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.adaccounts, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users, FEATURE_KEYS.settings],
  team: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users],
  client: [FEATURE_KEYS.dashboard, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.updates],
  moderator: [FEATURE_KEYS.dashboard, FEATURE_KEYS.requests, FEATURE_KEYS.updates],
};

export const canUseFeature = (role, feature) => Boolean(ROLE_FEATURES[role]?.includes(feature));
