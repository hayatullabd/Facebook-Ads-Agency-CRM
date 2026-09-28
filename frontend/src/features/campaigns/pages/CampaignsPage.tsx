import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, Link2, Megaphone, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { AdRequest, Campaign, Client, FacebookAdAccount, Role } from "../../../types/crm";
import type { CampaignRangeInsightsResponse, AccountReportRow } from "../campaignsApi";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { isAgencyStaff } from "../../../lib/permissions";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";
type DateRange = { since: string; until: string };
type RangePreset = "today" | "yesterday" | "last7" | "last14" | "last30" | "custom";
type Props = { campaigns: Campaign[]; accounts: FacebookAdAccount[]; clients: Client[]; requests: AdRequest[]; role: Role; onLoadInsights: (range: DateRange, signal?: AbortSignal) => Promise<CampaignRangeInsightsResponse>; onLoadAccountReport: (range: DateRange, signal?: AbortSignal) => Promise<AccountReportRow[]>; onAssignCampaignClient: (campaignId: string, clientId: string | null) => Promise<void>; onAssignCampaignRequest: (campaignId: string, adRequestId: string | null) => Promise<void>; onAssignClientAdAccount: (clientId: string, accountId: string, assigned: boolean) => Promise<void> };
const statuses: Campaign["status"][] = ["draft", "scheduled", "active", "paused", "completed", "failed"];
const rangePresets: Array<{ value: RangePreset; label: string }> = [{ value: "today", label: "Today" }, { value: "yesterday", label: "Yesterday" }, { value: "last7", label: "Last 7 days" }, { value: "last14", label: "Last 14 days" }, { value: "last30", label: "Last 30 days" }, { value: "custom", label: "Custom" }];
const toLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localDate = (value: string) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const offsetLocalDate = (date: Date, days: number) => { const next = new Date(date.getFullYear(), date.getMonth(), date.getDate()); next.setDate(next.getDate() + days); return next; };
const presetRange = (preset: Exclude<RangePreset, "custom">, today = new Date()): DateRange => {
  const endOffset = preset === "yesterday" ? -1 : 0;
  const days = preset === "last7" ? 7 : preset === "last14" ? 14 : preset === "last30" ? 30 : 1;
  const until = offsetLocalDate(today, endOffset);
  return { since: toLocalDate(offsetLocalDate(until, -(days - 1))), until: toLocalDate(until) };
};
const rangeDays = (range: DateRange) => Math.round((localDate(range.until).getTime() - localDate(range.since).getTime()) / 86400000) + 1;
const rangeLabel = (range: DateRange) => `${formatDate(`${range.since}T00:00:00`)} – ${formatDate(`${range.until}T00:00:00`)}`;
const validateRange = (range: DateRange, today: string) => !range.since || !range.until ? "Choose both start and end dates." : range.since > range.until ? "Start date must be on or before end date." : range.until > today ? "Date range cannot include future dates." : rangeDays(range) > 93 ? "Date range cannot exceed 93 days." : "";
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const metricLabel = (value?: string) => value ? value.replaceAll("_", " ").replaceAll(".", " · ") : "Result";
const readableStatus = (value?: string) => value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";
const deliveryView = (value?: string) => {
  const key = String(value || "").trim().toLowerCase().replaceAll("_", " ");
  const known: Record<string, { label: string; dot: string }> = {
    active: { label: "Active", dot: "bg-emerald-500" },
    off: { label: "Off", dot: "bg-slate-400" },
    paused: { label: "Off", dot: "bg-slate-400" },
    completed: { label: "Completed", dot: "bg-slate-400" },
    scheduled: { label: "Scheduled", dot: "bg-sky-500" },
    "in review": { label: "In review", dot: "bg-amber-500" },
    "pending review": { label: "In review", dot: "bg-amber-500" },
    pending: { label: "Pending", dot: "bg-amber-500" },
    rejected: { label: "Rejected", dot: "bg-red-500" },
    disapproved: { label: "Rejected", dot: "bg-red-500" },
    "not delivering": { label: "Not delivering", dot: "bg-red-500" },
    "with issues": { label: "Not delivering", dot: "bg-red-500" },
    error: { label: "Error", dot: "bg-red-500" },
    failed: { label: "Error", dot: "bg-red-500" },
    processing: { label: "Processing", dot: "bg-sky-500" },
    "in process": { label: "Processing", dot: "bg-sky-500" },
    archived: { label: "Archived", dot: "bg-slate-400" },
    deleted: { label: "Deleted", dot: "bg-slate-400" },
  };
  if (known[key]) return known[key];
  if (key.includes("paused")) return { label: "Off", dot: "bg-slate-400" };
  return { label: readableStatus(value), dot: "bg-slate-300" };
};
const displayRangeMoney = (value: number | null | undefined, currency = "USD") => value == null ? "—" : formatMoney(value, currency);

