import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { BellRing, CreditCard, FileText, LayoutDashboard, Megaphone, Settings, Shield, Users, WalletCards } from "lucide-react";
import type { Role, Screen } from "../types/crm";

export interface NavigationItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
}

export const NAVIGATION: Record<Role, NavigationItem[]> = {
  admin: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "requests", label: "Requests", icon: FileText },
    { id: "clients", label: "Clients", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "ad-accounts", label: "Ad Accounts", icon: WalletCards },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "users", label: "Users", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ],
  team: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "requests", label: "Requests", icon: FileText },
    { id: "clients", label: "Clients", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "ad-accounts", label: "Ad Accounts", icon: WalletCards },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "users", label: "Users", icon: Shield },
  ],
  client: [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "requests", label: "Requests", icon: FileText },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "updates", label: "Updates", icon: BellRing },
    { id: "users", label: "Moderators", icon: Shield },
  ],
  moderator: [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "requests", label: "Requests", icon: FileText },
    { id: "updates", label: "Updates", icon: BellRing },
    { id: "users", label: "Members", icon: Shield },
  ],
};

export function useNavigationController(role: Role) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = NAVIGATION[role];
  const requested = location.pathname.replace(/^\//, "") as Screen;
  const screen = items.some((item) => item.id === requested) ? requested : "dashboard";

  useEffect(() => {
    if (location.pathname !== `/${screen}`) navigate(`/${screen}`, { replace: true });
  }, [location.pathname, navigate, screen]);

  const title = useMemo(() => items.find((item) => item.id === screen)?.label || "Dashboard", [items, screen]);
  return { items, screen, title, setScreen: (next: Screen) => navigate(`/${next}`) };
}
