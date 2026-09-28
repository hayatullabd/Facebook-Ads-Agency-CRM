import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, CreditCard, FileText, LayoutDashboard, Megaphone, ReceiptText, Settings, Users, Repeat } from "lucide-react";
import type { Role, Screen } from "../types/crm";

export interface NavigationItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
}

const primaryItems = {
  dashboard: { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  settings: { id: "settings", label: "System Profile", icon: Settings },
  clients: { id: "clients", label: "Clients", icon: Users },
  requests: { id: "requests", label: "Ad Requests", icon: FileText },
  campaigns: { id: "campaigns", label: "Live Campaigns", icon: Megaphone },
  adaccounts: { id: "adaccounts", label: "Ad Accounts", icon: BriefcaseBusiness },
  billing: { id: "billing", label: "Payment Dues", icon: CreditCard },
  payment_details: { id: "payment_details", label: "Payment Details", icon: ReceiptText },
  subscriptions: { id: "subscriptions", label: "Subscriptions", icon: Repeat },
} satisfies Partial<Record<Screen, NavigationItem>>;

export const NAVIGATION: Record<Role, NavigationItem[]> = {
  owner: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.adaccounts, primaryItems.billing, primaryItems.payment_details, primaryItems.subscriptions, primaryItems.settings],
  admin: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.adaccounts, primaryItems.billing, primaryItems.payment_details, primaryItems.subscriptions, primaryItems.settings],
  team: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.billing, primaryItems.payment_details, primaryItems.subscriptions],
  client: [primaryItems.dashboard, primaryItems.requests, primaryItems.campaigns, primaryItems.billing, primaryItems.payment_details],
  moderator: [primaryItems.dashboard, primaryItems.requests],
};

const ROLE_SCREENS: Record<Role, Screen[]> = {
  owner: ["dashboard", "settings", "clients", "requests", "campaigns", "adaccounts", "billing", "payment_details", "subscriptions", "planner", "updates", "users"],
  admin: ["dashboard", "settings", "clients", "requests", "campaigns", "adaccounts", "billing", "payment_details", "subscriptions", "planner", "updates", "users"],
  team: ["dashboard", "clients", "requests", "campaigns", "billing", "payment_details", "subscriptions", "planner", "updates", "users"],
  client: ["dashboard", "requests", "campaigns", "billing", "payment_details", "planner", "updates", "users"],
  moderator: ["dashboard", "requests", "updates"],
};

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: "Dashboard",
  settings: "System Profile",
  requests: "Ad Requests",
  campaigns: "Live Campaigns",
  adaccounts: "Ad Accounts",
  billing: "Payment Dues",
  payment_details: "Payment Details",
  subscriptions: "Subscriptions",
  clients: "Clients",
  planner: "Planner",
  updates: "Updates",
  users: "Users",
};

const platformItems = [primaryItems.dashboard, primaryItems.subscriptions, primaryItems.settings];
const platformScreens: Screen[] = ["dashboard", "subscriptions", "settings"];

export function useNavigationController(role: Role, platformRole?: string, features?: string[], featuresConfigured?: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPlatformOwner = platformRole === "admin";
  const featureKey = features?.join(",") || "";
  const items = useMemo(() => {
    if (isPlatformOwner) return platformItems;
    if (role === "team" && featuresConfigured) {
      const granted = new Set(["dashboard", ...featureKey.split(",").filter(Boolean)]);
      return NAVIGATION.owner.filter((item) => granted.has(item.id));
    }
    return NAVIGATION[role];
  }, [featureKey, featuresConfigured, isPlatformOwner, role]);
  const allowed = useMemo(() => {
    if (isPlatformOwner) return platformScreens;
    if (role === "team" && featuresConfigured) {
      const granted = new Set(["dashboard", ...featureKey.split(",").filter(Boolean)]);
      return ROLE_SCREENS.owner.filter((screen) => granted.has(screen));
    }
    return ROLE_SCREENS[role];
  }, [featureKey, featuresConfigured, isPlatformOwner, role]);
  const requested = location.pathname.split("/").filter(Boolean)[0] as Screen | undefined;
  const screen = requested && allowed.includes(requested) ? requested : "dashboard";

  useEffect(() => {
    if (!requested || !allowed.includes(requested)) navigate(`/${screen}`, { replace: true });
  }, [allowed, navigate, requested, screen]);

  const title = useMemo(() => SCREEN_TITLES[screen], [screen]);
  return { items, screen, title, setScreen: (next: Screen) => navigate(`/${next}`) };
}
