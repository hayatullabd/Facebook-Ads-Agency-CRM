import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, Megaphone, CreditCard, Settings,
  Plus, ChevronDown, Search, Menu, X, Shield, CheckCircle,
  AlertCircle, Edit2, Link as LinkIcon, UploadCloud, Calendar,
  MessageSquare, BarChart2, Download, Receipt, Briefcase,
  UserCircle2, CheckCircle2, Eye, LayoutGrid,
  Users, Building2, Crown, UserCog, User, Lock, ChevronRight,
  Sliders, Globe, ShieldCheck, Minus,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";

// ─── Design System ───────────────────────────────────────────────────────────

const Card = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-white border border-gray-300 rounded-sm shadow-sm ${className}`} {...props}>{children}</div>
);

const TabHeader = ({ title }: { title: string }) => (
  <div className="bg-[#1e40af] text-white px-3 py-1 inline-block rounded-t-sm font-bold text-sm">{title}</div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#eef2f6] text-[#1e40af] px-4 py-2 font-bold text-sm border border-gray-300 border-b-0 flex items-center justify-between">
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "" }: {
  children: React.ReactNode; variant?: string; className?: string;
}) => {
  const variants: Record<string, string> = {
    default: "bg-gray-500 text-white",
    blue: "bg-[#1e40af] text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-gray-900",
    red: "bg-red-600 text-white",
    violet: "bg-violet-600 text-white",
    gray: "bg-gray-200 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${variants[variant] ?? variants.default} ${className}`}>
      {children}
    </span>
  );
};

const Btn = ({ children, variant = "primary", size = "default", className = "", ...props }: {
  children: React.ReactNode; variant?: string; size?: string; className?: string; [k: string]: any;
}) => {
  const base = "inline-flex items-center justify-center rounded text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-[#1e40af] text-white hover:bg-[#1e3a8a] border border-[#1e40af]",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300",
    ghost: "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-7 px-3 text-xs",
    icon: "h-9 w-9",
  };
  return <button className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.default} ${className}`} {...props}>{children}</button>;
};

const Input = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`flex h-9 w-full rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus:border-[#1e40af] ${className}`} {...props} />
);

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-xs font-bold text-[#1e40af] mb-1 block ${className}`}>{children}</label>
);

