import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, CreditCard, FileText, LayoutDashboard, Megaphone, ReceiptText, Settings, Users } from "lucide-react";
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
} satisfies Partial<Record<Screen, NavigationItem>>;

export const NAVIGATION: Record<Role, NavigationItem[]> = {
  owner: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.adaccounts, primaryItems.billing, primaryItems.payment_details, primaryItems.settings],
  admin: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.adaccounts, primaryItems.billing, primaryItems.payment_details, primaryItems.settings],
  team: [primaryItems.dashboard, primaryItems.clients, primaryItems.requests, primaryItems.campaigns, primaryItems.billing, primaryItems.payment_details],
  client: [primaryItems.dashboard, primaryItems.requests, primaryItems.campaigns, primaryItems.billing, primaryItems.payment_details],
  moderator: [primaryItems.dashboard, primaryItems.requests],
};

const ROLE_SCREENS: Record<Role, Screen[]> = {
  owner: ["dashboard", "settings", "clients", "requests", "campaigns", "adaccounts", "billing", "payment_details", "planner", "updates", "users"],
  admin: ["dashboard", "settings", "clients", "requests", "campaigns", "adaccounts", "billing", "payment_details", "planner", "updates", "users"],
  team: ["dashboard", "clients", "requests", "campaigns", "billing", "payment_details", "planner", "updates", "users"],
  client: ["dashboard", "clients", "requests", "campaigns", "billing", "payment_details", "planner", "updates", "users"],
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
  clients: "Clients",
  planner: "Planner",
  updates: "Updates",
  users: "Users",
};

export function useNavigationController(role: Role) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = NAVIGATION[role];
  const requested = location.pathname.split("/").filter(Boolean)[0] as Screen | undefined;
  const screen = requested && ROLE_SCREENS[role].includes(requested) ? requested : "dashboard";

  useEffect(() => {
    if (!requested || !ROLE_SCREENS[role].includes(requested)) navigate(`/${screen}`, { replace: true });
  }, [navigate, requested, role, screen]);

  const title = useMemo(() => SCREEN_TITLES[screen], [screen]);
  return { items, screen, title, setScreen: (next: Screen) => navigate(`/${next}`) };
}
