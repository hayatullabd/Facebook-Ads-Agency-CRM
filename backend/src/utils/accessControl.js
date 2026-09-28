export const FEATURE_KEYS = {
  dashboard: "dashboard",
  clients: "clients",
  requests: "requests",
  campaigns: "campaigns",
  adaccounts: "adaccounts",
  billing: "billing",
  payment_details: "payment_details",
  subscriptions: "subscriptions",
  planner: "planner",
  updates: "updates",
  users: "users",
  settings: "settings",
};

export const TEAM_ASSIGNABLE_FEATURES = [
  FEATURE_KEYS.clients,
  FEATURE_KEYS.requests,
  FEATURE_KEYS.campaigns,
  FEATURE_KEYS.adaccounts,
  FEATURE_KEYS.billing,
  FEATURE_KEYS.payment_details,
  FEATURE_KEYS.subscriptions,
];

export const sanitizeTeamFeatures = (features) => {
  const picked = Array.isArray(features)
    ? features.filter((item) => TEAM_ASSIGNABLE_FEATURES.includes(item))
    : [];
  return [FEATURE_KEYS.dashboard, ...new Set(picked)];
};

export const resolveUserFeatures = (user) => {
  if (!user) return [];
  if (user.role === "team" && user.featuresConfigured) return sanitizeTeamFeatures(user.features);
  return ROLE_FEATURES[user.role] || [];
};

export const ROLE_FEATURES = {
  owner: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.adaccounts, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.subscriptions, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users, FEATURE_KEYS.settings],
  admin: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.adaccounts, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.subscriptions, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users, FEATURE_KEYS.settings],
  team: [FEATURE_KEYS.dashboard, FEATURE_KEYS.clients, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.subscriptions, FEATURE_KEYS.planner, FEATURE_KEYS.updates, FEATURE_KEYS.users],
  client: [FEATURE_KEYS.dashboard, FEATURE_KEYS.requests, FEATURE_KEYS.campaigns, FEATURE_KEYS.billing, FEATURE_KEYS.payment_details, FEATURE_KEYS.updates, FEATURE_KEYS.users],
  moderator: [FEATURE_KEYS.dashboard, FEATURE_KEYS.requests, FEATURE_KEYS.updates],
};