const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded shadow-lg ${type === "error" ? "bg-red-50 border-l-4 border-red-500 text-red-800" : "bg-green-50 border-l-4 border-green-500 text-green-800"}`}>
      {type === "error" ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-green-500" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-3 hover:opacity-75"><X size={16} /></button>
    </div>
  );
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CLIENTS = [
  { _id: "c1", name: "Urban Threads Co.", contactName: "John Doe", email: "contact@urbanthreads.com", status: "active", budget: 45000, spend: 38400, color: "#1e40af" },
  { _id: "c2", name: "Dhaka Eats", contactName: "Sarah Ahmed", email: "sarah@dhakaeats.com", status: "active", budget: 20000, spend: 18200, color: "#0891b2" },
  { _id: "c3", name: "Shajgoj Beauty", contactName: "Priya Roy", email: "priya@shajgoj.com", status: "active", budget: 35000, spend: 22100, color: "#7c3aed" },
  { _id: "c4", name: "TechPark BD", contactName: "Rafi Hossain", email: "rafi@techpark.bd", status: "active", budget: 60000, spend: 44000, color: "#059669" },
  { _id: "c5", name: "GreenLeaf Organics", contactName: "Mita Chowdhury", email: "mita@greenleaf.com", status: "inactive", budget: 50000, spend: 12000, color: "#d97706" },
];

const REQUESTS = [
  { _id: "r1", requestNumber: "REQ-001", client: CLIENTS[0], pageName: "Urban Threads — Winter Sale", platform: "FB+IG", objective: "WhatsApp", budget: 20000, durationDays: 30, status: "Live", comments: 3, createdAt: "2026-08-12" },
  { _id: "r2", requestNumber: "REQ-002", client: CLIENTS[1], pageName: "Dhaka Eats — Ramadan Offers", platform: "FB", objective: "Post Engagement", budget: 15000, durationDays: 14, status: "Approved", comments: 0, createdAt: "2026-08-14" },
  { _id: "r3", requestNumber: "REQ-003", client: CLIENTS[2], pageName: "Shajgoj — Glow Campaign", platform: "IG", objective: "Leads", budget: 25000, durationDays: 21, status: "Under Review", comments: 1, createdAt: "2026-08-15" },
  { _id: "r4", requestNumber: "REQ-004", client: CLIENTS[3], pageName: "TechPark — B2B Growth", platform: "FB", objective: "Conversions", budget: 40000, durationDays: 45, status: "Live", comments: 5, createdAt: "2026-08-01" },
  { _id: "r5", requestNumber: "REQ-005", client: CLIENTS[4], pageName: "GreenLeaf — Eco Awareness", platform: "FB+IG", objective: "Post Engagement", budget: 12000, durationDays: 10, status: "Under Review", comments: 0, createdAt: "2026-08-20" },
  { _id: "r6", requestNumber: "REQ-006", client: CLIENTS[0], pageName: "Urban Threads — Brand Reach", platform: "IG", objective: "Post Engagement", budget: 8000, durationDays: 7, status: "Approved", comments: 2, createdAt: "2026-08-22" },
];

const CAMPAIGNS = [
  { _id: "k1", name: "Winter Sale — Conversions", client: CLIENTS[0], adRequestId: "r1", status: "ACTIVE", platform: "facebook", spend: 38400, impressions: 1280000, clicks: 42300, results: 1840, ctr: 3.30, cpr: 20.87, budget: 45000, leads: 45, cpl: 853, startDate: "2024-11-01", ends: "Ongoing" },
  { _id: "k2", name: "Ramadan Food Promo", client: CLIENTS[1], adRequestId: "r2", status: "PAUSED", platform: "facebook", spend: 18200, impressions: 620000, clicks: 11160, results: 420, ctr: 1.80, cpr: 43.33, budget: 20000, leads: null, cpl: null, startDate: "2024-10-15", ends: "2026-09-01" },
  { _id: "k3", name: "Glow — Lead Generation", client: CLIENTS[2], adRequestId: null, status: "ACTIVE", platform: "instagram", spend: 22100, impressions: 890000, clicks: 26700, results: 1120, ctr: 3.00, cpr: 19.73, budget: 35000, leads: 210, cpl: 105, startDate: "2024-09-01", ends: "Ongoing" },
  { _id: "k4", name: "B2B WhatsApp Drive", client: CLIENTS[3], adRequestId: "r4", status: "ACTIVE", platform: "facebook", spend: 44000, impressions: 320000, clicks: 9600, results: 380, ctr: 3.00, cpr: 115.79, budget: 60000, leads: 95, cpl: 463, startDate: "2024-08-01", ends: "2026-09-30" },
  { _id: "k5", name: "Nexus Accessories Retargeting", client: CLIENTS[0], adRequestId: null, status: "PAUSED", platform: "facebook", spend: 12000, impressions: 180000, clicks: 5400, results: 198, ctr: 3.00, cpr: 60.61, budget: 15000, leads: null, cpl: null, startDate: "2024-12-01", ends: "2026-10-01" },
];

const FB_AD_ACCOUNTS = [
  { _id: "act_1", accountId: "act_112233445", name: "Urban Threads Official", currency: "BDT", amountSpent: 50400, balance: 4600, status: "ACTIVE", campaigns: ["k1", "k5"] },
  { _id: "act_2", accountId: "act_223344556", name: "Dhaka Eats Promo", currency: "BDT", amountSpent: 18200, balance: 1800, status: "ACTIVE", campaigns: ["k2"] },
  { _id: "act_3", accountId: "act_334455667", name: "Shajgoj — Beauty Account", currency: "BDT", amountSpent: 22100, balance: 12900, status: "ACTIVE", campaigns: ["k3"] },
  { _id: "act_4", accountId: "act_445566778", name: "TechPark B2B Growth", currency: "BDT", amountSpent: 44000, balance: 16000, status: "ACTIVE", campaigns: ["k4"] },
  { _id: "act_5", accountId: "act_556677889", name: "Agency Shared — GreenLeaf", currency: "BDT", amountSpent: 12000, balance: 38000, status: "ACTIVE", campaigns: [] },
];

const BILLING_ROWS = [
  { period: "July 2026", adSpend: 120000, agencyFee: 15000, totalPayable: 135000, paidAmount: 135000, totalDue: 0, status: "Cleared" },
  { period: "August 2026", adSpend: 20000, agencyFee: 5000, totalPayable: 25000, paidAmount: 0, totalDue: 25000, status: "Overdue" },
];

const LEDGER_ROWS = [
  { date: "2026-08-01", desc: "Opening Balance", ref: "—", debit: null, credit: null, balance: 0 },
  { date: "2026-08-05", desc: "Advance Deposit via Bank", ref: "City Bank / TR2922", debit: null, credit: 50000, balance: 50000 },
  { date: "2026-08-10", desc: "Facebook Ad Spend (act_112233445)", ref: "Meta Auto Deduct", debit: 15000, credit: null, balance: 35000 },
  { date: "2026-08-15", desc: "Agency Retainer Fee", ref: "Service Charge", debit: 10000, credit: null, balance: 25000 },
  { date: "2026-08-20", desc: "Deposit via bKash", ref: "bKash (Bill Pay) 2922", debit: null, credit: 21200, balance: 46200 },
];

const SPEND_TREND = [
  { name: "1 Aug", spend: 400 }, { name: "5 Aug", spend: 600 }, { name: "10 Aug", spend: 550 },
  { name: "15 Aug", spend: 850 }, { name: "20 Aug", spend: 780 }, { name: "25 Aug", spend: 1020 },
];
const FUNNEL_DATA = [
  { name: "Reach", value: 45000, color: "#1e40af" },
  { name: "Clicks", value: 12500, color: "#3b82f6" },
  { name: "Leads", value: 3200, color: "#60a5fa" },
  { name: "Sales", value: 450, color: "#93c5fd" },
];

const MOCK_AGENCIES_DATA = [
  { _id: "ag1", name: "AdFlow Pro Management", owner: "Rahim Uddin", email: "admin@adflow.com", phone: "+880 1700 000001", website: "adflowpro.com", plan: "Enterprise", status: "active", clients: 5, campaigns: 5, adAccounts: 5, monthlySpend: 134700, totalSpend: 812000, joinedDate: "2025-01-01", color: "#1e40af", agencyId: "AG-2025-001", billingCycle: "Monthly", contractEnds: "2026-12-31" },
  { _id: "ag2", name: "DigitalBuzz Agency", owner: "Nasrin Akter", email: "nasrin@digitalbuzz.com", phone: "+880 1711 000002", website: "digitalbuzz.com", plan: "Pro", status: "active", clients: 3, campaigns: 8, adAccounts: 3, monthlySpend: 87400, totalSpend: 348200, joinedDate: "2025-03-15", color: "#0891b2", agencyId: "AG-2025-002", billingCycle: "Monthly", contractEnds: "2026-09-30" },
  { _id: "ag3", name: "MediaPulse BD", owner: "Tanvir Ahmed", email: "tanvir@mediapulse.com", phone: "+880 1722 000003", website: "mediapulse.com.bd", plan: "Starter", status: "active", clients: 2, campaigns: 4, adAccounts: 2, monthlySpend: 42000, totalSpend: 126000, joinedDate: "2025-06-01", color: "#059669", agencyId: "AG-2025-003", billingCycle: "Quarterly", contractEnds: "2026-06-30" },
  { _id: "ag4", name: "ClickCraft Solutions", owner: "Rabeya Khanam", email: "rabeya@clickcraft.io", phone: "+880 1733 000004", website: "clickcraft.io", plan: "Pro", status: "inactive", clients: 4, campaigns: 0, adAccounts: 4, monthlySpend: 0, totalSpend: 210000, joinedDate: "2025-04-20", color: "#7c3aed", agencyId: "AG-2025-004", billingCycle: "Monthly", contractEnds: "2025-12-31" },
  { _id: "ag5", name: "GrowthHive Agency", owner: "Sabbir Islam", email: "sabbir@growthhive.com", phone: "+880 1744 000005", website: "growthhive.com", plan: "Starter", status: "active", clients: 1, campaigns: 2, adAccounts: 1, monthlySpend: 18200, totalSpend: 54600, joinedDate: "2025-08-10", color: "#d97706", agencyId: "AG-2025-005", billingCycle: "Monthly", contractEnds: "2026-08-31" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBDT = (n: number) => `৳ ${n.toLocaleString()}`;
const fmtNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Live: "emerald", ACTIVE: "emerald", active: "emerald",
    Approved: "blue", Cleared: "emerald",
    "Under Review": "amber",
    PAUSED: "gray", paused: "gray",
    Rejected: "red", Overdue: "red", inactive: "gray",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
};

// ─── Views ────────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, icon: Icon, color = "#1e40af" }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color?: string;
}) => (
  <div className="bg-white border border-gray-200 rounded shadow-sm p-4 flex items-start gap-3">
    <div className="size-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

const MiniTable = ({ title, cols, rows }: { title: string; cols: string[]; rows: React.ReactNode[][] }) => (
  <div>
    <SectionHeader><span>{title}</span></SectionHeader>
    <Card className="border-t-0 rounded-t-none overflow-hidden">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-[#1e40af] text-white">
          <tr>{cols.map((c, i) => <th key={i} className={`px-3 py-2 font-bold text-left ${i < cols.length - 1 ? "border-r border-[#1e3a8a]" : ""}`}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-200 hover:bg-gray-50">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 ${ci < row.length - 1 ? "border-r border-gray-200" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

const DashboardView = ({ viewRole }: { viewRole: string }) => {
  const totalSpend    = CAMPAIGNS.reduce((s, k) => s + k.spend, 0);
  const activeCount   = CAMPAIGNS.filter(k => k.status === "ACTIVE").length;
  const pendingReqs   = REQUESTS.filter(r => r.status === "Under Review").length;
  const platformSpend = MOCK_AGENCIES_DATA.reduce((s, a) => s + a.monthlySpend, 0);

  if (viewRole === "SaaS Owner") {
    return (
      <div className="p-5 space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-[#7c3aed] tracking-tight">Platform Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">AdFlow Pro SaaS — August 2026</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Agencies"    value={MOCK_AGENCIES_DATA.length}                                     sub="registered workspaces"  icon={Building2}     color="#7c3aed" />
          <KpiCard label="Active Agencies"   value={MOCK_AGENCIES_DATA.filter(a=>a.status==="active").length}      sub="running this month"     icon={CheckCircle2}  color="#059669" />
          <KpiCard label="Platform Clients"  value={MOCK_AGENCIES_DATA.reduce((s,a)=>s+a.clients,0)}              sub="across all agencies"    icon={Users}         color="#1e40af" />
          <KpiCard label="Platform MTD Spend" value={fmtBDT(platformSpend)}                                       sub="August 2026"            icon={BarChart2}     color="#d97706" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <SectionHeader><span>Platform Ad Spend by Agency (MTD)</span></SectionHeader>
            <Card className="p-4 border-t-0 rounded-t-none">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MOCK_AGENCIES_DATA.filter(a=>a.monthlySpend>0)} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={v => v.split(" ")[0]} />
                  <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={v => `৳${(v/1000).toFixed(0)}K`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: 4, fontSize: 11 }} formatter={(v: any) => [fmtBDT(Number(v)), "MTD Spend"]} />
                  <Bar dataKey="monthlySpend" radius={[3, 3, 0, 0]}>
                    {MOCK_AGENCIES_DATA.filter(a=>a.monthlySpend>0).map((a, i) => <Cell key={i} fill={a.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <SectionHeader><span>Agency Status Summary</span></SectionHeader>
            <Card className="border-t-0 rounded-t-none overflow-hidden">
              <div className="divide-y divide-gray-100">
                {MOCK_AGENCIES_DATA.map(ag => (
                  <div key={ag._id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="size-7 rounded flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: ag.color }}>{ag.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{ag.name}</p>
                      <p className="text-[10px] text-gray-400">{ag.clients} clients · {ag.campaigns} campaigns</p>
                    </div>
                    <StatusBadge status={ag.status} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniTable title="Agency List"
            cols={["Agency", "Plan", "MTD Spend", "Status"]}
            rows={MOCK_AGENCIES_DATA.map(a => [
              <span className="font-bold text-[#7c3aed]">{a.name}</span>,
              <Badge variant={a.plan==="Enterprise"?"blue":a.plan==="Pro"?"violet":"gray"}>{a.plan}</Badge>,
              <span className="font-semibold text-gray-800">{fmtBDT(a.monthlySpend)}</span>,
              <StatusBadge status={a.status} />,
            ])}
          />
          <div>
            <SectionHeader><span>Recent Platform Activity</span></SectionHeader>
            <Card className="border-t-0 rounded-t-none overflow-hidden">
              <div className="divide-y divide-gray-100">
                {[
                  { text: "DigitalBuzz Agency added a new client", time: "2 hours ago", color: "#0891b2" },
                  { text: "AdFlow Pro: Campaign mapping updated", time: "5 hours ago", color: "#1e40af" },
                  { text: "GrowthHive Agency signed up (Starter plan)", time: "1 day ago", color: "#d97706" },
                  { text: "MediaPulse BD renewed contract (Starter)", time: "2 days ago", color: "#059669" },
                  { text: "ClickCraft Solutions plan suspended", time: "3 days ago", color: "#7c3aed" },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <p className="flex-1 text-xs text-gray-700">{a.text}</p>
                    <p className="text-[10px] text-gray-400 whitespace-nowrap">{a.time}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (viewRole === "Client") {
    const myId = "c1";
    const myCampaigns = CAMPAIGNS.filter(k => k.client._id === myId);
    const myRequests  = REQUESTS.filter(r => r.client._id === myId);
    const mySpend     = myCampaigns.reduce((s, k) => s + k.spend, 0);
    return (
      <div className="p-5 space-y-5 max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-[#059669] tracking-tight">My Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Urban Threads Co. — August 2026</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="My Campaigns"     value={myCampaigns.length}                         sub="all time"         icon={Megaphone}    color="#059669" />
          <KpiCard label="Active Campaigns" value={myCampaigns.filter(k=>k.status==="ACTIVE").length} sub="running now" icon={CheckCircle2} color="#059669" />
          <KpiCard label="Total Spend"      value={fmtBDT(mySpend)}                            sub="August 2026"      icon={BarChart2}    color="#1e40af" />
          <KpiCard label="Pending Requests" value={myRequests.filter(r=>r.status==="Under Review").length} sub="awaiting approval" icon={FileText} color="#d97706" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SectionHeader><span>My Ad Spend Trend (BDT)</span></SectionHeader>
            <Card className="p-4 border-t-0 rounded-t-none">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={SPEND_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `৳${v}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: 4 }} />
                  <Area type="monotone" dataKey="spend" stroke="#059669" strokeWidth={2} fillOpacity={0.1} fill="#059669" activeDot={{ r: 5, fill: "#059669" }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <div>
            <SectionHeader><span>Payment Summary</span></SectionHeader>
            <Card className="border-t-0 rounded-t-none overflow-hidden">
              <div className="divide-y divide-gray-100">
                {[
                  { l: "Prepaid Balance", v: "৳ 46,200", color: "text-[#059669]" },
                  { l: "Pending Dues",    v: "৳ 25,000", color: "text-red-600" },
                  { l: "Last Payment",    v: "৳ 21,200", color: "text-gray-800" },
                  { l: "Billing Rate",    v: "110%",      color: "text-gray-800" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-gray-500">{r.l}</span>
                    <span className={`text-sm font-bold ${r.color}`}>{r.v}</span>
                  </div>
                ))}
                <div className="p-3">
                  <Btn className="w-full text-xs" style={{ backgroundColor: "#059669", borderColor: "#059669" }}>Add Funds / Pay Now</Btn>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniTable title="My Campaigns"
            cols={["Campaign", "Spend", "CTR", "Status"]}
            rows={myCampaigns.map(k => [
              <div><p className="font-bold text-[#059669] truncate max-w-[160px]">{k.name}</p></div>,
              <span className="font-semibold text-gray-800">{fmtBDT(k.spend)}</span>,
              <span className="text-gray-700">{k.ctr}%</span>,
              <StatusBadge status={k.status} />,
            ])}
          />
          <MiniTable title="My Ad Requests"
            cols={["Request", "Objective", "Status"]}
            rows={myRequests.map(r => [
              <div><p className="font-bold text-gray-800 truncate max-w-[180px]">{r.pageName}</p><p className="text-[10px] text-gray-400 font-mono">{r.requestNumber}</p></div>,
              <span className="text-gray-600">{r.objective}</span>,
              <StatusBadge status={r.status} />,
            ])}
          />
        </div>
      </div>
    );
  }

  // Agency Owner / Agency Team
  return (
    <div className="p-5 space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">Agency Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">AdFlow Pro Management — August 2026</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Clients"    value={CLIENTS.filter(c=>c.status==="active").length}  sub="this workspace"   icon={Users}         color="#1e40af" />
        <KpiCard label="Live Campaigns"    value={activeCount}                                    sub="running now"      icon={Megaphone}     color="#059669" />
        <KpiCard label="Total MTD Spend"   value={fmtBDT(totalSpend)}                            sub="August 2026"      icon={BarChart2}     color="#1e40af" />
        <KpiCard label="Pending Requests"  value={pendingReqs}                                    sub="awaiting review"  icon={FileText}      color="#d97706" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionHeader><span>Ad Spend Trend — All Clients (BDT)</span></SectionHeader>
          <Card className="p-4 border-t-0 rounded-t-none">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={SPEND_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
                <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `৳${v}`} dx={-8} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: 4 }} />
                <Area type="monotone" dataKey="spend" stroke="#1e40af" strokeWidth={2} fillOpacity={0.1} fill="#1e40af" activeDot={{ r: 5, fill: "#1e40af" }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div>
          <SectionHeader><span>Spend by Client</span></SectionHeader>
          <Card className="p-4 border-t-0 rounded-t-none">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={CLIENTS.map(c => ({ name: c.name.split(" ")[0], spend: c.spend, color: c.color }))} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: 4, fontSize: 11 }} formatter={(v: any) => [fmtBDT(Number(v)), "Spend"]} />
                <Bar dataKey="spend" barSize={16} radius={[0, 3, 3, 0]}>
                  {CLIENTS.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MiniTable title="Recent Ad Requests"
          cols={["Request", "Client", "Budget", "Status"]}
          rows={REQUESTS.slice(0, 5).map(r => [
            <div><p className="font-bold text-[#1e40af] truncate max-w-[160px]">{r.pageName}</p><p className="text-[10px] text-gray-400 font-mono">{r.requestNumber}</p></div>,
            <span className="text-gray-700 font-medium">{r.client.name}</span>,
            <span className="font-semibold text-gray-800">{fmtBDT(r.budget)}</span>,
            <StatusBadge status={r.status} />,
          ])}
        />
        <MiniTable title="Live Campaigns"
          cols={["Campaign", "Spend", "CTR", "Status"]}
          rows={CAMPAIGNS.map(k => [
            <div><p className="font-bold text-[#1e40af] truncate max-w-[160px]">{k.name}</p><p className="text-[10px] text-gray-400">{k.client.name}</p></div>,
            <span className="font-semibold text-[#1e40af]">{fmtBDT(k.spend)}</span>,
            <span className="text-gray-700">{k.ctr}%</span>,
            <StatusBadge status={k.status} />,
          ])}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <SectionHeader><span>Financial Overview</span></SectionHeader>
          <Card className="border-t-0 rounded-t-none overflow-hidden">
            <div className="divide-y divide-gray-100">
              {[
                { l: "Total Billed (MTD)",    v: "৳ 1,60,000", color: "text-[#1e40af]" },
                { l: "Total Collected",       v: "৳ 1,35,000", color: "text-emerald-600" },
                { l: "Outstanding Dues",      v: "৳ 25,000",   color: "text-red-600" },
                { l: "Available Balance",     v: "৳ 46,200",   color: "text-gray-800" },
                { l: "Ad Accounts Connected", v: `${FB_AD_ACCOUNTS.length}`, color: "text-gray-800" },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-500">{r.l}</span>
                  <span className={`text-sm font-bold ${r.color}`}>{r.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div>
          <SectionHeader><span>Client Status</span></SectionHeader>
          <Card className="border-t-0 rounded-t-none overflow-hidden">
            <div className="divide-y divide-gray-100">
              {CLIENTS.map(c => (
                <div key={c._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="size-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: c.color }}>{c.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{fmtBDT(c.spend)} spend</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div>
          <SectionHeader><span>Recent Activity</span></SectionHeader>
          <Card className="border-t-0 rounded-t-none overflow-hidden">
            <div className="divide-y divide-gray-100">
              {[
                { text: "Campaign mapping updated for Urban Threads", time: "10:22", color: "#1e40af" },
                { text: "New client GreenLeaf Organics added", time: "Yesterday", color: "#059669" },
                { text: "Permission matrix saved", time: "2 days ago", color: "#7c3aed" },
                { text: "API token refreshed successfully", time: "3 days ago", color: "#d97706" },
                { text: "Invoice INV-2026-008 marked paid", time: "5 days ago", color: "#059669" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="size-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color }} />
                  <p className="flex-1 text-xs text-gray-700 leading-relaxed">{a.text}</p>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">{a.time}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Requests ─────────────────────────────────────────────────────────────────

const RequestsView = ({ viewRole, showToast }: { viewRole: string; showToast: (m: string, t?: string) => void }) => {
  const [requests, setRequests] = useState(REQUESTS);
  const [showForm, setShowForm] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const display = viewRole === "Client" ? requests.filter(r => r.client._id === "c1") : requests;

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (viewRole === "Client" || !draggedId) return;
    setRequests(requests.map(r => r._id === draggedId ? { ...r, status } : r));
    setDraggedId(null);
    showToast(`Request moved to ${status}`);
  };

  if (showForm) {
    return (
      <div className="p-4 max-w-4xl mx-auto animate-in fade-in duration-300">
        <TabHeader title="New Ad Request" />
        <Card className="p-6 border-t-0 rounded-tl-none space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <Label>Platform</Label>
              <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                <option>Facebook + Instagram</option>
                <option>Facebook Only</option>
                <option>Instagram Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Campaign Objective</Label>
              <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                <option>WhatsApp Messages</option>
                <option>Website Conversions</option>
                <option>Lead Generation</option>
                <option>Post Engagement</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Daily Budget (BDT)</Label><Input type="number" defaultValue="1000" /></div>
            <div className="space-y-1"><Label>Duration (Days)</Label><Input type="number" defaultValue="30" /></div>
            <div className="md:col-span-2 space-y-1">
              <Label>Target Link / Destination URL</Label>
              <Input type="url" placeholder="https://yourwebsite.com/product" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Upload Creatives</Label>
              <div className="w-full h-28 border border-dashed border-gray-400 bg-gray-50 hover:bg-gray-100 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer transition-colors">
                <UploadCloud size={22} className="text-[#1e40af] mb-1.5" />
                <span className="text-sm font-medium">Click or drag files here</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={() => { setShowForm(false); showToast("Request submitted!"); }}>Submit Request</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-4">
        <TabHeader title="Ad Requests" />
        <Btn onClick={() => setShowForm(true)} size="sm"><Plus size={15} className="mr-1" /> Create Request</Btn>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
        {["Under Review", "Approved", "Live"].map(col => (
          <div key={col} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)}
            className="bg-[#f8f9fa] border border-gray-300 rounded flex flex-col overflow-hidden">
            <div className="bg-[#eef2f7] border-b border-gray-300 px-3 py-2 flex justify-between items-center">
              <h3 className="font-bold text-[#1e40af] text-sm">{col}</h3>
              <Badge variant={col === "Live" ? "emerald" : col === "Approved" ? "blue" : "amber"}>
                {display.filter(r => r.status === col).length}
              </Badge>
            </div>
            <div className="space-y-3 overflow-y-auto p-3 flex-1">
              {display.filter(r => r.status === col).map(req => (
                <Card key={req._id}
                  className={`p-3 border-gray-300 ${viewRole !== "Client" ? "cursor-grab hover:border-gray-400 active:cursor-grabbing" : ""}`}
                  draggable={viewRole !== "Client"}
                  onDragStart={() => setDraggedId(req._id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-800">{req.requestNumber}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare size={11} /> {req.comments}</span>
                  </div>
                  {viewRole !== "Client" && <div className="font-semibold text-[#1e40af] text-sm mb-1">{req.client.name}</div>}
                  <div className="text-sm text-gray-600 font-medium mb-1">{req.pageName}</div>
                  <div className="text-xs text-gray-500 mb-3">{req.objective} · {req.platform}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} /> {req.createdAt}</div>
                    <div className="text-xs font-bold text-gray-700">{fmtBDT(req.budget)}/mo</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

const CampaignsView = ({ viewRole, showToast }: { viewRole: string; showToast: (m: string, t?: string) => void }) => {
  const [view, setView] = useState<"table" | "mapping">("table");
  const [mappingTab, setMappingTab] = useState<"adaccount" | "campaign">("adaccount");
  const [accountAssignments, setAccountAssignments] = useState<Record<string, string | null>>({
    act_1: "c1", act_2: "c2", act_3: null, act_4: "c4", act_5: null,
  });
  const [campaignMappings, setCampaignMappings] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    REQUESTS.forEach(r => {
      const linked = CAMPAIGNS.find(k => k.adRequestId === r._id);
      init[r._id] = linked?._id ?? null;
    });
    return init;
  });

  const assignAccount = (accountId: string, clientId: string | null) => {
    setAccountAssignments(prev => ({ ...prev, [accountId]: clientId }));
    showToast(clientId ? "Ad account assigned!" : "Account unassigned");
  };
  const assignCampaign = (requestId: string, campaignId: string | null) => {
    setCampaignMappings(prev => ({ ...prev, [requestId]: campaignId }));
    showToast(campaignId ? "Campaign linked!" : "Campaign unlinked");
  };

  const assignedCampaignIds = new Set(Object.values(campaignMappings).filter(Boolean) as string[]);
  const assignableCampaigns = CAMPAIGNS.filter(k => k.status === "ACTIVE" || k.status === "PAUSED");

  const display = viewRole === "Client" ? CAMPAIGNS.filter(k => k.client._id === "c1") : CAMPAIGNS;

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1e40af]">Campaign Report</h2>
          <p className="text-xs text-gray-500 mt-0.5">{CAMPAIGNS.length} campaigns · August 2026</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-200 rounded p-0.5">
            <button onClick={() => setView("table")} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${view === "table" ? "bg-white shadow text-[#1e40af]" : "text-gray-600 hover:text-gray-900"}`}>Campaigns</button>
            {viewRole !== "Client" && (
              <button onClick={() => setView("mapping")} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${view === "mapping" ? "bg-white shadow text-[#1e40af]" : "text-gray-600 hover:text-gray-900"}`}>Map Accounts</button>
            )}
          </div>
          <Btn variant="secondary" size="sm" className="text-xs"><Download size={13} className="mr-1" /> Export CSV</Btn>
          <Btn size="sm" className="text-xs"><Plus size={13} className="mr-1" /> New Campaign</Btn>
        </div>
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <>
          {/* Filter bar */}
          <Card className="overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-gray-200 bg-gray-50 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-800">
                <Calendar size={15} className="text-[#1e40af]" />
                <span className="font-bold">Performance range</span>
                <span className="text-gray-600">Aug 2026</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["Today", "Last 7 days", "Last 30 days", "Custom"].map(r => (
                  <button key={r} className={`px-2.5 py-1 text-[11px] font-bold rounded border transition-colors ${r === "Last 30 days" ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 p-3 bg-white">
              <div className="relative flex-1 max-w-sm w-full">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search campaigns" className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:border-[#1e40af]" />
              </div>
              <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white text-gray-700"><option>All statuses</option></select>
              <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white text-gray-700"><option>All ad accounts</option></select>
              <div className="flex-1 hidden md:block" />
              <Btn variant="secondary" size="sm" className="text-xs"><LayoutGrid size={13} className="mr-1" /> Columns</Btn>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead className="bg-[#1e40af] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a]">CAMPAIGN</th>
                  {viewRole !== "Client" && <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a]">CLIENT</th>}
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-center">DELIVERY</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">LEADS</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">CPL</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">RESULTS</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">COST/RESULT</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">SPENT</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">CTR</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">REACH</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a] text-right">IMP.</th>
                  <th className="px-3 py-2.5 font-bold border-r border-[#1e3a8a]">ENDS</th>
                  <th className="px-3 py-2.5 font-bold text-center">MANAGE</th>
                </tr>
              </thead>
              <tbody>
                {display.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50 border-b border-gray-200 transition-colors">
                    <td className="px-3 py-2 border-r border-gray-200 max-w-[220px]">
                      <div className="font-bold text-[#1e40af] truncate" title={c.name}>{c.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{c._id}</div>
                    </td>
                    {viewRole !== "Client" && (
                      <td className="px-3 py-2 border-r border-gray-200 bg-[#f8f9fa]">
                        <div className="flex items-center gap-1.5">
                          <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.client.color }} />
                          <span className="text-xs font-medium text-gray-800 truncate max-w-[120px]">{c.client.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2 border-r border-gray-200 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700 font-medium">{c.leads ?? "—"}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{c.cpl ? fmtBDT(c.cpl) : "—"}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-gray-900">{fmtNum(c.results)}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{fmtBDT(c.cpr)}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-[#1e40af]">{fmtBDT(c.spend)}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{c.ctr}%</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{fmtNum(c.impressions * 0.3)}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{fmtNum(c.impressions)}</td>
                    <td className="px-3 py-2 border-r border-gray-200 text-gray-600">{c.ends}</td>
                    <td className="px-3 py-2 text-center">
                      <Btn variant="ghost" size="sm" className="h-6 px-2 text-gray-400 hover:text-[#1e40af]"><Edit2 size={13} /></Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* MAPPING VIEW */}
      {view === "mapping" && (
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Access Mode</p>
              <div className="flex border border-gray-300 rounded overflow-hidden">
                <button onClick={() => setMappingTab("adaccount")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${mappingTab === "adaccount" ? "bg-[#1e40af] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <BarChart2 size={14} /> Ad Account Access
                </button>
                <button onClick={() => setMappingTab("campaign")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-l border-gray-300 transition-colors ${mappingTab === "campaign" ? "bg-[#1e40af] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <Megaphone size={14} /> Campaign Assignment
                </button>
              </div>
            </div>
            <div className={`rounded border px-3 py-2 max-w-sm text-xs font-medium ${mappingTab === "adaccount" ? "border-blue-200 bg-blue-50 text-[#1e40af]" : "border-violet-200 bg-violet-50 text-violet-700"}`}>
              {mappingTab === "adaccount"
                ? "Client will see ALL campaigns & data from the assigned ad account."
                : "Client will only see the specific campaign linked to their Ad Request."}
            </div>
          </div>

          {/* Ad Account tab */}
          {mappingTab === "adaccount" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Facebook Ad Accounts — {FB_AD_ACCOUNTS.length} connected</p>
                <span className="text-[10px] font-bold text-emerald-600">{Object.values(accountAssignments).filter(Boolean).length} assigned</span>
              </div>

              {FB_AD_ACCOUNTS.map(acc => {
                const assignedClientId = accountAssignments[acc._id] ?? null;
                const assignedClient = CLIENTS.find(c => c._id === assignedClientId);
                const accCampaigns = CAMPAIGNS.filter(k => acc.campaigns.includes(k._id));

                return (
                  <Card key={acc._id} className={`overflow-hidden ${assignedClientId ? "border-[#1e40af]/40" : ""}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      {/* Left */}
                      <div className="border-b border-gray-200 lg:border-b-0 lg:border-r px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded bg-blue-50 text-[#1e40af] border border-blue-200">
                            <BarChart2 size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{acc.name}</p>
                            <p className="font-mono text-[10px] text-gray-500 mt-0.5">{acc.accountId}</p>
                            <div className="mt-2 flex flex-wrap gap-4">
                              {[
                                { label: "Spent", val: fmtBDT(acc.amountSpent) },
                                { label: "Balance", val: fmtBDT(acc.balance) },
                                { label: "Campaigns", val: acc.campaigns.length },
                              ].map(m => (
                                <div key={m.label}>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">{m.label}</p>
                                  <p className="text-xs font-bold text-gray-800">{m.val}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {accCampaigns.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {accCampaigns.map(k => (
                              <span key={k._id} className="flex items-center gap-1 rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 font-medium">
                                <span className={`size-1.5 rounded-full ${k.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400"}`} />
                                {k.name.split(" — ")[0]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#fafafa]">
                        <div className="flex-1 min-w-0">
                          <Label>Assign to Client</Label>
                          <select
                            value={assignedClientId ?? ""}
                            onChange={e => assignAccount(acc._id, e.target.value || null)}
                            className={`w-full rounded border px-2.5 py-2 text-xs outline-none transition ${assignedClientId ? "border-[#1e40af] bg-blue-50 text-[#1e40af] font-bold" : "border-gray-300 bg-white text-gray-700"}`}
                          >
                            <option value="">— Not assigned —</option>
                            {CLIENTS.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                          {assignedClient && (
                            <p className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
                              <span className="size-2 rounded-full inline-block" style={{ backgroundColor: assignedClient.color }} />
                              {assignedClient.name} sees all {acc.campaigns.length} campaign{acc.campaigns.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${assignedClientId ? "border-[#1e40af] bg-blue-50 text-[#1e40af]" : "border-gray-300 bg-white text-gray-400"}`}>
                          {assignedClientId ? <CheckCircle2 size={15} /> : <X size={14} />}
                        </div>
                      </div>
                    </div>

                    {/* Client preview */}
                    {assignedClientId && (
                      <div className="border-t border-gray-200">
                        <div className="flex items-center gap-2 border-b border-gray-200 bg-blue-50 px-4 py-2">
                          <Eye size={12} className="text-[#1e40af]" />
                          <p className="text-[10px] font-bold text-[#1e40af] uppercase tracking-wider">
                            {CLIENTS.find(c => c._id === assignedClientId)?.name} sees — full account data
                          </p>
                        </div>
                        {accCampaigns.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-gray-400 italic">No campaigns in this account yet</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {accCampaigns.map(k => (
                              <div key={k._id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50">
                                <span className={`size-1.5 shrink-0 rounded-full ${k.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400"}`} />
                                <p className="min-w-0 flex-1 truncate text-xs text-gray-800 font-medium">{k.name}</p>
                                <div className="flex items-center gap-4 text-right">
                                  <div><p className="text-[9px] text-gray-400">Spent</p><p className="text-[10px] font-bold text-gray-700">{fmtBDT(k.spend)}</p></div>
                                  <div><p className="text-[9px] text-gray-400">CTR</p><p className="text-[10px] font-bold text-emerald-600">{k.ctr}%</p></div>
                                  <StatusBadge status={k.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Campaign tab */}
          {mappingTab === "campaign" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ad Requests — assign one campaign per request</p>
                <span className="text-[10px] font-bold text-violet-600">{Object.values(campaignMappings).filter(Boolean).length} mapped</span>
              </div>

              {REQUESTS.filter(r => r.status === "Live" || r.status === "Approved").map(req => {
                const assignedId = campaignMappings[req._id] ?? null;
                const assignedCampaign = CAMPAIGNS.find(k => k._id === assignedId);
                const clientCampaigns = assignableCampaigns.filter(k => k.client._id === req.client._id);

                return (
                  <Card key={req._id} className={`overflow-hidden ${assignedId ? "border-violet-300" : ""}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="border-b border-gray-200 lg:border-b-0 lg:border-r px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <StatusBadge status={req.status} />
                          <span className="font-mono text-[10px] text-gray-400">{req.requestNumber}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{req.pageName}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full" style={{ backgroundColor: req.client.color }} />
                            {req.client.name}
                          </span>
                          <span>·</span>
                          <span>{req.objective}</span>
                          <span>·</span>
                          <span>{fmtBDT(req.budget)}</span>
                          <span>·</span>
                          <span className="border border-gray-300 rounded px-1">{req.platform}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#fafafa]">
                        <div className="flex-1 min-w-0">
                          <Label>Link Campaign</Label>
                          {clientCampaigns.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No active campaigns for this client</p>
                          ) : (
                            <select
                              value={assignedId ?? ""}
                              onChange={e => assignCampaign(req._id, e.target.value || null)}
                              className={`w-full rounded border px-2.5 py-2 text-xs outline-none transition ${assignedId ? "border-violet-400 bg-violet-50 text-violet-700 font-bold" : "border-gray-300 bg-white text-gray-700"}`}
                            >
                              <option value="">— Not linked —</option>
                              {clientCampaigns.map(k => (
                                <option key={k._id} value={k._id}
                                  disabled={assignedCampaignIds.has(k._id) && assignedId !== k._id}>
                                  {k.name} [{k.status}]{assignedCampaignIds.has(k._id) && assignedId !== k._id ? " · used" : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${assignedId ? "border-violet-400 bg-violet-50 text-violet-600" : "border-gray-300 bg-white text-gray-400"}`}>
                          {assignedId ? <CheckCircle2 size={15} /> : <X size={14} />}
                        </div>
                      </div>
                    </div>

                    {assignedCampaign && (
                      <div className="border-t border-gray-200">
                        <div className="flex items-center gap-2 border-b border-gray-200 bg-violet-50 px-4 py-2">
                          <Eye size={12} className="text-violet-600" />
                          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                            {req.client.name} sees — only this campaign
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 bg-white">
                          {[
                            { label: "Spend", val: fmtBDT(assignedCampaign.spend), color: "#1e40af" },
                            { label: "Impressions", val: fmtNum(assignedCampaign.impressions), color: "#7c3aed" },
                            { label: "Clicks", val: fmtNum(assignedCampaign.clicks), color: "#059669" },
                            { label: "Cost/Result", val: fmtBDT(assignedCampaign.cpr), color: "#d97706" },
                          ].map(m => (
                            <div key={m.label} className="px-4 py-3">
                              <p className="text-[9px] font-bold text-gray-400 uppercase">{m.label}</p>
                              <p className="mt-0.5 text-sm font-bold" style={{ color: m.color }}>{m.val}</p>
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-2 bg-white border-t border-gray-100">
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, Math.round(assignedCampaign.spend / assignedCampaign.budget * 100))}%` }} />
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1">{Math.round(assignedCampaign.spend / assignedCampaign.budget * 100)}% of budget used</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}

              {REQUESTS.some(r => r.status === "Under Review" || r.status === "Rejected") && (
                <Card className="px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Not eligible — pending or rejected</p>
                  <div className="flex flex-wrap gap-2">
                    {REQUESTS.filter(r => r.status === "Under Review" || r.status === "Rejected").map(r => (
                      <div key={r._id} className="flex items-center gap-2 rounded border border-gray-300 bg-gray-50 px-3 py-1.5">
                        <StatusBadge status={r.status} />
                        <span className="font-mono text-[10px] text-gray-500">{r.requestNumber}</span>
                        <span className="text-xs text-gray-600 font-medium">{r.pageName}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Billing ──────────────────────────────────────────────────────────────────

const INVOICES = [
  { no: "INV-2026-008", period: "July 2026",  amount: 135000, paid: 135000, due: 0,      status: "Cleared",  date: "2026-08-01", method: "Bank Transfer" },
  { no: "INV-2026-009", period: "August 2026", amount: 25000,  paid: 0,      due: 25000,  status: "Overdue",  date: "2026-08-31", method: "—" },
];

const BillingView = ({ viewRole, showToast }: { viewRole: string; showToast: (m: string) => void }) => {
  const [billingTab, setBillingTab] = useState("Dues");
  return (
    <div className="p-5 space-y-5 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">Billing & Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Financial overview · August 2026</p>
        </div>
        {viewRole === "Client" && (
          <Btn onClick={() => showToast("Payment form coming soon!")}><Plus size={14} className="mr-2" /> Add Funds / Pay Now</Btn>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Prepaid Balance"  value="৳ 46,200"   sub="available to use"    icon={CreditCard}    color="#059669" />
        <KpiCard label="Total Billed"     value="৳ 1,60,000" sub="July–August 2026"    icon={Receipt}       color="#1e40af" />
        <KpiCard label="Total Collected"  value="৳ 1,35,000" sub="cleared payments"    icon={CheckCircle2}  color="#059669" />
        <KpiCard label="Outstanding Dues" value="৳ 25,000"   sub="1 overdue invoice"   icon={AlertCircle}   color="#dc2626" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e40af]">
        {["Dues", "Invoices", "Payment Methods"].map(t => (
          <button key={t} onClick={() => setBillingTab(t)}
            className={`px-4 py-1.5 text-sm font-bold rounded-t border border-b-0 transition-colors ${billingTab === t ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-gray-100 text-[#1e40af] border-gray-300 hover:bg-gray-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {billingTab === "Dues" && (
        <Card className="overflow-x-auto rounded-tl-none border-t-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e40af] text-white">
              <tr>
                {["Month / Period", "Ad Spend", "Agency Fee", "Total Payable", "Paid Amount", "Total Due", "Status", "Action"].map((h, i, a) => (
                  <th key={h} className={`px-4 py-2.5 font-bold ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""} ${i > 0 && i < a.length - 2 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BILLING_ROWS.map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50 border-b border-gray-200 ${r.status === "Overdue" ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3 border-r border-gray-200 font-semibold text-[#1e40af]">{r.period}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-right text-gray-700">{fmtBDT(r.adSpend)}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-right text-gray-700">{fmtBDT(r.agencyFee)}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-right font-semibold text-gray-900">{fmtBDT(r.totalPayable)}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-right text-emerald-600 font-semibold">{fmtBDT(r.paidAmount)}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-right font-bold text-gray-900">{fmtBDT(r.totalDue)}</td>
                  <td className="px-4 py-3 border-r border-gray-200 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {r.totalDue > 0
                      ? <button onClick={() => showToast(`Payment initiated for ${r.period}`)} className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#1e40af] text-white hover:bg-[#1e3a8a] transition-colors">Pay Now</button>
                      : <span className="text-[10px] text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#eef2f6] font-bold">
                <td colSpan={3} className="px-4 py-2.5 border-r border-gray-300 text-right text-[#1e40af] text-xs">Grand Total</td>
                <td className="px-4 py-2.5 border-r border-gray-300 text-right text-xs">{fmtBDT(160000)}</td>
                <td className="px-4 py-2.5 border-r border-gray-300 text-right text-emerald-600 text-xs">{fmtBDT(135000)}</td>
                <td className="px-4 py-2.5 border-r border-gray-300 text-right text-red-600 text-xs">{fmtBDT(25000)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {billingTab === "Invoices" && (
        <Card className="overflow-x-auto rounded-tl-none border-t-0">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#f8f9fa]">
            <p className="text-xs font-bold text-gray-600">{INVOICES.length} invoices</p>
            <Btn variant="secondary" size="sm" className="text-xs" onClick={() => showToast("All invoices downloading...")}>
              <Download size={12} className="mr-1.5" /> Download All
            </Btn>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e40af] text-white">
              <tr>
                {["Invoice No.", "Period", "Due Date", "Amount", "Paid", "Due", "Method", "Status", ""].map((h, i, a) => (
                  <th key={h} className={`px-3 py-2.5 font-bold ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""} ${i >= 3 && i < a.length - 2 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv, i) => (
                <tr key={i} className={`hover:bg-gray-50 border-b border-gray-200 ${inv.status === "Overdue" ? "bg-red-50/30" : ""}`}>
                  <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#1e40af] font-mono">{inv.no}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 font-semibold text-gray-800">{inv.period}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-gray-600">{inv.date}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-right font-semibold text-gray-900">{fmtBDT(inv.amount)}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-right text-emerald-600 font-medium">{fmtBDT(inv.paid)}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-right font-bold text-gray-900">{fmtBDT(inv.due)}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-gray-600">{inv.method}</td>
                  <td className="px-3 py-2.5 border-r border-gray-200 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="px-3 py-2.5 flex items-center gap-1.5">
                    <button onClick={() => showToast(`Downloading ${inv.no}`)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-[#1e40af] hover:text-white transition-colors border border-gray-200">
                      <Download size={10} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {billingTab === "Payment Methods" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Bank Transfer", detail: "City Bank — AC: ****2922", icon: "🏦", badge: "Primary", color: "#1e40af" },
              { name: "bKash (Bill Pay)", detail: "01700-000001", icon: "📱", badge: "Active", color: "#e11d48" },
              { name: "Nagad", detail: "01700-000002", icon: "💳", badge: "Active", color: "#d97706" },
            ].map((m, i) => (
              <Card key={i} className="p-4 flex items-start gap-3">
                <div className="size-10 rounded text-xl flex items-center justify-center bg-gray-50 border border-gray-200 shrink-0">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm text-gray-900">{m.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: m.color }}>{m.badge}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{m.detail}</p>
                </div>
                <button className="text-gray-400 hover:text-[#1e40af]"><Edit2 size={13} /></button>
              </Card>
            ))}
          </div>
          <Card className="p-4 border-dashed">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0"><Plus size={20} /></div>
              <div>
                <p className="font-bold text-sm text-gray-700">Add Payment Method</p>
                <p className="text-xs text-gray-400">Connect a bank account, mobile banking, or card</p>
              </div>
              <Btn variant="secondary" className="ml-auto text-xs" onClick={() => showToast("Add payment method coming soon!")}>Add New</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ─── Payment Details ──────────────────────────────────────────────────────────

const PaymentDetailsView = () => (
  <div className="p-4 space-y-4 max-w-[1400px] mx-auto animate-in fade-in duration-300">
    <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-4">
      <TabHeader title="Payment Details" />
      <Btn variant="secondary" size="sm" className="text-xs"><Download size={13} className="mr-1" /> Export Ledger</Btn>
    </div>
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#1e40af] text-white">
          <tr>
            {["Date", "Particulars / Description", "Payment Type / Ref", "Payable (Debit)", "Payment (Credit)", "Balance"].map((h, i, a) => (
              <th key={h} className={`px-3 py-2.5 font-bold ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""} ${i >= 3 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={6} className="bg-[#f8f9fa] font-bold text-[#1e40af] px-3 py-1.5 border-b border-gray-200">August 2026</td>
          </tr>
          {LEDGER_ROWS.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700 whitespace-nowrap">{r.date}</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">{r.desc}</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-500">{r.ref}</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-red-600">{r.debit ? fmtBDT(r.debit) : "—"}</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-emerald-600">{r.credit ? fmtBDT(r.credit) : "—"}</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">{fmtBDT(r.balance)}</td>
            </tr>
          ))}
          <tr className="bg-[#eef2f6] font-bold">
            <td colSpan={3} className="px-3 py-2.5 border-r border-gray-300 text-right text-[#1e40af]">Closing Balance (August)</td>
            <td className="px-3 py-2.5 border-r border-gray-300 text-right text-red-600">{fmtBDT(25000)}</td>
            <td className="px-3 py-2.5 border-r border-gray-300 text-right text-emerald-600">{fmtBDT(71200)}</td>
            <td className="px-3 py-2.5 text-right text-[#1e40af]">{fmtBDT(46200)}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
);

// ─── Settings ─────────────────────────────────────────────────────────────────

const CLIENT_PROFILES = [
  {
    _id: "c1", name: "Urban Threads Co.", contactName: "Mr. John Doe",
    email: "contact@urbanthreads.com", phone: "+880 1711 223344",
    address: "House 12, Road 4, Banani, Dhaka", industry: "E-commerce & Fashion",
    regNo: "URB-11223344-55", platform: "Facebook & Instagram",
    objective: "WhatsApp Messages, Sales", adAccount: "act_112233445",
    status: "active", color: "#1e40af", clientId: "CLI-2026-992",
    billingRate: 110, joinedDate: "2025-03-15",
  },
  {
    _id: "c2", name: "Dhaka Eats", contactName: "Ms. Sarah Ahmed",
    email: "sarah@dhakaeats.com", phone: "+880 1722 334455",
    address: "Level 3, Gulshan Ave, Dhaka", industry: "Food & Beverage",
    regNo: "DHK-22334455-66", platform: "Facebook Only",
    objective: "Post Engagement, Reach", adAccount: "act_223344556",
    status: "active", color: "#0891b2", clientId: "CLI-2026-993",
    billingRate: 115, joinedDate: "2025-05-01",
  },
  {
    _id: "c3", name: "Shajgoj Beauty", contactName: "Ms. Priya Roy",
    email: "priya@shajgoj.com", phone: "+880 1733 445566",
    address: "Dhanmondi 27, Dhaka", industry: "Beauty & Lifestyle",
    regNo: "SHJ-33445566-77", platform: "Instagram Only",
    objective: "Lead Generation", adAccount: "act_334455667",
    status: "active", color: "#7c3aed", clientId: "CLI-2026-994",
    billingRate: 112, joinedDate: "2025-06-10",
  },
  {
    _id: "c4", name: "TechPark BD", contactName: "Mr. Rafi Hossain",
    email: "rafi@techpark.bd", phone: "+880 1744 556677",
    address: "BSEC Bhaban, Motijheel, Dhaka", industry: "Technology / B2B",
    regNo: "TPK-44556677-88", platform: "Facebook Only",
    objective: "Website Conversions, Leads", adAccount: "act_445566778",
    status: "active", color: "#059669", clientId: "CLI-2026-995",
    billingRate: 120, joinedDate: "2025-02-20",
  },
  {
    _id: "c5", name: "GreenLeaf Organics", contactName: "Ms. Mita Chowdhury",
    email: "mita@greenleaf.com", phone: "+880 1755 667788",
    address: "Uttara Sector 7, Dhaka", industry: "Organic / FMCG",
    regNo: "GRN-55667788-99", platform: "Facebook & Instagram",
    objective: "Post Engagement", adAccount: "act_556677889",
    status: "inactive", color: "#d97706", clientId: "CLI-2026-996",
    billingRate: 108, joinedDate: "2025-08-05",
  },
];

const SettingsView = ({ viewRole, showToast }: { viewRole: string; showToast: (m: string) => void }) => {
  const [settingsTab, setSettingsTab] = useState("General");
  const [selectedClient, setSelectedClient] = useState(CLIENT_PROFILES[0]._id);
  const [clientTab, setClientTab] = useState("General");

  const activeClient = CLIENT_PROFILES.find(c => c._id === selectedClient)!;

  // ── Client view: show only their own profile ──
  if (viewRole === "Client") {
    const me = CLIENT_PROFILES[0];
    return (
      <div className="p-4 max-w-[1400px] mx-auto animate-in fade-in duration-300 space-y-5">

        {/* Client Profile hero */}
        <div>
          <TabHeader title="My Profile" />
          <Card className="border-t-0 rounded-tl-none p-5">
            <div className="flex flex-col md:flex-row gap-5">
              {/* Avatar */}
              <div className="w-[130px] h-[155px] shrink-0 border border-gray-300 bg-[#eef2f6] flex flex-col items-center justify-center gap-1">
                <div className="size-16 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: me.color }}>
                  {me.name.charAt(0)}
                </div>
                <span className="text-[10px] font-bold text-gray-500 mt-1">LOGO / PHOTO</span>
              </div>
              {/* Summary grid */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: "Client Name", v: me.name, bold: true },
                  { l: "Client ID", v: me.clientId },
                  { l: "Ad Account", v: me.adAccount },
                  { l: "Status", v: me.status === "active" ? "Active" : "Inactive", color: me.status === "active" ? "text-emerald-600" : "text-red-500" },
                  { l: "Industry", v: me.industry },
                  { l: "Platform", v: me.platform },
                  { l: "Billing Rate", v: `${me.billingRate}%` },
                  { l: "Member Since", v: me.joinedDate },
                ].map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded-sm p-2.5 bg-[#fafafa]">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{f.l}</p>
                    <p className={`text-sm font-bold ${(f as any).color ?? "text-gray-900"}`}>{f.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Client profile tabs */}
        <div>
          <div className="flex gap-1 border-b border-[#1e40af]">
            {["General", "Billing Contacts", "Assigned Team", "Documents"].map(t => (
              <button key={t} onClick={() => setClientTab(t)}
                className={`px-4 py-1.5 text-sm font-bold rounded-t border border-b-0 transition-colors ${clientTab === t ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-gray-100 text-[#1e40af] border-gray-300 hover:bg-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
          <Card className="rounded-tl-none border-t-0 overflow-hidden">
            {clientTab === "General" && (
              <div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Business Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                  {[
                    ["Company Registration No.", me.regNo], ["Industry / Category", me.industry],
                    ["Point of Contact", me.contactName], ["Contact Email", me.email],
                    ["Phone Number", me.phone], ["Business Address", me.address],
                  ].map(([l, v], i) => (
                    <div key={i} className={`p-3 border-b border-gray-200 ${i % 2 === 0 ? "md:border-r" : ""}`}>
                      <span className="text-[10px] font-bold text-[#1e40af] block mb-1">{l}</span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-t border-gray-300">Platform Preferences</div>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                  {[["Primary Platforms", me.platform], ["Default Objectives", me.objective]].map(([l, v], i) => (
                    <div key={i} className={`p-3 border-b border-gray-200 ${i === 0 ? "md:border-r" : ""}`}>
                      <span className="text-[10px] font-bold text-[#1e40af] block mb-1">{l}</span>
                      <span className="font-semibold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {clientTab === "Billing Contacts" && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Billing Contact Name</Label><Input defaultValue={me.contactName} /></div>
                  <div className="space-y-1"><Label>Billing Email</Label><Input defaultValue={me.email} /></div>
                  <div className="space-y-1"><Label>Phone Number</Label><Input defaultValue={me.phone} /></div>
                  <div className="space-y-1"><Label>Payment Method</Label>
                    <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                      <option>Bank Transfer</option><option>bKash</option><option>Nagad</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1"><Label>Billing Address</Label><Input defaultValue={me.address} /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Btn onClick={() => showToast("Billing contact saved!")}>Save</Btn>
                </div>
              </div>
            )}
            {clientTab === "Assigned Team" && (
              <div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Agency Team Assigned to Your Account</div>
                <div className="divide-y divide-gray-100">
                  {[
                    { name: "Rahim Uddin",   role: "Account Manager",  email: "rahim@adflow.com",  avatar: "#1e40af" },
                    { name: "Farida Begum",  role: "Campaign Manager",  email: "farida@adflow.com", avatar: "#0891b2" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: m.avatar }}>{m.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.role} · {m.email}</p>
                      </div>
                      <Badge variant="blue">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {clientTab === "Documents" && (
              <div className="p-5">
                <div className="border border-dashed border-gray-300 rounded p-6 text-center mb-4">
                  <UploadCloud size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-500">Upload Business Documents</p>
                  <p className="text-[11px] text-gray-400 mt-1">Trade License, TIN, Registration Certificate, NID, etc.</p>
                  <Btn variant="secondary" className="mt-3 text-xs">Choose Files</Btn>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Trade_License_2026.pdf", size: "1.2 MB", date: "2026-03-01", type: "Trade License" },
                    { name: "TIN_Certificate.pdf",    size: "0.4 MB", date: "2026-01-15", type: "TIN Certificate" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-[#fafafa]">
                      <div className="size-8 rounded bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold shrink-0">PDF</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{f.name}</p>
                        <p className="text-[10px] text-gray-400">{f.type} · {f.size} · {f.date}</p>
                      </div>
                      <button className="text-gray-400 hover:text-[#1e40af]"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Admin / Team view ──
  return (
    <div className="p-4 max-w-[1400px] mx-auto animate-in fade-in duration-300 space-y-6">

      {/* ── 1. SYSTEM SETTINGS ── */}
      <div className="space-y-3">
        <div className="flex gap-1 border-b border-[#1e40af]">
          {["General", "API Config", "Team", "Audit Logs"].map(t => (
            <button key={t} onClick={() => setSettingsTab(t)}
              className={`px-4 py-1.5 text-sm font-bold rounded-t border border-b-0 transition-colors ${settingsTab === t ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-gray-100 text-[#1e40af] border-gray-300 hover:bg-gray-200"}`}>
              {t}
            </button>
          ))}
        </div>
        <Card className="rounded-tl-none border-t-0 overflow-hidden">
          {settingsTab === "General" && (
            <div>
              <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">System Configuration</div>
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                {[
                  ["Primary Currency", "USD / BDT"], ["Timezone", "Asia/Dhaka (GMT+6)"],
                  ["Brand Color", "#1e40af"], ["Support Email", "support@adflow.com"],
                  ["Default Language", "English"], ["Invoice Prefix", "INV-2026-"],
                ].map(([l, v], i) => (
                  <div key={i} className={`p-3 border-b border-gray-200 ${i % 2 === 0 ? "md:border-r" : ""}`}>
                    <span className="text-gray-400 text-[10px] block mb-0.5">{l}</span>
                    <span className="font-semibold text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {settingsTab === "API Config" && (
            <div className="p-4 space-y-4">
              <div className="bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center gap-2 rounded">
                <CheckCircle size={15} /> Meta Graph API Connection is Active (v19.0)
              </div>
              <div className="space-y-1"><Label>System User Access Token</Label><Input type="password" defaultValue="EAAGm0PX4ZCpwBOw..." className="font-mono text-xs" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>App ID</Label><Input defaultValue="1234567890" className="font-mono text-xs" /></div>
                <div className="space-y-1"><Label>App Secret</Label><Input type="password" defaultValue="****************" className="font-mono text-xs" /></div>
              </div>
              <Btn onClick={() => showToast("API Keys saved & verified!")}>Save & Verify</Btn>
            </div>
          )}
          {settingsTab === "Team" && (
            <div>
              <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300 flex items-center justify-between">
                <span>Agency Team Members</span>
                <Btn size="sm" onClick={() => showToast("Invite sent!")}><Plus size={13} className="mr-1" /> Invite Member</Btn>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead className="bg-[#f8f9fa] border-b border-gray-200">
                  <tr>
                    {["Name", "Email", "Role", "Status", ""].map((h, i) => (
                      <th key={i} className={`px-3 py-2 text-left font-bold text-gray-600 ${i < 4 ? "border-r border-gray-200" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Rahim Uddin", email: "rahim@adflow.com", role: "Agency Owner", status: "active" },
                    { name: "Farida Begum", email: "farida@adflow.com", role: "Agency Team", status: "active" },
                    { name: "Kamal Hossain", email: "kamal@adflow.com", role: "Agency Team", status: "inactive" },
                  ].map((m, i) => (
                    <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2.5 border-r border-gray-200 font-semibold text-gray-900">{m.name}</td>
                      <td className="px-3 py-2.5 border-r border-gray-200 text-gray-600">{m.email}</td>
                      <td className="px-3 py-2.5 border-r border-gray-200"><Badge variant={m.role === "Agency Owner" ? "blue" : "gray"}>{m.role}</Badge></td>
                      <td className="px-3 py-2.5 border-r border-gray-200"><StatusBadge status={m.status} /></td>
                      <td className="px-3 py-2.5 text-center"><Btn variant="ghost" size="sm" className="h-6 px-2"><Edit2 size={12} /></Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {settingsTab === "Audit Logs" && (
            <div>
              <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Recent Activity</div>
              <div className="divide-y divide-gray-100">
                {[
                  { action: "Campaign mapping updated", user: "Rahim Uddin", time: "2026-08-30 10:22", type: "edit" },
                  { action: "New client added: GreenLeaf Organics", user: "Farida Begum", time: "2026-08-29 15:10", type: "create" },
                  { action: "Permission matrix saved", user: "Rahim Uddin", time: "2026-08-28 09:05", type: "edit" },
                  { action: "API token refreshed", user: "Rahim Uddin", time: "2026-08-27 11:48", type: "security" },
                  { action: "Invoice INV-2026-008 marked paid", user: "Farida Begum", time: "2026-08-25 14:30", type: "billing" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <div className={`size-2 rounded-full shrink-0 ${log.type === "security" ? "bg-red-400" : log.type === "billing" ? "bg-emerald-500" : log.type === "create" ? "bg-blue-500" : "bg-amber-400"}`} />
                    <p className="flex-1 text-xs text-gray-800 font-medium">{log.action}</p>
                    <p className="text-[10px] text-gray-500">{log.user}</p>
                    <p className="text-[10px] font-mono text-gray-400">{log.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── 2. AGENCY PROFILE ── */}
      <div className="space-y-0">
        <TabHeader title="Agency Profile" />
        <Card className="border-t-0 rounded-tl-none overflow-hidden">
          {/* Hero row */}
          <div className="flex flex-col md:flex-row gap-0 border-b border-gray-200">
            {/* Logo area */}
            <div className="md:w-48 shrink-0 border-r border-gray-200 bg-[#eef2f6] flex flex-col items-center justify-center py-6 gap-2">
              <div className="size-16 rounded flex items-center justify-center bg-[#1e40af]">
                <Shield size={32} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Agency Logo</span>
              <Btn variant="secondary" size="sm" className="text-[10px]"><Plus size={11} className="mr-1" /> Upload</Btn>
            </div>
            {/* Key fields */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
              {[
                { l: "Agency Name", v: "AdFlow Pro Management", span: true },
                { l: "Agency ID", v: "AGY-2026-1132" },
                { l: "Subscription Plan", v: "Enterprise" },
                { l: "Status", v: "Active", color: "text-emerald-600" },
                { l: "Admin Email", v: "admin@adflow.com" },
                { l: "Support Email", v: "support@adflow.com" },
                { l: "Country", v: "Bangladesh" },
                { l: "Member Since", v: "2025-01-01" },
              ].map((f, i) => (
                <div key={i} className="p-3">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{f.l}</p>
                  <p className={`text-sm font-bold ${(f as any).color ?? "text-gray-900"}`}>{f.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detail rows */}
          <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Business Details</div>
          <div className="grid grid-cols-1 md:grid-cols-3 text-sm">
            {[
              ["Company Registration", "RJSC-2025-ADL-1132"],
              ["Trade License No.", "TL-DCC-2025-88541"],
              ["TIN / VAT Number", "TIN-1234567890"],
              ["Business Address", "Suite 4B, Level 6, Bashundhara City, Panthapath, Dhaka 1205"],
              ["Primary Currency", "BDT (Bangladeshi Taka)"],
              ["Timezone", "Asia/Dhaka (GMT+6)"],
            ].map(([l, v], i) => (
              <div key={i} className={`p-3 border-b border-gray-200 ${i % 3 !== 2 ? "md:border-r" : ""}`}>
                <span className="text-[10px] font-bold text-[#1e40af] block mb-1">{l}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end p-3 border-t border-gray-200 bg-gray-50">
            <Btn onClick={() => showToast("Agency profile saved!")}><CheckCircle2 size={14} className="mr-1.5" /> Save Changes</Btn>
          </div>
        </Card>
      </div>

      {/* ── 3. CLIENT PROFILES ── */}
      <div className="space-y-0">
        <div className="flex items-end justify-between">
          <TabHeader title="Client Profiles" />
          <Btn size="sm" onClick={() => showToast("Add client form coming soon!")} className="mb-0.5">
            <Plus size={13} className="mr-1" /> Add Client
          </Btn>
        </div>
        <Card className="border-t-0 rounded-tl-none overflow-hidden">
          {/* Client selector tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto bg-[#f8f9fa]">
            {CLIENT_PROFILES.map(c => (
              <button key={c._id} onClick={() => { setSelectedClient(c._id); setClientTab("General"); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-r border-gray-200 transition-colors ${selectedClient === c._id ? "bg-white border-b-2 border-b-[#1e40af] text-[#1e40af]" : "text-gray-600 hover:bg-white hover:text-[#1e40af]"}`}>
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.name}
                {c.status === "inactive" && <Badge variant="gray" className="text-[9px]">Inactive</Badge>}
              </button>
            ))}
          </div>

          {/* Selected client details */}
          <div>
            {/* Client hero */}
            <div className="flex flex-col md:flex-row gap-0 border-b border-gray-200">
              <div className="md:w-44 shrink-0 border-r border-gray-200 bg-[#eef2f6] flex flex-col items-center justify-center py-5 gap-2">
                <div className="size-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: activeClient.color }}>
                  {activeClient.name.charAt(0)}
                </div>
                <span className="text-[10px] font-bold text-gray-500">CLIENT LOGO</span>
                <Btn variant="secondary" size="sm" className="text-[10px]"><Plus size={11} className="mr-1" /> Upload</Btn>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
                {[
                  { l: "Client Name", v: activeClient.name },
                  { l: "Client ID", v: activeClient.clientId },
                  { l: "Status", v: activeClient.status === "active" ? "Active" : "Inactive", color: activeClient.status === "active" ? "text-emerald-600" : "text-red-500" },
                  { l: "Billing Rate", v: `${activeClient.billingRate}%` },
                  { l: "Ad Account", v: activeClient.adAccount },
                  { l: "Platform", v: activeClient.platform },
                  { l: "Joined", v: activeClient.joinedDate },
                  { l: "Objective", v: activeClient.objective },
                ].map((f, i) => (
                  <div key={i} className="p-3">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{f.l}</p>
                    <p className={`text-xs font-bold ${(f as any).color ?? "text-gray-900"} truncate`}>{f.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client sub-tabs */}
            <div className="flex gap-1 border-b border-[#1e40af] px-3 pt-3 bg-white">
              {["General", "Billing Contacts", "Assigned Team", "Documents"].map(t => (
                <button key={t} onClick={() => setClientTab(t)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t border border-b-0 transition-colors ${clientTab === t ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-gray-100 text-[#1e40af] border-gray-300 hover:bg-gray-200"}`}>
                  {t}
                </button>
              ))}
            </div>

            {clientTab === "General" && (
              <div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Business Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                  {[
                    ["Company Registration No.", activeClient.regNo],
                    ["Industry / Category", activeClient.industry],
                    ["Point of Contact (Admin)", activeClient.contactName],
                    ["Contact Email", activeClient.email],
                    ["Phone Number", activeClient.phone],
                    ["Business Address", activeClient.address],
                  ].map(([l, v], i) => (
                    <div key={i} className={`p-3 border-b border-gray-200 ${i % 2 === 0 ? "md:border-r" : ""}`}>
                      <span className="text-[10px] font-bold text-[#1e40af] block mb-1">{l}</span>
                      <span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-t border-gray-300">Platform Preferences</div>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                  {[["Primary Platforms", activeClient.platform], ["Default Objectives", activeClient.objective]].map(([l, v], i) => (
                    <div key={i} className={`p-3 border-b border-gray-200 ${i === 0 ? "md:border-r" : ""}`}>
                      <span className="text-[10px] font-bold text-[#1e40af] block mb-1">{l}</span>
                      <span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {clientTab === "Billing Contacts" && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Billing Contact Name</Label><Input defaultValue={activeClient.contactName} /></div>
                  <div className="space-y-1"><Label>Billing Email</Label><Input defaultValue={activeClient.email} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input defaultValue={activeClient.phone} /></div>
                  <div className="space-y-1"><Label>Payment Method</Label>
                    <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                      <option>Bank Transfer</option><option>bKash</option><option>Nagad</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1"><Label>Billing Address</Label><Input defaultValue={activeClient.address} /></div>
                </div>
              </div>
            )}
            {clientTab === "Assigned Team" && (
              <div>
                <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300 flex items-center justify-between">
                  <span>Assigned Agency Team</span>
                  <Btn size="sm" onClick={() => showToast("Team member assigned!")}><Plus size={12} className="mr-1" /> Assign</Btn>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { name: "Rahim Uddin",  role: "Account Manager",  email: "rahim@adflow.com",  color: "#1e40af" },
                    { name: "Farida Begum", role: "Campaign Executor", email: "farida@adflow.com", color: "#0891b2" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: m.color }}>{m.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.role} · {m.email}</p>
                      </div>
                      <Btn variant="ghost" size="sm" className="text-xs text-gray-400"><X size={13} /></Btn>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {clientTab === "Documents" && (
              <div className="p-4">
                <div className="border border-dashed border-gray-300 rounded p-5 text-center mb-4">
                  <UploadCloud size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-500">Upload client documents (Trade License, TIN, NDA, Contract)</p>
                  <Btn variant="secondary" className="mt-2 text-xs" onClick={() => showToast("File upload coming soon!")}>Choose Files</Btn>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Client_Contract_2026.pdf", size: "2.1 MB", date: "2026-01-10", type: "Contract" },
                    { name: "Trade_License.pdf",         size: "0.8 MB", date: "2026-03-05", type: "Trade License" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-[#fafafa]">
                      <div className="size-8 rounded bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold shrink-0">PDF</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{f.name}</p>
                        <p className="text-[10px] text-gray-400">{f.type} · {f.size} · {f.date}</p>
                      </div>
                      <button className="text-gray-400 hover:text-[#1e40af]"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 p-3 border-t border-gray-200 bg-gray-50">
              <Btn variant="secondary" onClick={() => showToast("Client removed!")} className="text-red-600 border-red-300 hover:bg-red-50">Remove Client</Btn>
              <Btn onClick={() => showToast("Client profile saved!")}><CheckCircle2 size={14} className="mr-1.5" /> Save Changes</Btn>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};

// ─── Roles & Permissions ─────────────────────────────────────────────────────

type AccessLevel = "full" | "manage" | "view" | "none";

const FEATURES = [
  { id: "dashboard",        label: "Dashboard",               group: "Core" },
  { id: "ad_requests_view", label: "Ad Requests — View",      group: "Operations" },
  { id: "ad_requests_create",label: "Ad Requests — Create",   group: "Operations" },
  { id: "ad_requests_approve",label: "Ad Requests — Approve/Reject", group: "Operations" },
  { id: "campaigns_view",   label: "Campaigns — View",        group: "Operations" },
  { id: "campaigns_manage", label: "Campaigns — Manage",      group: "Operations" },
  { id: "campaigns_map",    label: "Campaigns — Map Accounts",group: "Operations" },
  { id: "ad_accounts",      label: "Ad Accounts",             group: "Operations" },
  { id: "billing_view",     label: "Payment Dues — View",     group: "Financial" },
  { id: "billing_pay",      label: "Payment Dues — Pay/Mark", group: "Financial" },
  { id: "ledger_view",      label: "Payment Details — View",  group: "Financial" },
  { id: "ledger_export",    label: "Payment Details — Export",group: "Financial" },
  { id: "clients_view",     label: "Client Management — View",group: "Admin" },
  { id: "clients_manage",   label: "Client Management — Manage",group: "Admin" },
  { id: "team_view",        label: "Team Management — View",  group: "Admin" },
  { id: "team_manage",      label: "Team Management — Manage",group: "Admin" },
  { id: "settings_view",    label: "Settings — View",         group: "Admin" },
  { id: "settings_edit",    label: "Settings — Edit",         group: "Admin" },
  { id: "api_config",       label: "API Configuration",       group: "Admin" },
  { id: "roles_view",       label: "Roles & Permissions — View", group: "Admin" },
  { id: "roles_edit",       label: "Roles & Permissions — Edit", group: "Admin" },
  { id: "export_reports",   label: "Export / Reports",        group: "Reporting" },
  { id: "workspace_billing",label: "Workspace Billing",       group: "SaaS" },
  { id: "manage_agencies",  label: "Manage Agencies",         group: "SaaS" },
  { id: "platform_config",  label: "Platform Configuration",  group: "SaaS" },
] as const;

type FeatureId = typeof FEATURES[number]["id"];

const ROLES = [
  { id: "saas_owner",    label: "SaaS Owner",          tier: "saas",   color: "#7c3aed", icon: Crown },
  { id: "saas_team",     label: "SaaS Team",           tier: "saas",   color: "#8b5cf6", icon: ShieldCheck },
  { id: "agency_owner",  label: "Agency Owner",        tier: "agency", color: "#1e40af", icon: Building2 },
  { id: "agency_team",   label: "Agency Team",         tier: "agency", color: "#3b82f6", icon: Users },
  { id: "client_admin",  label: "Client Admin",        tier: "client", color: "#0891b2", icon: UserCog },
  { id: "client_mod",    label: "Client Moderator",    tier: "client", color: "#0ea5e9", icon: User },
  { id: "client_user",   label: "Client User",         tier: "client", color: "#64748b", icon: User },
] as const;

type RoleId = typeof ROLES[number]["id"];

const DEFAULT_PERMS: Record<RoleId, Record<FeatureId, AccessLevel>> = {
  saas_owner:   Object.fromEntries(FEATURES.map(f => [f.id, "full"])) as Record<FeatureId, AccessLevel>,
  saas_team:    Object.fromEntries(FEATURES.map(f => [f.id, f.group === "SaaS" ? "manage" : f.group === "Admin" ? "view" : "manage"])) as Record<FeatureId, AccessLevel>,
  agency_owner: Object.fromEntries(FEATURES.map(f => [f.id, f.group === "SaaS" ? "none" : f.group === "Admin" ? "full" : "full"])) as Record<FeatureId, AccessLevel>,
  agency_team:  Object.fromEntries(FEATURES.map(f => {
    if (f.group === "SaaS" || f.id === "roles_edit" || f.id === "api_config" || f.id === "settings_edit") return [f.id, "none"];
    if (f.id === "ad_requests_approve" || f.id === "clients_manage" || f.id === "team_manage") return [f.id, "none"];
    return [f.id, "manage"];
  })) as Record<FeatureId, AccessLevel>,
  client_admin: Object.fromEntries(FEATURES.map(f => {
    if (f.group === "SaaS" || f.group === "Admin") return [f.id, f.id === "settings_view" ? "view" : "none"];
    if (f.id === "campaigns_map" || f.id === "ad_accounts") return [f.id, "none"];
    return [f.id, "manage"];
  })) as Record<FeatureId, AccessLevel>,
  client_mod:   Object.fromEntries(FEATURES.map(f => {
    if (f.group === "SaaS" || f.group === "Admin" || f.id === "campaigns_map" || f.id === "ad_accounts") return [f.id, "none"];
    if (f.id === "ad_requests_approve" || f.id === "billing_pay" || f.id === "ledger_export") return [f.id, "none"];
    if (f.id === "ad_requests_create") return [f.id, "manage"];
    return [f.id, "view"];
  })) as Record<FeatureId, AccessLevel>,
  client_user:  Object.fromEntries(FEATURES.map(f => {
    if (f.group === "SaaS" || f.group === "Admin") return [f.id, "none"];
    if (["campaigns_view", "dashboard", "ad_requests_view", "billing_view", "ledger_view"].includes(f.id)) return [f.id, "view"];
    return [f.id, "none"];
  })) as Record<FeatureId, AccessLevel>,
};

const ACCESS_CYCLE: AccessLevel[] = ["none", "view", "manage", "full"];
const ACCESS_META: Record<AccessLevel, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  full:   { label: "Full",   bg: "bg-[#1e40af]",  text: "text-white",     icon: <ShieldCheck size={11} /> },
  manage: { label: "Manage", bg: "bg-emerald-600", text: "text-white",     icon: <CheckCircle2 size={11} /> },
  view:   { label: "View",   bg: "bg-amber-400",   text: "text-gray-900",  icon: <Eye size={11} /> },
  none:   { label: "—",      bg: "bg-gray-100",    text: "text-gray-400",  icon: <Minus size={11} /> },
};

// Architecture tree data
const ARCH_TIERS = [
  {
    id: "saas",
    label: "SaaS Platform",
    sublabel: "AdFlow Pro — Platform Owner",
    color: "#7c3aed",
    bg: "bg-violet-50",
    border: "border-violet-300",
    headBg: "bg-violet-600",
    roles: [
      { label: "SaaS Owner", desc: "Full platform control. Manage all agencies, billing, config.", icon: Crown, badge: "God Mode" },
      { label: "SaaS Team",  desc: "Support & ops. Can manage agency workspaces and view all data.", icon: ShieldCheck, badge: "Staff" },
    ],
    children: "Workspace / Agency",
  },
  {
    id: "agency",
    label: "Workspace / Agency",
    sublabel: "Each SaaS Client = one workspace",
    color: "#1e40af",
    bg: "bg-blue-50",
    border: "border-blue-300",
    headBg: "bg-[#1e40af]",
    roles: [
      { label: "Agency Owner", desc: "Full control over their workspace. Manage team, clients, settings.", icon: Building2, badge: "Owner" },
      { label: "Agency Team",  desc: "Operational access. Manage campaigns, requests, billing.", icon: Users, badge: "Staff" },
    ],
    children: "Client Portal",
  },
  {
    id: "client",
    label: "Client Portal",
    sublabel: "Each Agency Client gets their own portal",
    color: "#0891b2",
    bg: "bg-sky-50",
    border: "border-sky-300",
    headBg: "bg-sky-600",
    roles: [
      { label: "Client Admin",     desc: "Manage their portal users. Submit requests, view billing.", icon: UserCog, badge: "Admin" },
      { label: "Client Moderator", desc: "Submit requests, view campaigns. Cannot approve or pay.", icon: User, badge: "Mod" },
      { label: "Client User",      desc: "Read-only. Dashboard, campaigns, billing view only.", icon: User, badge: "Viewer" },
    ],
    children: null,
  },
];

const RolesView = ({ showToast }: { showToast: (m: string) => void }) => {
  const [tab, setTab] = useState<"architecture" | "permissions">("architecture");
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [filterGroup, setFilterGroup] = useState("All");

  const groups = ["All", ...Array.from(new Set(FEATURES.map(f => f.group)))];

  const cycleAccess = (roleId: RoleId, featureId: FeatureId) => {
    if (roleId === "saas_owner") return;
    const cur = perms[roleId][featureId];
    const idx = ACCESS_CYCLE.indexOf(cur);
    const next = ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length];
    setPerms(p => ({ ...p, [roleId]: { ...p[roleId], [featureId]: next } }));
    showToast("Permission updated");
  };

  const visibleFeatures = filterGroup === "All" ? FEATURES : FEATURES.filter(f => f.group === filterGroup);

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1e40af]">Roles & Permissions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Multi-tenant access architecture — {ROLES.length} roles, {FEATURES.length} features</p>
        </div>
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button onClick={() => setTab("architecture")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors ${tab === "architecture" ? "bg-[#1e40af] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <Globe size={13} /> Architecture
          </button>
          <button onClick={() => setTab("permissions")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-l border-gray-300 transition-colors ${tab === "permissions" ? "bg-[#1e40af] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <Sliders size={13} /> Permission Matrix
          </button>
        </div>
      </div>

      {/* ── ARCHITECTURE TAB ── */}
      {tab === "architecture" && (
        <div className="space-y-3">
          {/* Top-level description */}
          <Card className="px-4 py-3 flex items-start gap-3 border-l-4 border-violet-500">
            <Shield size={18} className="text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900">3-Tier Multi-Tenant Architecture</p>
              <p className="text-xs text-gray-500 mt-0.5">
                SaaS Owner operates the platform. Each SaaS Client is an independent Agency workspace. Each Agency manages their own clients, who get a scoped portal with sub-roles.
              </p>
            </div>
          </Card>

          {/* Tier cards connected with arrows */}
          <div className="space-y-0">
            {ARCH_TIERS.map((tier, ti) => (
              <div key={tier.id}>
                {/* Tier block */}
                <div className={`rounded border ${tier.border} ${tier.bg} overflow-hidden`}>
                  {/* Tier header */}
                  <div className={`${tier.headBg} text-white px-4 py-2.5 flex items-center justify-between`}>
                    <div>
                      <span className="font-bold text-sm">{tier.label}</span>
                      <span className="ml-2 text-xs opacity-80">— {tier.sublabel}</span>
                    </div>
                    <Badge variant="default" className="bg-white/20 text-white text-[10px]">
                      {tier.roles.length} role{tier.roles.length > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Roles in this tier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {tier.roles.map(role => {
                      const RoleIcon = role.icon;
                      return (
                        <div key={role.label} className="bg-white rounded border border-gray-200 p-3 flex items-start gap-3 shadow-sm">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded" style={{ backgroundColor: `${tier.color}18` }}>
                            <RoleIcon size={16} style={{ color: tier.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900">{role.label}</span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${tier.color}18`, color: tier.color }}>{role.badge}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed">{role.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connector arrow */}
                {tier.children && (
                  <div className="flex items-center justify-center py-2 gap-2">
                    <div className="h-px flex-1 border-t-2 border-dashed border-gray-300 max-w-[120px]" />
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <ChevronRight size={14} className="text-gray-400" />
                      Each client becomes a
                      <span className="text-[#1e40af]">{tier.children}</span>
                    </div>
                    <div className="h-px flex-1 border-t-2 border-dashed border-gray-300 max-w-[120px]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Access level legend */}
          <Card className="p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Access Level Legend</p>
            <div className="flex flex-wrap gap-3">
              {(Object.entries(ACCESS_META) as [AccessLevel, typeof ACCESS_META[AccessLevel]][]).map(([level, meta]) => (
                <div key={level} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${meta.bg} ${meta.text}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {level === "full" ? "All actions incl. delete & config" :
                     level === "manage" ? "Read + Write (create, edit)" :
                     level === "view" ? "Read only, no changes" :
                     "No access, feature hidden"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PERMISSIONS TAB ── */}
      {tab === "permissions" && (
        <div className="space-y-3">
          {/* Filter + legend */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Filter:</span>
              {groups.map(g => (
                <button key={g} onClick={() => setFilterGroup(g)}
                  className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${filterGroup === g ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {(Object.entries(ACCESS_META) as [AccessLevel, typeof ACCESS_META[AccessLevel]][]).map(([l, m]) => (
                <span key={l} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${m.bg} ${m.text}`}>
                  {m.icon} {m.label}
                </span>
              ))}
              <span className="text-[10px] text-gray-400">Click cell to cycle</span>
            </div>
          </div>

          {/* Permission matrix */}
          <div className="overflow-x-auto rounded border border-gray-300 shadow-sm">
            <table className="w-full text-xs border-collapse whitespace-nowrap">
              <thead>
                {/* Tier header row */}
                <tr>
                  <th className="w-[220px] bg-[#eef2f6] border-b border-r border-gray-300 px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Feature</th>
                  <th colSpan={2} className="bg-violet-600 text-white border-b border-r border-violet-700 px-3 py-2 text-center text-[10px] font-bold">
                    SaaS Platform
                  </th>
                  <th colSpan={2} className="bg-[#1e40af] text-white border-b border-r border-blue-900 px-3 py-2 text-center text-[10px] font-bold">
                    Agency / Workspace
                  </th>
                  <th colSpan={3} className="bg-sky-600 text-white border-b border-sky-700 px-3 py-2 text-center text-[10px] font-bold">
                    Client Portal
                  </th>
                </tr>
                {/* Role name row */}
                <tr className="bg-[#f8f9fa]">
                  <th className="border-b border-r border-gray-300 px-3 py-2 text-left text-[10px] font-bold text-gray-500"></th>
                  {ROLES.map((role, ri) => {
                    const RoleIcon = role.icon;
                    return (
                      <th key={role.id}
                        className={`border-b border-gray-300 px-3 py-2 text-center ${ri < ROLES.length - 1 ? "border-r" : ""}`}>
                        <div className="flex flex-col items-center gap-1">
                          <RoleIcon size={13} style={{ color: role.color }} />
                          <span className="text-[10px] font-bold text-gray-700">{role.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleFeatures.map((feature, fi) => {
                  const prevGroup = fi > 0 ? visibleFeatures[fi - 1].group : null;
                  const showGroupRow = feature.group !== prevGroup;
                  return (
                    <React.Fragment key={feature.id}>
                      {showGroupRow && (
                        <tr>
                          <td colSpan={8} className="bg-[#eef2f6] px-3 py-1.5 text-[10px] font-bold text-[#1e40af] uppercase tracking-wider border-b border-gray-300">
                            {feature.group}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="px-3 py-2.5 border-r border-gray-200 font-medium text-gray-800">{feature.label}</td>
                        {ROLES.map((role, ri) => {
                          const level = perms[role.id][feature.id as FeatureId];
                          const meta = ACCESS_META[level];
                          const isLocked = role.id === "saas_owner";
                          return (
                            <td key={role.id}
                              className={`px-2 py-2 text-center ${ri < ROLES.length - 1 ? "border-r border-gray-200" : ""} ${!isLocked ? "cursor-pointer hover:bg-gray-100" : ""}`}
                              onClick={() => cycleAccess(role.id as RoleId, feature.id as FeatureId)}
                              title={isLocked ? "SaaS Owner always has full access" : `Click to change: currently ${level}`}
                            >
                              <span className={`inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold min-w-[52px] ${meta.bg} ${meta.text} ${isLocked ? "opacity-70" : ""}`}>
                                {meta.icon} {meta.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save note */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Lock size={11} /> SaaS Owner permissions are locked — always full access.
              Click any other cell to cycle through access levels.
            </p>
            <Btn onClick={() => showToast("Permissions saved successfully!")}>
              Save Changes
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Agencies View (SaaS Owner only) ─────────────────────────────────────────

const MOCK_AGENCIES = MOCK_AGENCIES_DATA;

const AGENCY_PLAN_COLORS: Record<string, string> = {
  Enterprise: "blue", Pro: "violet", Starter: "gray",
};

const AgenciesView = ({ showToast }: { showToast: (m: string) => void }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [agencyTab, setAgencyTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");

  const agency = MOCK_AGENCIES.find(a => a._id === selected);

  const filtered = MOCK_AGENCIES.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.name.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchPlan = planFilter === "All" || a.plan === planFilter;
    return matchQ && matchPlan;
  });

  const selectAgency = (id: string) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    setAgencyTab("Overview");
  };

  const totalSpend = MOCK_AGENCIES.reduce((s, a) => s + a.monthlySpend, 0);

  return (
    <div className="p-5 space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-300">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">Agencies</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {MOCK_AGENCIES.filter(a => a.status === "active").length} active · {MOCK_AGENCIES.length} total workspaces on this platform
          </p>
        </div>
        <Btn onClick={() => showToast("Add agency form coming soon!")}>
          <Plus size={14} className="mr-2" /> Add Agency
        </Btn>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Agencies",      value: MOCK_AGENCIES.length,                                      sub: "all time",            variant: "blue",    icon: Building2 },
          { label: "Active Workspaces",   value: MOCK_AGENCIES.filter(a => a.status === "active").length,  sub: "currently running",   variant: "emerald", icon: CheckCircle2 },
          { label: "Total Clients",       value: MOCK_AGENCIES.reduce((s, a) => s + a.clients, 0),         sub: "across all agencies", variant: "blue",    icon: Users },
          { label: "Platform MTD Spend",  value: fmtBDT(totalSpend),                                        sub: "August 2026",         variant: "amber",   icon: BarChart2 },
        ].map((s, i) => {
          const KpiIcon = s.icon;
          return (
            <div key={i} className="bg-white border border-gray-200 rounded shadow-sm p-4 flex items-start gap-3">
              <div className="size-9 rounded bg-[#eef2f6] flex items-center justify-center shrink-0">
                <KpiIcon size={16} className="text-[#1e40af]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-8 text-xs"
            placeholder="Search by agency name, owner, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {["All", "Enterprise", "Pro", "Starter"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${planFilter === p ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              {p}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Main layout: table + detail panel */}
      <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: selected ? "1fr 420px" : "1fr" }}>

        {/* ── Agency Table ── */}
        <div>
          <TabHeader title="Agency List" />
          <Card className="border-t-0 rounded-tl-none overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e40af] text-white">
                  {["Agency / ID", "Owner", "Contact", "Plan", "Clients", "Campaigns", "MTD Spend", "Status", "Action"].map((h, i, a) => (
                    <th key={h} className={`px-3 py-2.5 font-bold text-left whitespace-nowrap ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-xs">No agencies match your search.</td></tr>
                )}
                {filtered.map(ag => (
                  <tr key={ag._id}
                    onClick={() => selectAgency(ag._id)}
                    className={`border-b border-gray-200 cursor-pointer transition-colors ${selected === ag._id ? "bg-blue-50" : "hover:bg-[#fafbff]"}`}>
                    <td className="px-3 py-3 border-r border-gray-200 min-w-[180px]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: ag.color }}>
                          {ag.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#1e40af] leading-tight">{ag.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{ag.agencyId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200 font-semibold text-gray-800 whitespace-nowrap">{ag.owner}</td>
                    <td className="px-3 py-3 border-r border-gray-200 text-gray-500 whitespace-nowrap">{ag.email}</td>
                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                      <Badge variant={AGENCY_PLAN_COLORS[ag.plan] ?? "gray"}>{ag.plan}</Badge>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200 text-center font-bold text-gray-800">{ag.clients}</td>
                    <td className="px-3 py-3 border-r border-gray-200 text-center font-bold text-gray-800">{ag.campaigns}</td>
                    <td className="px-3 py-3 border-r border-gray-200 font-bold text-[#1e40af] whitespace-nowrap">{fmtBDT(ag.monthlySpend)}</td>
                    <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap"><StatusBadge status={ag.status} /></td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); showToast(`Managing ${ag.name}`); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-[#1e40af] hover:text-white transition-colors border border-gray-200">
                        <Edit2 size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ── Agency Detail Panel ── */}
        {agency && (
          <div className="space-y-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between">
              <TabHeader title="Agency Detail" />
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 p-1"><X size={15} /></button>
            </div>
            <Card className="border-t-0 rounded-tl-none overflow-hidden">

              {/* Agency hero */}
              <div className="p-4 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${agency.color}10 0%, #f8f9fa 100%)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm" style={{ backgroundColor: agency.color }}>
                    {agency.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-base leading-tight">{agency.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{agency.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={AGENCY_PLAN_COLORS[agency.plan] ?? "gray"}>{agency.plan} Plan</Badge>
                      <StatusBadge status={agency.status} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Clients",     v: agency.clients },
                    { l: "Campaigns",   v: agency.campaigns },
                    { l: "Ad Accounts", v: agency.adAccounts },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded border border-gray-200 p-2 text-center shadow-sm">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.l}</p>
                      <p className="text-xl font-bold mt-0.5" style={{ color: agency.color }}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-gray-200 bg-[#f8f9fa]">
                {["Overview", "Billing", "Actions"].map(t => (
                  <button key={t} onClick={() => setAgencyTab(t)}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${agencyTab === t ? "border-[#1e40af] text-[#1e40af] bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {agencyTab === "Overview" && (
                <div className="divide-y divide-gray-100">
                  {[
                    ["Agency ID",       agency.agencyId],
                    ["Owner",           agency.owner],
                    ["Phone",           agency.phone],
                    ["Website",         agency.website],
                    ["Billing Cycle",   agency.billingCycle],
                    ["Joined Date",     agency.joinedDate],
                    ["Contract Ends",   agency.contractEnds],
                    ["MTD Spend",       fmtBDT(agency.monthlySpend)],
                    ["Total Spend",     fmtBDT(agency.totalSpend)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28 shrink-0">{l}</span>
                      <span className="text-xs font-semibold text-gray-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {agencyTab === "Billing" && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "MTD Spend",   value: fmtBDT(agency.monthlySpend), variant: "blue" },
                      { label: "Total Spend", value: fmtBDT(agency.totalSpend),   variant: "amber" },
                    ].map((s, i) => (
                      <div key={i} className="border border-gray-200 rounded p-3 bg-[#fafafa]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
                        <p className="text-base font-bold text-[#1e40af] mt-1">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded">
                    {[
                      ["Plan",            agency.plan],
                      ["Billing Cycle",   agency.billingCycle],
                      ["Contract Ends",   agency.contractEnds],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{l}</span>
                        <span className="text-xs font-semibold text-gray-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agencyTab === "Actions" && (
                <div className="p-4 space-y-2">
                  {[
                    { label: "View Workspace",    icon: Eye,         variant: "secondary", msg: `Viewing ${agency.name}'s workspace` },
                    { label: "Edit Agency Info",  icon: Edit2,       variant: "secondary", msg: "Agency edit form" },
                    { label: "Impersonate Owner", icon: UserCog,     variant: "secondary", msg: "Impersonating agency owner" },
                    { label: "Suspend Agency",    icon: Lock,        variant: "destructive", msg: `${agency.name} suspended` },
                  ].map(({ label, icon: Icon, variant, msg }) => (
                    <Btn key={label} variant={variant} className="w-full justify-start gap-2 text-xs"
                      onClick={() => showToast(msg)}>
                      <Icon size={13} /> {label}
                    </Btn>
                  ))}
                </div>
              )}

              <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
                <Btn variant="secondary" className="flex-1 text-xs" onClick={() => showToast("Workspace opened")}>
                  <Eye size={12} className="mr-1.5" /> Open Workspace
                </Btn>
                <Btn className="flex-1 text-xs" onClick={() => showToast("Changes saved!")}>
                  <CheckCircle2 size={12} className="mr-1.5" /> Save Changes
                </Btn>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Clients View (Agency Owner / Agency Team) ────────────────────────────────

const CLIENT_AD_MAPPINGS: Record<string, { type: "account" | "campaign"; campaigns?: string[] }> = {
  c1: { type: "account" },
  c2: { type: "campaign", campaigns: ["k2"] },
  c3: { type: "account" },
  c4: { type: "campaign", campaigns: ["k4"] },
  c5: { type: "account" },
};

const ClientsView = ({ viewRole, showToast }: { viewRole: string; showToast: (m: string) => void }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState("General");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [mappingType, setMappingType] = useState<Record<string, "account" | "campaign">>(
    Object.fromEntries(Object.entries(CLIENT_AD_MAPPINGS).map(([k, v]) => [k, v.type]))
  );

  const client = CLIENT_PROFILES.find(c => c._id === selected);
  const clientAccount = client ? FB_AD_ACCOUNTS.find(a => a.accountId === client.adAccount) : null;
  const clientCampaigns = client ? CAMPAIGNS.filter(k => k.client._id === client._id) : [];

  const filtered = CLIENT_PROFILES.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.clientId.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchQ && matchStatus;
  });

  const selectClient = (id: string) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    setProfileTab("General");
  };

  const totalSpend = CLIENT_PROFILES.reduce((s, c) => {
    const campaign = CAMPAIGNS.filter(k => k.client._id === c._id);
    return s + campaign.reduce((a, k) => a + k.spend, 0);
  }, 0);

  return (
    <div className="p-5 space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-300">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e40af] tracking-tight">Clients</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {CLIENT_PROFILES.filter(c => c.status === "active").length} active · {CLIENT_PROFILES.length} total clients in this workspace
          </p>
        </div>
        {viewRole !== "Client" && (
          <Btn onClick={() => showToast("Add client form coming soon!")}>
            <Plus size={14} className="mr-2" /> Add Client
          </Btn>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Clients",    value: CLIENT_PROFILES.length,                                   sub: "in workspace",      variant: "blue",    icon: Users },
          { label: "Active Clients",   value: CLIENT_PROFILES.filter(c => c.status === "active").length, sub: "running campaigns", variant: "emerald", icon: CheckCircle2 },
          { label: "Total MTD Spend",  value: fmtBDT(totalSpend),                                        sub: "August 2026",       variant: "amber",   icon: BarChart2 },
          { label: "Ad Accounts",      value: FB_AD_ACCOUNTS.length,                                     sub: "linked accounts",   variant: "blue",    icon: Briefcase },
        ].map((s, i) => {
          const KpiIcon = s.icon;
          return (
            <div key={i} className="bg-white border border-gray-200 rounded shadow-sm p-4 flex items-start gap-3">
              <div className="size-9 rounded bg-[#eef2f6] flex items-center justify-center shrink-0">
                <KpiIcon size={16} className="text-[#1e40af]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-8 text-xs"
            placeholder="Search by name, contact, email, or Client ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {["All", "active", "inactive"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded border capitalize transition-colors ${statusFilter === s ? "bg-[#1e40af] text-white border-[#1e40af]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              {s === "All" ? "All" : s === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Main layout: table + detail panel */}
      <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: selected ? "1fr 460px" : "1fr" }}>

        {/* ── Client Table ── */}
        <div>
          <TabHeader title="Client List" />
          <Card className="border-t-0 rounded-tl-none overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e40af] text-white">
                  {["Client / ID", "Contact Person", "Industry", "Ad Account", "Mapping", "Billing %", "Joined", "Status", ""].map((h, i, a) => (
                    <th key={h} className={`px-3 py-2.5 font-bold text-left whitespace-nowrap ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-xs">No clients match your search.</td></tr>
                )}
                {filtered.map(c => {
                  const mapType = mappingType[c._id] ?? "account";
                  return (
                    <tr key={c._id}
                      onClick={() => selectClient(c._id)}
                      className={`border-b border-gray-200 cursor-pointer transition-colors ${selected === c._id ? "bg-blue-50" : "hover:bg-[#fafbff]"}`}>
                      <td className="px-3 py-3 border-r border-gray-200 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: c.color }}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#1e40af] leading-tight">{c.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.clientId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                        <p className="font-semibold text-gray-800">{c.contactName}</p>
                        <p className="text-[10px] text-gray-400">{c.email}</p>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 text-gray-600 whitespace-nowrap">{c.industry}</td>
                      <td className="px-3 py-3 border-r border-gray-200 font-mono text-gray-500 whitespace-nowrap text-[11px]">{c.adAccount}</td>
                      <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${mapType === "account" ? "bg-blue-100 text-[#1e40af]" : "bg-violet-100 text-violet-700"}`}>
                          {mapType === "account" ? "Account Level" : "Campaign Level"}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 text-center font-bold text-gray-800">{c.billingRate}%</td>
                      <td className="px-3 py-3 border-r border-gray-200 text-gray-500 whitespace-nowrap">{c.joinedDate}</td>
                      <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); showToast(`Managing ${c.name}`); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-[#1e40af] hover:text-white transition-colors border border-gray-200">
                          <Edit2 size={11} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ── Client Detail Panel ── */}
        {client && (
          <div className="space-y-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between">
              <TabHeader title="Client Profile" />
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 p-1"><X size={15} /></button>
            </div>
            <Card className="border-t-0 rounded-tl-none overflow-hidden">

              {/* Client hero */}
              <div className="p-4 border-b border-gray-200" style={{ background: `linear-gradient(135deg, ${client.color}10 0%, #f8f9fa 100%)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm" style={{ backgroundColor: client.color }}>
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-base leading-tight">{client.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{client.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{client.clientId}</span>
                      <StatusBadge status={client.status} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Campaigns",   v: clientCampaigns.length },
                    { l: "Billing %",   v: `${client.billingRate}%` },
                    { l: "Joined",      v: client.joinedDate.slice(0, 7) },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded border border-gray-200 p-2 text-center shadow-sm">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.l}</p>
                      <p className="text-sm font-bold text-[#1e40af] mt-0.5">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-gray-200 bg-[#f8f9fa] overflow-x-auto">
                {["General", "Ad Mapping", "Billing", "Documents"].map(t => (
                  <button key={t} onClick={() => setProfileTab(t)}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${profileTab === t ? "border-[#1e40af] text-[#1e40af] bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* ── General Tab ── */}
              {profileTab === "General" && (
                <div>
                  <div className="bg-[#eef2f6] px-4 py-2 text-[#1e40af] font-bold text-[11px] uppercase tracking-wider border-b border-gray-200">
                    Business Information
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      ["Company Reg. No.", client.regNo],
                      ["Industry",         client.industry],
                      ["Contact Person",   client.contactName],
                      ["Email",            client.email],
                      ["Phone",            client.phone],
                      ["Address",          client.address],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-start justify-between px-4 py-2.5 gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{l}</span>
                        <span className="text-xs font-semibold text-gray-800 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#eef2f6] px-4 py-2 text-[#1e40af] font-bold text-[11px] uppercase tracking-wider border-y border-gray-200">
                    Platform Preferences
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      ["Platform",    client.platform],
                      ["Objectives",  client.objective],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28 shrink-0">{l}</span>
                        <span className="text-xs font-semibold text-gray-800 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Ad Mapping Tab ── */}
              {profileTab === "Ad Mapping" && (
                <div className="p-4 space-y-4">
                  {/* Mapping type toggle */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Access Level</p>
                    <div className="flex rounded border border-gray-300 overflow-hidden">
                      {(["account", "campaign"] as const).map(type => (
                        <button key={type} onClick={() => setMappingType(m => ({ ...m, [client._id]: type }))}
                          className={`flex-1 py-2 text-xs font-bold transition-colors ${mappingType[client._id] === type ? "bg-[#1e40af] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                          {type === "account" ? "Account Level" : "Campaign Level"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {mappingType[client._id] === "account"
                        ? "Client can see all data across the linked ad account."
                        : "Client can only see the specific campaigns assigned to them."}
                    </p>
                  </div>

                  {/* Linked ad account */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Linked Ad Account</p>
                    {clientAccount ? (
                      <div className="border border-gray-200 rounded p-3 bg-[#fafafa] space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-[#1e40af]">{clientAccount.name}</p>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">{clientAccount.accountId}</p>
                          </div>
                          <StatusBadge status={clientAccount.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Spent</p>
                            <p className="text-xs font-bold text-gray-800">{fmtBDT(clientAccount.amountSpent)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">Balance</p>
                            <p className="text-xs font-bold text-gray-800">{fmtBDT(clientAccount.balance)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-300 rounded p-4 text-center text-xs text-gray-400">No ad account linked</div>
                    )}
                  </div>

                  {/* Assigned campaigns (campaign-level only) */}
                  {mappingType[client._id] === "campaign" && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Campaigns</p>
                      {clientCampaigns.length === 0 ? (
                        <div className="border border-dashed border-gray-300 rounded p-4 text-center text-xs text-gray-400">No campaigns assigned</div>
                      ) : (
                        <div className="space-y-2">
                          {clientCampaigns.map(k => (
                            <div key={k._id} className="border border-gray-200 rounded p-3 bg-[#fafafa] flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-gray-800 truncate">{k.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{fmtBDT(k.spend)} spent</p>
                              </div>
                              <StatusBadge status={k.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Billing Tab ── */}
              {profileTab === "Billing" && (
                <div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Billing Rate",   value: `${client.billingRate}%`,   variant: "blue" },
                      { label: "Total Spend",    value: fmtBDT(clientCampaigns.reduce((s, k) => s + k.spend, 0)), variant: "amber" },
                    ].map((s, i) => (
                      <div key={i} className="border border-gray-200 rounded p-3 bg-[#fafafa]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
                        <p className="text-base font-bold text-[#1e40af] mt-1">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="border border-dashed border-gray-300 rounded p-5 text-center">
                      <p className="text-xs text-gray-400">Billing history and invoice details will appear here.</p>
                      <Btn variant="secondary" className="mt-3 text-xs" onClick={() => showToast("Billing history coming soon!")}>
                        <Download size={12} className="mr-1.5" /> Download Invoice
                      </Btn>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Documents Tab ── */}
              {profileTab === "Documents" && (
                <div className="p-4">
                  <div className="border border-dashed border-gray-300 rounded p-6 text-center space-y-2">
                    <UploadCloud size={28} className="mx-auto text-gray-300" />
                    <p className="text-xs font-semibold text-gray-500">No documents uploaded yet</p>
                    <p className="text-[10px] text-gray-400">Upload contracts, trade licenses, and agreements.</p>
                    <Btn variant="secondary" className="mt-2 text-xs" onClick={() => showToast("File upload coming soon!")}>
                      <UploadCloud size={12} className="mr-1.5" /> Upload Document
                    </Btn>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex justify-between items-center gap-2 p-3 border-t border-gray-200 bg-gray-50">
                <Btn variant="secondary" className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                  onClick={() => { showToast("Client removed!"); setSelected(null); }}>
                  Remove Client
                </Btn>
                <Btn className="text-xs" onClick={() => showToast("Client profile saved!")}>
                  <CheckCircle2 size={13} className="mr-1.5" /> Save Changes
                </Btn>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

// Role-based navigation definitions
const NAV_SAAS_OWNER = [
  { section: "PLATFORM" },
  { id: "dashboard",  label: "Dashboard",           icon: LayoutDashboard },
  { id: "agencies",   label: "Agencies",             icon: Building2 },
  { section: "ACCESS CONTROL" },
  { id: "roles",      label: "Roles & Permissions",  icon: ShieldCheck },
  { id: "settings",   label: "System Profile",       icon: Settings },
];

const NAV_AGENCY_OWNER = [
  { section: "PORTAL MAIN" },
  { id: "dashboard",       label: "Dashboard",          icon: LayoutDashboard },
  { id: "clients",         label: "Clients",            icon: Users },
  { section: "OPERATIONS" },
  { id: "requests",        label: "Ad Requests",        icon: FileText },
  { id: "campaigns",       label: "Live Campaigns",     icon: Megaphone },
  { section: "FINANCIAL" },
  { id: "adaccounts",      label: "Ad Accounts",        icon: Briefcase },
  { id: "billing",         label: "Payment Dues",       icon: CreditCard },
  { id: "payment_details", label: "Payment Details",    icon: Receipt },
  { section: "ACCESS CONTROL" },
  { id: "roles",           label: "Roles & Permissions",icon: ShieldCheck },
  { id: "settings",        label: "System Profile",     icon: Settings },
];

const NAV_AGENCY_TEAM = [
  { section: "PORTAL MAIN" },
  { id: "dashboard",       label: "Dashboard",      icon: LayoutDashboard },
  { id: "clients",         label: "Clients",        icon: Users },
  { section: "OPERATIONS" },
  { id: "requests",        label: "Ad Requests",    icon: FileText },
  { id: "campaigns",       label: "Live Campaigns", icon: Megaphone },
  { section: "FINANCIAL" },
  { id: "adaccounts",      label: "Ad Accounts",    icon: Briefcase },
  { id: "billing",         label: "Payment Dues",   icon: CreditCard },
  { id: "payment_details", label: "Payment Details",icon: Receipt },
];

const NAV_CLIENT = [
  { section: "PORTAL MAIN" },
  { id: "dashboard",       label: "Dashboard",      icon: LayoutDashboard },
  { section: "OPERATIONS" },
  { id: "requests",        label: "Ad Requests",    icon: FileText },
  { id: "campaigns",       label: "Live Campaigns", icon: Megaphone },
  { section: "FINANCIAL" },
  { id: "billing",         label: "Payment Dues",   icon: CreditCard },
  { id: "payment_details", label: "Payment Details",icon: Receipt },
  { section: "ACCOUNT" },
  { id: "settings",        label: "My Profile",     icon: UserCircle2 },
];

type RoleKey = "SaaS Owner" | "Agency Owner" | "Agency Team" | "Client";

const ROLE_NAVS: Record<RoleKey, typeof NAV_SAAS_OWNER> = {
  "SaaS Owner":   NAV_SAAS_OWNER,
  "Agency Owner": NAV_AGENCY_OWNER,
  "Agency Team":  NAV_AGENCY_TEAM,
  "Client":       NAV_CLIENT,
};

const ROLE_COLORS: Record<RoleKey, string> = {
  "SaaS Owner":   "#7c3aed",
  "Agency Owner": "#1e40af",
  "Agency Team":  "#0891b2",
  "Client":       "#059669",
};

const DEFAULT_VIEWS: Record<RoleKey, string> = {
  "SaaS Owner":   "agencies",
  "Agency Owner": "dashboard",
  "Agency Team":  "dashboard",
  "Client":       "dashboard",
};

export default function App() {
  const [viewRole, setViewRole] = useState<RoleKey>("Agency Owner");
  const [currentView, setCurrentView] = useState("dashboard");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showToast = (message: string, type = "success") => setToast({ message, type });

  const navigate = (id: string) => { setCurrentView(id); setMobileOpen(false); };

  const switchRole = (role: RoleKey) => {
    setViewRole(role);
    setCurrentView(DEFAULT_VIEWS[role]);
    setMobileOpen(false);
  };

  const navigation = ROLE_NAVS[viewRole];

  const roleColor = ROLE_COLORS[viewRole];
  const roleBgStyle = { backgroundColor: roleColor };

  const renderNav = (items: typeof navigation, mobile = false) => items.map((item, idx) => {
    if ("section" in item) return (
      <div key={`sec-${idx}`} className="px-4 pt-4 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.section}</div>
    );
    const navItem = item as { id: string; label: string; icon: React.ElementType };
    const isActive = currentView === navItem.id;
    const NavIcon = navItem.icon;
    return (
      <button key={navItem.id} onClick={() => navigate(navItem.id)}
        className={`w-full flex items-center gap-3 px-4 ${mobile ? "py-3" : "py-2.5"} text-sm transition-colors border-l-4 ${isActive ? "font-bold" : "border-transparent text-gray-700 hover:bg-gray-50"}`}
        style={isActive ? { color: roleColor, borderLeftColor: roleColor, backgroundColor: `${roleColor}12` } : undefined}>
        <NavIcon size={17} style={isActive ? { color: roleColor } : { color: "#6b7280" }} />
        {navItem.label}
      </button>
    );
  });

  return (
    <div className="flex h-screen bg-[#f0f4f8] text-gray-800 overflow-hidden" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-300 z-30 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="md:hidden" style={{ color: roleColor }} onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
          <div className="hidden md:flex items-center gap-2 font-bold text-xl tracking-tight" style={{ color: roleColor }}>
            <Shield size={22} style={{ fill: roleColor, color: "white" }} /> ADFLOW PRO
          </div>
        </div>
        {/* Role indicator pill in header */}
        <div className="hidden md:flex items-center gap-2 mx-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Viewing as:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={roleBgStyle}>{viewRole}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(viewRole)}&background=${roleColor.replace("#","")}&color=fff&bold=true`}
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-gray-300"
          />
          <span className="font-bold text-sm hidden sm:block" style={{ color: roleColor }}>{viewRole} <ChevronDown size={13} className="inline ml-0.5" /></span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-300 hidden md:flex flex-col mt-14 z-20 shadow-sm">
        <nav className="flex-1 py-3 overflow-y-auto">
          {renderNav(navigation)}
        </nav>

        {/* Role switcher */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Simulate Role</p>
          <div className="grid grid-cols-2 gap-1">
            {(["SaaS Owner", "Agency Owner", "Agency Team", "Client"] as RoleKey[]).map(r => (
              <button key={r} onClick={() => switchRole(r)}
                className={`text-[10px] font-bold py-1.5 px-2 rounded border transition-colors text-left truncate ${viewRole === r ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
                style={viewRole === r ? { backgroundColor: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] } : undefined}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full mt-14 overflow-y-auto">
        <div className="flex-1">
          {currentView === "dashboard"       && <DashboardView viewRole={viewRole} />}
          {currentView === "agencies"        && <AgenciesView showToast={showToast} />}
          {currentView === "clients"         && <ClientsView viewRole={viewRole} showToast={showToast} />}
          {currentView === "requests"        && <RequestsView viewRole={viewRole} showToast={showToast} />}
          {currentView === "campaigns"       && <CampaignsView viewRole={viewRole} showToast={showToast} />}
          {currentView === "billing"         && <BillingView viewRole={viewRole} showToast={showToast} />}
          {currentView === "payment_details" && <PaymentDetailsView />}
          {currentView === "settings"        && <SettingsView viewRole={viewRole} showToast={showToast} />}
          {currentView === "roles"           && <RolesView showToast={showToast} />}
          {currentView === "adaccounts"      && (
            <div className="p-4 max-w-[1400px] mx-auto space-y-3 animate-in fade-in duration-300">
              <TabHeader title="Ad Accounts" />
              <Card className="border-t-0 rounded-tl-none overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-[#1e40af] text-white">
                    <tr>
                      {["Account Name", "Account ID", "Status", "Spent", "Balance", "Campaigns"].map((h, i, a) => (
                        <th key={h} className={`px-3 py-2.5 font-bold text-left ${i < a.length - 1 ? "border-r border-[#1e3a8a]" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FB_AD_ACCOUNTS.map(acc => (
                      <tr key={acc._id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2.5 border-r border-gray-200 font-bold text-[#1e40af]">{acc.name}</td>
                        <td className="px-3 py-2.5 border-r border-gray-200 font-mono text-gray-600 text-[11px]">{acc.accountId}</td>
                        <td className="px-3 py-2.5 border-r border-gray-200"><StatusBadge status={acc.status} /></td>
                        <td className="px-3 py-2.5 border-r border-gray-200 font-medium text-gray-800">{fmtBDT(acc.amountSpent)}</td>
                        <td className="px-3 py-2.5 border-r border-gray-200 font-medium text-gray-800">{fmtBDT(acc.balance)}</td>
                        <td className="px-3 py-2.5 text-gray-700">{acc.campaigns.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
        <footer className="py-5 text-center text-xs font-semibold border-t border-gray-200 bg-white" style={{ color: roleColor }}>
          Copyright © 2026 All Rights Reserved ·{" "}
          <span className="font-normal text-gray-500">Developed by Tech Unit, AdFlow Pro</span>
        </footer>
      </main>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] md:hidden flex">
          <div className="w-64 bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 text-white" style={roleBgStyle}>
              <span className="font-bold text-lg">{viewRole}</span>
              <button onClick={() => setMobileOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              {renderNav(navigation, true)}
            </nav>
            <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Switch Role</p>
              <div className="grid grid-cols-2 gap-1">
                {(["SaaS Owner", "Agency Owner", "Agency Team", "Client"] as RoleKey[]).map(r => (
                  <button key={r} onClick={() => switchRole(r)}
                    className={`text-[10px] font-bold py-1.5 px-2 rounded border transition-colors text-left truncate ${viewRole === r ? "text-white" : "bg-white text-gray-600 border-gray-300"}`}
                    style={viewRole === r ? { backgroundColor: ROLE_COLORS[r] } : undefined}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </div>
  );
}