const displayMetricNumber = (value: number | null | undefined) => value == null ? "—" : compactNumber.format(value);
const adsCount = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : Math.round(value).toLocaleString("en-US");
const adsMoney = (value: number | null | undefined, currency = "USD") => {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatMoney(value, currency);
};
const metricStack = (value: string, detail?: string) => <span className="inline-flex max-w-[9.5rem] flex-col items-end leading-[14px]"><span className="font-semibold tabular-nums">{value}</span>{detail ? <span className="max-w-full truncate text-[10px] font-normal text-slate-500" title={detail}>{detail}</span> : null}</span>;
const PER_RESULT: Record<string, string> = {
  "Post engagements": "Per Post engagement",
  "Follows or likes": "Per Follow or like",
  "Messaging conversations started": "Per Messaging conversation",
  "Website purchases": "Per Purchase",
  "Link clicks": "Per Link click",
  "Landing page views": "Per Landing page view",
  Leads: "Per Lead",
  "App installs": "Per App install",
  ThruPlays: "Per ThruPlay",
  Reach: "Per 1,000 accounts reached",
  Impressions: "Per 1,000 impressions",
  Calls: "Per Call",
};
const displayPercent = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

type MetricId = "delivery" | "actions" | "budget" | "results" | "costPerResult" | "amountSpent" | "ctrAll" | "reach" | "impressions" | "ends" | "landingPageViews" | "linkClicks" | "postEngagements" | "reactions" | "comments" | "shares" | "videoViews" | "purchases" | "purchaseValue" | "leads" | "costPerLead" | "messagingConversations" | "appInstalls" | "registrations" | "pageLikes";
type ActionMetricId = "linkClicks" | "postEngagements" | "reactions" | "comments" | "shares" | "videoViews" | "purchases" | "purchaseValue" | "leads" | "messagingConversations" | "appInstalls" | "registrations" | "pageLikes";
type DatePreset = { name: string; range: DateRange };
const metricColumns: Array<{ id: MetricId; label: string }> = [
  { id: "delivery", label: "Delivery" },
  { id: "results", label: "Results" },
  { id: "costPerResult", label: "Cost per result" },
  { id: "budget", label: "Budget" },
  { id: "amountSpent", label: "Amount spent" },
  { id: "impressions", label: "Impressions" },
  { id: "reach", label: "Reach" },
  { id: "actions", label: "Actions" },
  { id: "ctrAll", label: "CTR (all)" },
  { id: "ends", label: "Ends" },
  { id: "landingPageViews", label: "Landing page views" },
  { id: "linkClicks", label: "Link clicks" },
  { id: "postEngagements", label: "Post engagements" },
  { id: "reactions", label: "Post reactions" },
  { id: "comments", label: "Comments" },
  { id: "shares", label: "Post shares" },
  { id: "videoViews", label: "Video views" },
  { id: "purchases", label: "Purchases" },
  { id: "purchaseValue", label: "Purchase conversion value" },
  { id: "leads", label: "Leads" },
  { id: "costPerLead", label: "Cost per lead" },
  { id: "messagingConversations", label: "Messaging conversations started" },
  { id: "appInstalls", label: "App installs" },
  { id: "registrations", label: "Registrations completed" },
  { id: "pageLikes", label: "Page likes" },
];
const defaultMetrics: MetricId[] = ["delivery", "results", "costPerResult", "budget", "amountSpent", "impressions", "reach"];
const actionAliases: Record<ActionMetricId, string[]> = {
  linkClicks: ["link_click", "onsite_conversion.link_click"],
  postEngagements: ["post_engagement", "post_engagements"],
  reactions: ["post_reaction", "reaction"],
  comments: ["comment", "comment_created"],
  shares: ["post", "post_share"],
  videoViews: ["video_view", "thruplay"],
  purchases: ["purchase", "offsite_conversion.purchase"],
  purchaseValue: ["value", "purchase_value", "offsite_conversion.purchase_value"],
  leads: ["lead", "offsite_conversion.lead", "onsite_conversion.lead_grouped"],
  messagingConversations: ["messaging_conversation_started", "onsite_conversion.messaging_conversation_started_7d", "messaging_first_reply"],
  appInstalls: ["app_install", "mobile_app_install"],
  registrations: ["complete_registration", "onsite_conversion.registration"],
  pageLikes: ["like", "page_like"],
};
const isActionMetric = (metric: MetricId): metric is ActionMetricId => metric in actionAliases;
const actionMetricValue = (actions: Array<{ actionType: string; value: number }>, metric: ActionMetricId) => {
  const aliases = actionAliases[metric];
  return actions.reduce((total, action) => aliases.includes(action.actionType.toLowerCase()) ? total + action.value : total, 0);
};
const datePresetKey = "adflow_campaign_date_presets_v1";
const readStorage = <T,>(key: string, fallback: T, validate: (value: unknown) => value is T) => { if (typeof window === "undefined") return fallback; try { const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "null"); return validate(parsed) ? parsed : fallback; } catch { return fallback; } };
const saveStorage = (key: string, value: unknown) => { try { window.localStorage.setItem(key, JSON.stringify(value)); return ""; } catch { return "Could not save this preference locally."; } };
const RESULT_NAMES: Record<string, string> = {
  "messaging conversations started": "Messaging conversations started",
  "messaging conversations": "Messaging conversations started",
  "page likes": "Follows or likes",
  "follows or likes": "Follows or likes",
  purchases: "Website purchases",
  "website purchases": "Website purchases",
  "post engagements": "Post engagements",
  "post engagement": "Post engagements",
  "link clicks": "Link clicks",
  leads: "Leads",
  "landing page views": "Landing page views",
  reach: "Reach",
  impressions: "Impressions",
  "app installs": "App installs",
  thruplays: "ThruPlays",
  "video views": "ThruPlays",
  calls: "Calls",
  "phone calls": "Calls",
};
const OBJECTIVE_RESULT_NAMES: Record<string, string> = {
  OUTCOME_SALES: "Website purchases",
  CONVERSIONS: "Website purchases",
  PRODUCT_CATALOG_SALES: "Website purchases",
  OUTCOME_LEADS: "Leads",
  LEAD_GENERATION: "Leads",
  OUTCOME_TRAFFIC: "Link clicks",
  LINK_CLICKS: "Link clicks",
  OUTCOME_AWARENESS: "Reach",
  BRAND_AWARENESS: "Reach",
  REACH: "Reach",
  OUTCOME_ENGAGEMENT: "Post engagements",
  POST_ENGAGEMENT: "Post engagements",
  PAGE_LIKES: "Follows or likes",
  OUTCOME_APP_PROMOTION: "App installs",
  APP_INSTALLS: "App installs",
  MESSAGES: "Messaging conversations started",
  VIDEO_VIEWS: "ThruPlays",
};
const facebookResultLabel = (metric?: string, objective?: string) => {
  const key = String(metric || "").trim().toLowerCase().replaceAll("_", " ").replaceAll(".", " ");
  if (RESULT_NAMES[key]) return RESULT_NAMES[key];
  if (key.includes("messaging")) return "Messaging conversations started";
  if (key.includes("page like") || key.includes("follow") || key === "like") return "Follows or likes";
  if (key.includes("purchase")) return "Website purchases";
  if (key.includes("lead")) return "Leads";
  if (key.includes("landing page")) return "Landing page views";
  if (key.includes("link click")) return "Link clicks";
  if (key.includes("app install")) return "App installs";
  if (key.includes("post engagement")) return "Post engagements";
  if (key.includes("thruplay") || key.includes("video view")) return "ThruPlays";
  return OBJECTIVE_RESULT_NAMES[String(objective || "").trim().toUpperCase()] || "";
};

export function CampaignsPage({ campaigns, accounts, clients, requests, role, onLoadInsights, onLoadAccountReport, onAssignCampaignClient, onAssignCampaignRequest, onAssignClientAdAccount }: Props) {
  const [view, setView] = useState<"campaigns" | "accounts">("campaigns");
  const [search, setSearch] = useState(""); const [accountSearch, setAccountSearch] = useState(""); const [selected, setSelected] = useState("all");
  const [status, setStatus] = useState("all"); const [mappingOpen, setMappingOpen] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const today = toLocalDate(new Date());
  const defaultRange = useMemo(() => presetRange("today"), []);
  const [rangePreset, setRangePreset] = useState<RangePreset>("today"); const [appliedRange, setAppliedRange] = useState<DateRange>(defaultRange); const [draftRange, setDraftRange] = useState<DateRange>(defaultRange);
  const [rangeError, setRangeError] = useState(""); const [insights, setInsights] = useState<CampaignRangeInsightsResponse>([]); const [accountReport, setAccountReport] = useState<AccountReportRow[]>([]); const [accountReportLoading, setAccountReportLoading] = useState(true); const [accountReportError, setAccountReportError] = useState(""); const [insightsLoading, setInsightsLoading] = useState(true); const [insightsError, setInsightsError] = useState(""); const [retryKey, setRetryKey] = useState(0);
  const [datePresets, setDatePresets] = useState<DatePreset[]>(() => readStorage(datePresetKey, [], (value): value is DatePreset[] => Array.isArray(value) && value.every((item) => item && typeof item.name === "string" && item.range && typeof item.range.since === "string" && typeof item.range.until === "string"))); const [datePresetName, setDatePresetName] = useState(""); const [datePresetError, setDatePresetError] = useState("");
  const requestSequence = useRef(0);
  const canManage = isAgencyStaff(role);
  const options = useMemo(() => { const map = new Map(accounts.map((account) => [account.facebookAdAccountId, account])); campaigns.forEach((item) => { if (item.facebookAdAccountId && !map.has(item.facebookAdAccountId)) map.set(item.facebookAdAccountId, { facebookAdAccountId: item.facebookAdAccountId, accountId: item.facebookAdAccountId.replace(/^act_/, ""), name: item.facebookAdAccountName || "", isAccessible: true }); }); const query = accountSearch.toLowerCase(); return [...map.values()].filter((item) => !query || item.name.toLowerCase().includes(query) || item.facebookAdAccountId.toLowerCase().includes(query)); }, [accounts, campaigns, accountSearch]);
  const filtered = useMemo(() => {
    const known = new Set(campaigns.map((item) => item.facebookCampaignId).filter(Boolean));
    const live = insights.flatMap((item) => {
      if (!item.facebookCampaignId || known.has(item.facebookCampaignId) || !item.name) return [];
      const row: Campaign = { _id: item._id || `live-${item.facebookCampaignId}`, name: item.name, source: "facebook", facebookCampaignId: item.facebookCampaignId, facebookAdAccountId: item.facebookAdAccountId, facebookAdAccountName: item.facebookAdAccountName, effectiveStatus: item.effectiveStatus, platform: "facebook", objective: item.objective || "", status: item.status || "active", budget: item.budget || { amount: null, type: null, currency: "USD" }, performance: item.performance, startDate: item.startDate, endDate: item.endDate };
      return [row];
    });
    const insightById = new Map(insights.map((item) => [item.facebookCampaignId, item]));
    return [...live, ...campaigns].filter((item) => (item.source !== "crm") && (selected === "all" || item.facebookAdAccountId === selected) && (status === "all" || item.status === status) && (!search.trim() || [item.name, item.objective, item.client?.name, item.facebookAdAccountName, item.facebookAdAccountId].some((value) => value?.toLowerCase().includes(search.toLowerCase())))).sort((left, right) => {
      const leftInsight = insightById.get(left.facebookCampaignId || "");
      const rightInsight = insightById.get(right.facebookCampaignId || "");
      const leftActive = deliveryView(leftInsight?.performance.delivery || left.performance.delivery || left.effectiveStatus || left.status).label === "Active" ? 0 : 1;
      const rightActive = deliveryView(rightInsight?.performance.delivery || right.performance.delivery || right.effectiveStatus || right.status).label === "Active" ? 0 : 1;
      if (leftActive !== rightActive) return leftActive - rightActive;
      const leftTime = Date.parse(String(leftInsight?.startDate || left.startDate || leftInsight?.endDate || left.endDate || ""));
      const rightTime = Date.parse(String(rightInsight?.startDate || right.startDate || rightInsight?.endDate || right.endDate || ""));
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
  }, [campaigns, insights, search, selected, status]);
  const insightsByCampaign = useMemo(() => new Map(insights.map((item) => [item.facebookCampaignId, item])), [insights]);
  const exportCampaigns = () => {
    const headers = ["Campaign", "Client", "Source", "Status", "Budget", "Budget type", "Spend", "Results", "End date"];
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = filtered.map((item) => [item.name, item.client?.name || "Unassigned", item.source, item.status, item.budget?.amount, item.budget?.type, item.performance?.amountSpent ?? item.performance?.spend, item.performance?.results, item.endDate || ""]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `campaign-report-${toLocalDate(new Date())}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const loadInsightsRef = useRef(onLoadInsights);
  const loadReportRef = useRef(onLoadAccountReport);
  loadInsightsRef.current = onLoadInsights;
  loadReportRef.current = onLoadAccountReport;
  useEffect(() => {
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    setInsightsLoading(true); setInsightsError(""); setAccountReportLoading(true); setAccountReportError("");
    void Promise.allSettled([loadInsightsRef.current(appliedRange, controller.signal), loadReportRef.current(appliedRange, controller.signal)]).then(([insightResult, accountResult]) => {
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      if (insightResult.status === "fulfilled") setInsights(insightResult.value); else setInsightsError(insightResult.reason instanceof Error ? insightResult.reason.message : "Could not load Facebook insights");
      if (accountResult.status === "fulfilled") setAccountReport(accountResult.value); else setAccountReportError(accountResult.reason instanceof Error ? accountResult.reason.message : "Could not load account report");
      setInsightsLoading(false); setAccountReportLoading(false);
    });
    return () => controller.abort();
  }, [appliedRange, retryKey]);
  const selectRangePreset = (preset: RangePreset) => { setRangePreset(preset); setRangeError(""); if (preset !== "custom") { const next = presetRange(preset); setDraftRange(next); setAppliedRange(next); } else setDraftRange(appliedRange); };
  const applyCustomRange = () => { const message = validateRange(draftRange, today); if (message) { setRangeError(message); return; } setRangeError(""); setAppliedRange(draftRange); };
  const applyDatePreset = (preset: DatePreset) => { setRangePreset("custom"); setDraftRange(preset.range); setAppliedRange(preset.range); setDatePresetError(""); };
  const saveDatePreset = () => { const cleanName = datePresetName.trim(); const message = validateRange(draftRange, today); if (!cleanName || cleanName.length > 40) { setDatePresetError("Enter a name up to 40 characters."); return; } if (message) { setDatePresetError(message); return; } const existing = datePresets.find((item) => item.name.toLowerCase() === cleanName.toLowerCase()); if (existing && !window.confirm(`Overwrite date preset “${existing.name}”?`)) return; const next = [...datePresets.filter((item) => item.name.toLowerCase() !== cleanName.toLowerCase()), { name: cleanName, range: draftRange }]; const storageError = saveStorage(datePresetKey, next); setDatePresetError(storageError); if (!storageError) { setDatePresets(next); setDatePresetName(""); } };
  const deleteDatePreset = (name: string) => { if (!window.confirm(`Delete date preset “${name}”?`)) return; const next = datePresets.filter((item) => item.name !== name); const storageError = saveStorage(datePresetKey, next); setDatePresetError(storageError); if (!storageError) setDatePresets(next); };
  const cancelCustomRange = () => { setDraftRange(appliedRange); setRangeError(""); };
  useEffect(() => { if (!mappingOpen) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMappingOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [mappingOpen]);
  const run = async (key: string, action: () => Promise<void>, fallback = "Could not save campaign") => { setBusy(key); setError(""); try { await action(); } catch (err) { setError(err instanceof Error ? err.message : fallback); throw err; } finally { setBusy(""); } };
  const changeAccountOwner = async (accountId: string, currentOwnerId: string, nextOwnerId: string) => { if (currentOwnerId === nextOwnerId) return; try { if (nextOwnerId) await run(`account-${accountId}`, () => onAssignClientAdAccount(nextOwnerId, accountId, true)); else if (currentOwnerId) await run(`account-${accountId}`, () => onAssignClientAdAccount(currentOwnerId, accountId, false)); } catch { /* surfaced by run */ } };
  const campaignMetricCell = (item: Campaign, column: MetricId) => {
    const insight = item.source === "facebook" ? insightsByCampaign.get(item.facebookCampaignId || "")?.performance : undefined;
    const currency = insight?.currency || item.performance.sourceCurrency || item.performance.currency || item.budget?.currency || "USD";
    const actions = insight?.actions || item.performance.actions || [];
    if (column === "delivery") { const view = deliveryView(insight?.delivery || item.performance.delivery || item.effectiveStatus || item.status); return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={`size-1.5 shrink-0 rounded-full ${view.dot}`} />{view.label}{item.isStale && <span className="text-[10px] text-amber-600">Stale</span>}</span>; }
    if (column === "actions") { const totalActions = actions.reduce((sum, action) => sum + action.value, 0); const title = actions.map((action) => `${metricLabel(action.actionType)}: ${action.value.toLocaleString()}`).join("\n") || "No action breakdown"; return <span title={title}>{actions.length ? displayMetricNumber(totalActions) : "—"}</span>; }
    const rawLabel = item.source === "facebook" ? insight?.resultMetric || item.performance.resultMetric : item.performance.resultMetric;
    const resultLabel = facebookResultLabel(rawLabel, item.facebookObjective || item.objective);
    const resultValue = item.source === "facebook" ? (insight ? insight.results : item.performance.results) : item.performance.results;
    if (column === "budget") {
      const budgetType = item.budget?.type === "lifetime" ? "Lifetime" : item.budget?.type === "daily" ? "Daily" : "";
      return item.budget?.amount == null ? "—" : metricStack(adsMoney(item.budget.amount, item.budget.currency || currency), budgetType);
    }
    if (column === "results") return metricStack(adsCount(resultValue), resultLabel);
    if (column === "costPerResult") {
      const cost = item.source === "facebook" ? insight?.costPerResult ?? (insight ? null : item.performance.costPerResult) : item.performance.costPerResult;
      if (resultValue == null || resultValue <= 0 || cost == null) return "—";
      return metricStack(adsMoney(cost, currency), PER_RESULT[resultLabel] || (resultLabel ? `Per ${resultLabel}` : ""));
    }
    if (column === "amountSpent") {
      const spent = item.source === "facebook" ? insight?.amountSpent ?? insight?.spend ?? (insight ? null : item.performance.amountSpent ?? item.performance.spend) : item.performance.amountSpent ?? item.performance.spend;
      return adsMoney(spent, currency);
    }
    if (column === "ctrAll") return item.source === "facebook" ? displayPercent(insight?.ctrAll) : displayPercent(item.performance.ctrAll);
    if (column === "reach") return adsCount(item.source === "facebook" ? insight?.reach ?? (insight ? null : item.performance.reach) : item.performance.reach);
    if (column === "impressions") return adsCount(item.source === "facebook" ? insight?.impressions ?? (insight ? null : item.performance.impressions) : item.performance.impressions);
    if (column === "ends") return item.endDate ? formatDate(item.endDate) : item.status === "completed" ? "Completed" : ["draft", "scheduled", "active", "paused"].includes(item.status) ? "Ongoing" : "—";
    if (column === "landingPageViews") return item.source === "facebook" ? displayMetricNumber(insight?.landingPageViews) : "—";
    if (column === "costPerLead") { const leads = actionMetricValue(actions, "leads"); const spend = insight?.amountSpent ?? insight?.spend; return item.source === "facebook" && leads > 0 && spend != null ? displayRangeMoney(spend / leads, currency) : "—"; }
    if (isActionMetric(column)) { const hasAlias = actions.some((action) => actionAliases[column].includes(action.actionType.toLowerCase())); if (!hasAlias) return "—"; const value = actionMetricValue(actions, column); return column === "purchaseValue" ? displayRangeMoney(value, currency) : displayMetricNumber(value); }
    return "—";
  };
  const campaignClientControl = (item: Campaign) => canManage && item.source === "facebook" && !item._id.startsWith("live-") ? <select aria-label={`Campaign client for ${item.name}`} className="crm-input crm-compact-select h-7 min-w-28 max-w-40 py-0 text-xs" value={item.client?._id || ""} disabled={busy === `campaign-${item._id}`} onChange={(event) => void run(`campaign-${item._id}`, () => onAssignCampaignClient(item._id, event.target.value || null)).catch(() => undefined)}><option value="">Unassigned</option>{clients.map((entry) => <option key={entry._id} value={entry._id}>{entry.name}</option>)}</select> : <span className="truncate">{item.client?.name || "Unassigned"}</span>;
  const campaignRequestControl = (item: Campaign) => {
    const linked = item.adRequest;
    const saved = canManage && item.source === "facebook" && !item._id.startsWith("live-");
    if (!saved) return <span className="truncate">{linked?.requestNumber || "—"}</span>;
    const options = requests.filter((entry) => !item.client?._id || entry.client?._id === item.client._id);
    const visible = linked && !options.some((entry) => entry._id === linked._id) ? [linked, ...options] : options;
    return <select aria-label={`Ad request for ${item.name}`} className="crm-input crm-compact-select h-7 min-w-36 max-w-52 py-0 text-xs" value={linked?._id || ""} disabled={busy === `request-${item._id}`} onChange={(event) => void run(`request-${item._id}`, () => onAssignCampaignRequest(item._id, event.target.value || null)).catch(() => undefined)}><option value="">Unlinked</option>{visible.map((entry) => <option key={entry._id} value={entry._id}>{entry.requestNumber} · {entry.pageName}</option>)}</select>;
  };
  return <div className="crm-light-portal crm-design-shell crm-campaign-portal space-y-3">
    <div className="crm-page-header">
      <div className="crm-page-header-main">
        <div className="crm-page-header-tab crm-campaign-heading"><h2 className="crm-page-title">Live campaigns</h2></div>
        <div className="crm-page-header-meta"><p className="crm-page-subtitle">{filtered.length} campaigns · {rangeLabel(appliedRange)}</p></div>
      </div>
    </div>
    {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
    <Card className="crm-campaign-report">
      <div className="crm-campaign-toolbar">
        <div className="crm-campaign-actions">{canManage && <div className="crm-segmented-control" role="tablist" aria-label="Campaign workspace view"><button type="button" role="tab" aria-selected={view === "campaigns"} className={view === "campaigns" ? "active" : ""} onClick={() => setView("campaigns")}>Campaigns</button><button type="button" role="tab" aria-selected={view === "accounts"} className={view === "accounts" ? "active" : ""} onClick={() => setView("accounts")}>Ad accounts</button></div>}{view === "campaigns" && <Button className="crm-sheet-action" onClick={exportCampaigns}><Download className="size-3.5" />Export CSV</Button>}{canManage && <Button className="crm-sheet-action" onClick={() => setMappingOpen(true)}><Link2 className="size-3.5" />Map accounts</Button>}</div>
      </div>
      <div className="crm-campaign-range">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><CalendarDays className="size-3.5 shrink-0 text-[#1d4ed8]"/><span className="truncate font-medium text-slate-700">{rangeLabel(appliedRange)}</span></div>
          <div className="flex flex-nowrap gap-1 overflow-x-auto" role="group" aria-label="Facebook performance date range">{rangePresets.map((preset) => <button key={preset.value} type="button" aria-pressed={rangePreset === preset.value} className="shrink-0 rounded border px-2 py-1 text-[11px] font-medium" onClick={() => selectRangePreset(preset.value)}>{preset.label}</button>)}{datePresets.map((preset) => <button key={preset.name} type="button" aria-pressed={rangePreset === "custom" && appliedRange.since === preset.range.since && appliedRange.until === preset.range.until} className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600" onClick={() => applyDatePreset(preset)}>{preset.name}</button>)}</div>
        </div>
        {rangePreset === "custom" && <div className="mt-3 flex flex-col gap-2 border-t border-gray-300 pt-3 sm:flex-row sm:items-end"><label className="min-w-40"><span className="crm-label">Start date</span><input type="date" className="crm-input" value={draftRange.since} max={today} aria-invalid={Boolean(rangeError)} onChange={(event) => setDraftRange((current) => ({ ...current, since: event.target.value }))}/></label><label className="min-w-40"><span className="crm-label">End date</span><input type="date" className="crm-input" value={draftRange.until} max={today} aria-invalid={Boolean(rangeError)} onChange={(event) => setDraftRange((current) => ({ ...current, until: event.target.value }))}/></label><Button type="button" onClick={applyCustomRange}>Apply</Button><button type="button" className="rounded-md border border-gray-300 px-4 py-2 text-sm" onClick={cancelCustomRange}>Cancel</button>{rangeError && <p role="alert" className="text-sm text-red-700 sm:pb-2">{rangeError}</p>}<input aria-label="Date preset name" maxLength={40} className="crm-input min-w-40" placeholder="Preset name" value={datePresetName} onChange={(event) => setDatePresetName(event.target.value)}/><button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium" onClick={saveDatePreset}>Save date preset</button>{datePresets.length > 0 && <button type="button" className="crm-icon-button" aria-label="Delete selected date preset" title="Delete selected date preset" onClick={() => { const match = datePresets.find((preset) => preset.range.since === draftRange.since && preset.range.until === draftRange.until); if (match) deleteDatePreset(match.name); }}><Trash2 className="size-3.5"/></button>}{datePresetError && <p role="alert" className="text-sm text-red-700 sm:pb-2">{datePresetError}</p>}</div>}
        {(insightsLoading || insightsError) && <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500" aria-live="polite">{insightsLoading ? <><RefreshCw className="size-3 animate-spin text-[#1d4ed8]"/>Loading metrics…</> : <><span className="text-red-700">{insightsError}</span><button type="button" className="font-semibold text-[#1d4ed8] underline underline-offset-2" onClick={() => setRetryKey((value) => value + 1)}>Retry</button></>}</div>}
      </div>
      {view === "campaigns" && <>
      <div className="crm-campaign-filters"><div className="crm-campaign-search"><Search className="size-3.5 text-[#1e40af]"/><input aria-label="Search campaigns" className="crm-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaigns"/></div><select aria-label="Filter by status" className="crm-input crm-filter-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by ad account" className="crm-input crm-filter-select crm-account-filter" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">All ad accounts</option>{options.map((item) => <option key={item.facebookAdAccountId} value={item.facebookAdAccountId}>{item.name || "Unnamed"} · {item.facebookAdAccountId}</option>)}</select></div>
      {filtered.length ? <>
        <div className="crm-responsive-table crm-desktop-campaign-table crm-campaign-table-shell"><table className="min-w-full w-max text-xs"><thead className="crm-table-head"><tr><th className="crm-sticky-campaign crm-compact-th">Campaign</th>{defaultMetrics.map((column) => <th key={column} className={`crm-compact-th ${column === "delivery" ? "text-left" : "text-right"}`}><span>{metricColumns.find((entry) => entry.id === column)?.label}</span></th>)}<th className="crm-compact-th">Client</th><th className="crm-compact-th">Request</th></tr></thead><tbody>{filtered.map((item) => <tr key={item._id}><td className="crm-compact-cell crm-sticky-campaign"><p className="max-w-52 truncate text-[13px] font-medium leading-4 text-slate-800" title={item.name}>{item.name}</p><p className="max-w-52 truncate text-[11px] leading-4 text-slate-500">{item.facebookAdAccountName || item.objective || "Facebook campaign"}</p></td>{defaultMetrics.map((column) => <td key={column} className={`crm-compact-cell whitespace-nowrap tabular-nums ${column === "delivery" ? "text-left" : "text-right"}`}>{campaignMetricCell(item, column)}</td>)}<td className="crm-compact-cell">{campaignClientControl(item)}</td><td className="crm-compact-cell">{campaignRequestControl(item)}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-[#20293a] md:hidden">{filtered.map((item) => <article key={item._id} className="crm-campaign-mobile-row"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{item.name}</p><p className="truncate text-[11px] text-slate-500">{item.client?.name || "Unassigned"} · {deliveryView(item.performance.delivery || item.effectiveStatus || item.status).label}</p></div></div>{canManage && item.source === "facebook" && <div className="mt-2 space-y-2">{campaignClientControl(item)}{campaignRequestControl(item)}</div>}<dl className="mt-3 grid grid-cols-2 gap-2">{defaultMetrics.map((column) => <div key={column} className="min-w-0"><dt>{metricColumns.find((entry) => entry.id === column)?.label}</dt><dd className="break-words tabular-nums">{campaignMetricCell(item, column)}</dd></div>)}</dl></article>)}</div>
      </> : <div className="crm-empty"><Megaphone className="size-5"/>No campaigns match the current filters.</div>}
      </>}
      {view === "accounts" && <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 px-3 py-2"><div><h3 className="text-sm font-semibold text-slate-800">Facebook account report</h3><p className="text-xs text-slate-500">Live account spend · {rangeLabel(appliedRange)}</p></div>{accountReportLoading && <RefreshCw className="size-4 animate-spin text-[#1e40af]"/>}</div>
        {accountReportError ? <div role="alert" className="p-3 text-sm text-red-400">{accountReportError}</div> : accountReport.length === 0 && !accountReportLoading ? <div className="crm-empty">No accessible Facebook ad accounts found.</div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="min-w-full w-max text-xs"><thead className="crm-table-head"><tr>{["Account name / ID","Currency","Balance","Lifetime spend","Spend limit","Status","Today","Yesterday","MTD","Selected range spend","Updated","Billing","Campaigns"].map((label) => <th key={label} className="crm-compact-th"><span>{label}</span></th>)}</tr></thead><tbody>{accountReport.map((item) => <tr key={item.facebookAdAccountId} className="border-b border-[#20293a] last:border-0"><td className="crm-compact-cell"><p className="font-semibold text-slate-200">{item.name || "Unnamed account"}</p><p className="font-mono text-[10px] text-slate-500">{item.accountId || item.facebookAdAccountId || "—"}</p></td><td className="crm-compact-cell">{item.sourceCurrency || item.currency || "—"}</td>{[item.balance,item.amountSpent,item.spendCap].map((value, index) => <td key={index} className="crm-compact-cell text-right tabular-nums">{displayRangeMoney(value, item.currency || item.sourceCurrency || "USD")}</td>)}<td className="crm-compact-cell">{readableStatus(item.accountStatus == null ? "" : String(item.accountStatus))}</td>{[item.todaySpend,item.yesterdaySpend,item.mtdSpend,item.selectedSpend].map((value, index) => <td key={index} className="crm-compact-cell text-right tabular-nums">{displayRangeMoney(value, item.currency || item.sourceCurrency || "USD")}</td>)}<td className="crm-compact-cell whitespace-nowrap">{item.lastSeenAt ? formatDate(item.lastSeenAt) : "—"}</td><td className="crm-compact-cell">{item.billingLink ? <a className="text-blue-400 hover:underline" href={item.billingLink} target="_blank" rel="noopener noreferrer">Billing</a> : "—"}</td><td className="crm-compact-cell">{item.campaignLink ? <a className="text-blue-400 hover:underline" href={item.campaignLink} target="_blank" rel="noopener noreferrer">Campaigns</a> : "—"}</td></tr>)}</tbody></table></div>
          <div className="divide-y divide-[#20293a] md:hidden">{accountReport.map((item) => { const fields = [["Currency",item.sourceCurrency || item.currency || "—"],["Balance",displayRangeMoney(item.balance, item.currency || item.sourceCurrency)],["Lifetime spend",displayRangeMoney(item.amountSpent, item.currency || item.sourceCurrency)],["Spend limit",displayRangeMoney(item.spendCap, item.currency || item.sourceCurrency)],["Status",readableStatus(item.accountStatus == null ? "" : String(item.accountStatus))],["Today",displayRangeMoney(item.todaySpend, item.currency || item.sourceCurrency)],["Yesterday",displayRangeMoney(item.yesterdaySpend, item.currency || item.sourceCurrency)],["MTD",displayRangeMoney(item.mtdSpend, item.currency || item.sourceCurrency)],["Selected range",displayRangeMoney(item.selectedSpend, item.currency || item.sourceCurrency)],["Updated",item.lastSeenAt ? formatDate(item.lastSeenAt) : "—"]]; return <article key={item.facebookAdAccountId} className="p-3"><p className="text-sm font-semibold text-slate-200">{item.name || "Unnamed account"}</p><p className="font-mono text-[10px] text-slate-500">{item.accountId || item.facebookAdAccountId || "—"}</p><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">{fields.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="truncate text-xs tabular-nums text-slate-200">{value}</dd></div>)}</dl><div className="mt-2 flex gap-3 text-xs">{item.billingLink ? <a className="text-blue-400" href={item.billingLink} target="_blank" rel="noopener noreferrer">Billing</a> : <span>Billing —</span>}{item.campaignLink ? <a className="text-blue-400" href={item.campaignLink} target="_blank" rel="noopener noreferrer">Campaigns</a> : <span>Campaigns —</span>}{item.error && <span className="text-red-400">{item.error.message}</span>}</div></article>; })}</div>
        </>}
      </div>}
      </Card>
    {mappingOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setMappingOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="mapping-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white text-slate-900"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h3 id="mapping-title" className="text-sm font-semibold text-slate-900">Facebook account mapping</h3><p className="mt-0.5 text-xs text-slate-500">Choose the client that owns each ad account.</p></div><button className="crm-icon-button" onClick={() => setMappingOpen(false)} aria-label="Close"><X className="size-4"/></button></div><div className="space-y-2 p-3"><input autoFocus aria-label="Search accounts" className="crm-input" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search account name or act_ ID"/>{options.length === 0 ? <p className="px-1 py-6 text-center text-sm text-slate-500">{accountSearch.trim() ? "No ad accounts match this search." : "No Facebook ad accounts to map yet."}</p> : options.map((account) => { const owner = clients.find((item) => (item.facebookAdAccountIds || []).includes(account.facebookAdAccountId)); return <div key={account.facebookAdAccountId} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_16rem] sm:items-center"><div className="min-w-0"><p className="truncate font-medium text-slate-900">{account.name || "Unnamed account"}</p><p className="truncate font-mono text-xs text-slate-500">{account.facebookAdAccountId}</p></div><select className="crm-input" aria-label={`Owner for ${account.name || account.facebookAdAccountId}`} value={owner?._id || ""} disabled={busy === `account-${account.facebookAdAccountId}`} onChange={(event) => void changeAccountOwner(account.facebookAdAccountId, owner?._id || "", event.target.value)}><option value="">Unassigned</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>; })}</div></section></div>}
  </div>;
}
