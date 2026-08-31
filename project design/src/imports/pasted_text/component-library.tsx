import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, Users, Megaphone, CreditCard, Settings, 
  Plus, ChevronRight, UserPlus, Trash2, Edit2, Link as LinkIcon, 
  Search, Menu, X, ExternalLink, Shield, ShieldOff, Check,
  Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2,
  RefreshCw, Pause, Play, LogOut, Bell, Download, Receipt,
  Calendar, LayoutGrid, List, ArrowUpRight, ArrowDownRight, GripHorizontal,
  MessageSquare, UploadCloud, Activity, Palette, Wallet, Send, Clock, Briefcase,
  TrendingUp, BarChart2, ArrowRight, Filter, ChevronDown, UserCircle2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell 
} from 'recharts';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-gray-300 rounded-sm shadow-sm ${className}`}>
    {children}
  </div>
);

// Mimics the dark blue tab header seen in the portal images (e.g., "Dashboard", "My Profile")
const TabHeader = ({ title }) => (
  <div className="bg-[#1e40af] text-white px-3 py-1 inline-block rounded-t-sm font-bold text-sm mb-0">
    {title}
  </div>
);

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-gray-500 text-white",
    blue: "bg-[#1877f2] text-white", // Meta Blue
    emerald: "bg-[#198754] text-white", // Success Green
    amber: "bg-[#ffc107] text-gray-900", // Warning Yellow
    red: "bg-[#dc3545] text-white", // Danger Red
    purple: "bg-[#6f42c1] text-white",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = "primary", size = "default", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-[#1e40af] text-white hover:bg-[#1e3a8a] border border-[#1e40af]",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300",
    ghost: "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
    destructive: "bg-[#dc3545] text-white hover:bg-[#c82333] border border-[#dc3545]"
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-7 px-3 text-xs",
    icon: "h-9 w-9"
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

const Input = ({ className = "", ...props }) => (
  <input className={`flex h-9 w-full rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);

const Label = ({ children, className = "" }) => (
  <label className={`text-xs font-bold text-[#1e40af] mb-1 block ${className}`}>{children}</label>
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded shadow-lg transition-all animate-in slide-in-from-bottom-5 ${type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-800' : 'bg-green-50 border-l-4 border-green-500 text-green-800'}`}>
      {type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle size={18} className="text-green-500" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-3 hover:opacity-75 transition-opacity"><X size={16}/></button>
    </div>
  );
};

const MOCK_CLIENTS = ['Urban Threads Co.', 'Stellar Eats', 'ZenFlow Wellness'];
const MOCK_AD_ACCOUNTS = [
  { id: 'act_123456789', name: 'Urban Threads Official', clientName: 'Urban Threads Co.', balance: 0.00, spendCap: 5000.00, status: 'Active', todaySpend: 45.20, mtdSpend: 850.00, rate: 110 },
  { id: 'act_987654321', name: 'Stellar Eats Promo', clientName: 'Stellar Eats', balance: 15.20, spendCap: 15000.00, status: 'Active', todaySpend: 120.50, mtdSpend: 2100.00, rate: 115 },
  { id: 'act_456789012', name: 'Unassigned Meta Account', clientName: null, balance: 0.00, spendCap: 0, status: 'Disabled', todaySpend: 0, mtdSpend: 0, rate: 110 },
];
const MOCK_CAMPAIGNS = [
  { id: 'HK_1', name: 'Sarbonam Fashion Lungi Web Engage...', clientName: null, delivery: 'PAUSED', leads: null, cpl: null, results: '2 Website Purchases', cpr: 2.335, spend: 4.67, ctr: 4.01, reach: 3800, impressions: 5600, ends: 'Ongoing' },
  { id: 'HK_2', name: '2nd Sarbonam WEB Mango', clientName: null, delivery: 'PAUSED', leads: null, cpl: null, results: '0', cpr: 0, spend: 0, ctr: 0, reach: 0, impressions: 0, ends: 'Ongoing' },
  { id: 'C-1001', name: 'WhatsApp Sales - Winter Collection', clientName: 'Urban Threads Co.', delivery: 'ACTIVE', leads: 45, cpl: 1.2, results: '347 msgs', cpr: 1.21, spend: 420.50, ctr: 2.1, reach: 18400, impressions: 45000, ends: '2026-09-01' },
  { id: 'C-1002', name: 'Brand Awareness - Dhaka', clientName: 'Stellar Eats', delivery: 'ACTIVE', leads: null, cpl: null, results: '1,240 engmnt', cpr: 0.15, spend: 190.00, ctr: 1.8, reach: 45000, impressions: 85000, ends: 'Ongoing' },
  { id: 'HK_3', name: 'Amar_Style_1st', clientName: null, delivery: 'PAUSED', leads: null, cpl: null, results: '0', cpr: 0, spend: 0, ctr: 0, reach: 0, impressions: 0, ends: 'Ongoing' }
];
const MOCK_REQUESTS = [
  { id: 'REQ-001', client: 'Urban Threads Co.', platform: 'FB+IG', objective: 'WhatsApp', budget: 20, status: 'Live', comments: 3, date: '2026-08-12' },
  { id: 'REQ-002', client: 'Stellar Eats', platform: 'FB', objective: 'Post Engagement', budget: 35, status: 'Approved', comments: 0, date: '2026-08-14' },
  { id: 'REQ-003', client: 'ZenFlow Wellness', platform: 'IG', objective: 'Leads', budget: 50, status: 'Under Review', comments: 1, date: '2026-08-15' },
];

const DashboardView = ({ viewRole }) => {
  const SPEND_TREND = [{ name: '1 Aug', spend: 400 }, { name: '5 Aug', spend: 600 }, { name: '10 Aug', spend: 550 }, { name: '15 Aug', spend: 850 }];
  const FUNNEL_DATA = [{ name: 'Reach', value: 45000, color: '#1e40af' }, { name: 'Clicks', value: 12500, color: '#3b82f6' }, { name: 'Leads', value: 3200, color: '#60a5fa' }, { name: 'Sales', value: 450, color: '#93c5fd' }];
  
  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      <div>
        <TabHeader title="Dashboard" />
        <Card className="p-4 border-t-0 rounded-tl-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Billed (USD)', value: '$12,450', badgeType: 'blue' },
              { label: 'Unpaid Invoices', value: '$2,100', badgeType: 'red' },
              { label: 'Live Campaigns', value: '18', badgeType: 'emerald' },
              { label: 'Pending Requests', value: '5', badgeType: 'amber' },
            ].map((stat, i) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-300 rounded-sm bg-[#fafafa]">
                <span className="text-sm font-semibold text-gray-700">{stat.label}</span>
                <Badge variant={stat.badgeType} className="px-3 py-1 shadow-sm text-sm">{stat.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <div className="bg-[#eef2f6] text-[#1e40af] px-3 py-2 font-bold text-sm border border-gray-300 border-b-0 flex justify-between items-center">
            <span>Ad Spend Trend (USD)</span>
          </div>
          <Card className="p-4 border-t-0 rounded-t-none h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPEND_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis stroke="#6b7280" axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `$${val}`} dx={-10} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#d1d5db', borderRadius: '4px', color: '#1f2937' }} />
                <Area type="monotone" dataKey="spend" stroke="#1e40af" strokeWidth={2} fillOpacity={0.1} fill="#1e40af" activeDot={{ r: 6, fill: '#1e40af' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        
        <div>
          <div className="bg-[#eef2f6] text-[#1e40af] px-3 py-2 font-bold text-sm border border-gray-300 border-b-0">
            Conversion Funnel
          </div>
          <Card className="p-4 border-t-0 rounded-t-none h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={FUNNEL_DATA} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#6b7280" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ backgroundColor: '#fff', borderColor: '#d1d5db', borderRadius: '4px' }} />
                <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]}>{FUNNEL_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

const RequestsView = ({ viewRole, showToast }) => {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [showForm, setShowForm] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const displayRequests = viewRole === 'Client' ? requests.filter(r => r.client === 'Urban Threads Co.') : requests;

  const handleDrop = (e, status) => {
    e.preventDefault();
    if(viewRole === 'Client' || !draggedId) return;
    setRequests(requests.map(r => r.id === draggedId ? { ...r, status } : r));
    setDraggedId(null);
    showToast(`Request moved to ${status}`);
  };

  if (showForm) {
    return (
      <div className="p-4 max-w-4xl mx-auto animate-in fade-in duration-300">
        <TabHeader title="New Ad Request" />
        <Card className="p-6 border-t-0 rounded-tl-none space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label>Platform</Label>
              <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                <option>Facebook + Instagram</option><option>Facebook Only</option><option>Instagram Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Campaign Objective</Label>
              <select className="flex h-9 w-full rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 outline-none focus:border-[#1e40af]">
                <option>WhatsApp Messages</option><option>Website Conversions</option><option>Lead Generation</option><option>Post Engagement</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Daily Budget (USD)</Label><Input type="number" defaultValue="20" placeholder="e.g. 50" /></div>
            <div className="space-y-1"><Label>Duration (Days)</Label><Input type="number" defaultValue="30" placeholder="e.g. 15" /></div>
            <div className="md:col-span-2 space-y-1">
              <Label>Target Link / Destination URL</Label>
              <Input type="url" placeholder="https://yourwebsite.com/product" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Upload Creatives</Label>
              <div className="w-full h-32 border border-dashed border-gray-400 bg-gray-50 hover:bg-gray-100 rounded flex flex-col items-center justify-center text-gray-500 cursor-pointer transition-colors">
                <UploadCloud size={24} className="text-[#1e40af] mb-2"/>
                <span className="text-sm font-medium">Click or drag files here</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => { setShowForm(false); showToast('Request submitted successfully!'); }}>Submit Request</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-4">
        <TabHeader title="Ad Requests" />
        <Button onClick={() => setShowForm(true)} size="sm"><Plus size={16} className="mr-1"/> Create Request</Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden pb-4">
        {['Under Review', 'Approved', 'Live'].map(col => (
          <div key={col} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)} className="bg-[#f8f9fa] border border-gray-300 rounded flex flex-col h-full overflow-hidden">
            <div className="bg-[#eef2f7] border-b border-gray-300 p-2 flex justify-between items-center">
              <h3 className="font-bold text-[#1e40af] text-sm">{col}</h3>
              <Badge variant={col === 'Live' ? 'emerald' : col === 'Approved' ? 'blue' : 'amber'}>{displayRequests.filter(r=>r.status===col).length}</Badge>
            </div>
            <div className="space-y-3 overflow-y-auto p-3 custom-scrollbar flex-1 pb-10">
              {displayRequests.filter(r => r.status === col).map(req => (
                <Card key={req.id} className={`p-3 border-gray-300 shadow-sm ${viewRole === 'Client' ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing hover:border-gray-400'}`} draggable={viewRole !== 'Client'} onDragStart={() => setDraggedId(req.id)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-800">{req.id}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare size={12}/> {req.comments}</span>
                  </div>
                  {viewRole !== 'Client' && <div className="font-semibold text-[#1e40af] text-sm mb-1">{req.client}</div>}
                  <div className="text-sm text-gray-600 mb-3">{req.objective}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                     <div className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12}/> {req.date}</div>
                     <div className="text-xs font-bold text-gray-700">${req.budget}/day</div>
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

const CampaignsView = ({ viewRole, showToast }) => {
  const formatNum = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num;

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300 max-w-[1600px] mx-auto">
      
      {/* Top Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-[#1e40af]">Campaign Report</h2>
          <p className="text-xs text-gray-500 mt-1">23 campaigns · 29 Jul 2026 – 27 Aug 2026</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-200 rounded p-1">
            <button className="bg-white px-3 py-1.5 text-xs font-bold rounded shadow-sm text-[#1e40af]">Campaigns</button>
            <button className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">Ad accounts</button>
          </div>
          <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold"><Download size={14} className="mr-2"/> Export CSV</Button>
          {viewRole !== 'Client' && (
            <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold text-[#1e40af] border-[#1e40af]"><LinkIcon size={14} className="mr-2"/> Map accounts</Button>
          )}
          <Button size="sm" className="h-8 text-xs font-semibold"><Plus size={14} className="mr-1"/> New campaign</Button>
        </div>
      </div>

      {/* Filter & Date Range Card */}
      <Card className="border-gray-300 rounded-sm mb-4 overflow-hidden">
        {/* Date Range Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Calendar size={16} className="text-[#1e40af]" />
            <span className="font-bold">Performance range</span>
            <span className="text-gray-600 ml-2">29 Jul 2026 – 27 Aug 2026</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-3 md:mt-0">
            {['Today', 'Yesterday', 'Last 7 days', 'Last 14 days', 'Last 30 days', 'Custom'].map(range => (
              <button key={range} className={`px-3 py-1 text-[11px] font-bold rounded border transition-colors ${range === 'Last 30 days' ? 'bg-[#1e40af] text-white border-[#1e40af]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="px-3 py-2 text-[11px] text-gray-500 bg-white border-b border-gray-200 font-medium">
          Facebook metrics reflect the applied range. CRM metrics remain stored totals.
        </div>

        {/* Search & Selection Row */}
        <div className="flex flex-col md:flex-row items-center gap-3 p-3 bg-white">
          <div className="relative flex-1 w-full max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search campaigns" className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:border-[#1e40af]" />
          </div>
          <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white font-medium text-gray-700"><option>All sources</option></select>
          <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white font-medium text-gray-700"><option>All statuses</option></select>
          <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white font-medium text-gray-700"><option>All ad accounts</option></select>
          
          <div className="flex-1 hidden md:block"></div>
          
          <select className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 outline-none focus:border-[#1e40af] bg-white font-medium text-gray-700"><option>Performance - Built-in</option></select>
          <Button variant="secondary" size="sm" className="h-7 text-xs font-semibold"><LayoutGrid size={14} className="mr-1"/> Columns</Button>
        </div>
      </Card>

      {/* Main Data Table */}
      <Card className="border-t-0 rounded-tl-none overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
          <thead className="bg-[#1e40af] text-white">
            <tr>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a]">CAMPAIGN</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a]">CLIENT</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-center">DELIVERY</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">LEADS</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">COST PER LEAD</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">RESULTS</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">COST PER RESULT</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">AMOUNT SPENT</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">CTR (ALL)</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">REACH</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">IMPRESSIONS</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a]">ENDS</th>
              <th className="px-3 py-2.5 font-bold tracking-wider text-center">MANAGE</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {MOCK_CAMPAIGNS.filter(c => viewRole !== 'Client' || c.clientName === 'Urban Threads Co.').map((c, idx) => (
              <tr key={c.id} className="hover:bg-gray-50 border-b border-gray-200 transition-colors">
                
                <td className="px-3 py-2 border-r border-gray-200 w-[250px] max-w-[250px] truncate">
                  <div className="font-bold text-[#1e40af] truncate" title={c.name}>{c.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{c.id}</div>
                </td>
                
                <td className="px-3 py-2 border-r border-gray-200 bg-[#f8f9fa]">
                  {viewRole === 'Client' ? (
                    <span className="text-sm font-semibold text-gray-800">{c.clientName || 'Unassigned'}</span>
                  ) : (
                    <select 
                      className={`text-xs border ${c.clientName ? 'border-gray-300 bg-white text-gray-800' : 'border-red-300 bg-red-50 text-red-700 font-bold'} rounded px-2 py-1 outline-none focus:border-[#1e40af] w-full max-w-[140px] shadow-sm`}
                      defaultValue={c.clientName || 'Unassigned'}
                      onChange={() => showToast('Campaign client mapping updated!')}
                    >
                      <option value="Unassigned">Unassigned</option>
                      {MOCK_CLIENTS.map(client => <option key={client} value={client}>{client}</option>)}
                    </select>
                  )}
                </td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-center">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm border ${c.delivery === 'PAUSED' ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {c.delivery}
                  </span>
                </td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700 font-medium">{c.leads || '—'}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700 font-medium">{c.cpl ? `$${c.cpl}` : '—'}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-gray-900">{c.results}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">${c.cpr}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-[#1e40af]">${c.spend}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{c.ctr}%</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{formatNum(c.reach)}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-700">{formatNum(c.impressions)}</td>
                
                <td className="px-3 py-2 border-r border-gray-200 text-gray-600">{c.ends}</td>
                
                <td className="px-3 py-2 text-center">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-400 hover:text-[#1e40af]"><Edit2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const BillingView = ({ viewRole }) => {
  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      
      <div>
        <TabHeader title="Financial Summary" />
        <Card className="p-4 border-t-0 rounded-tl-none grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
          <div className="flex justify-between items-center p-4 border border-gray-300 bg-[#f8f9fa]">
            <div>
              <Label className="text-gray-500 uppercase tracking-wider mb-0 text-[10px]">Available Prepaid Balance</Label>
              <div className="text-2xl font-bold text-[#1e40af]">৳ 46,200 <span className="text-sm font-normal text-gray-600">BDT</span></div>
            </div>
            {viewRole === 'Client' && <Button>Add Funds</Button>}
          </div>
          <div className="flex justify-between items-center p-4 border border-gray-300 bg-[#f8f9fa]">
             <div>
              <Label className="text-gray-500 uppercase tracking-wider mb-0 text-[10px]">Total Unpaid Dues</Label>
              <div className="text-2xl font-bold text-red-600">৳ 25,000</div>
            </div>
            <Badge variant="red">1 Overdue</Badge>
          </div>
        </Card>
      </div>

      <div>
        <TabHeader title="Payment Dues" />
        <Card className="border-t-0 rounded-tl-none overflow-x-auto bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e40af] text-white">
              <tr>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a]">Month / Period</th>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">Ad Spend</th>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">Agency Fee</th>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">Total Payable</th>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">Paid Amount</th>
                <th className="px-4 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right">Total Due</th>
                <th className="px-4 py-2.5 font-bold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 border-b border-gray-200">
                <td className="px-4 py-2 border-r border-gray-200 font-semibold text-[#1e40af]">August 2026</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-gray-700">৳ 1,20,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-gray-700">৳ 15,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right font-semibold text-gray-900">৳ 1,35,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-emerald-600">৳ 1,35,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right font-bold text-gray-900">৳ 0</td>
                <td className="px-4 py-2 text-center"><Badge variant="emerald">Cleared</Badge></td>
              </tr>
              <tr className="hover:bg-gray-50 border-b border-gray-200 bg-red-50/30">
                <td className="px-4 py-2 border-r border-gray-200 font-semibold text-[#1e40af]">September 2026</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-gray-700">৳ 20,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-gray-700">৳ 5,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right font-semibold text-gray-900">৳ 25,000</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right text-emerald-600">৳ 0</td>
                <td className="px-4 py-2 border-r border-gray-200 text-right font-bold text-red-600">৳ 25,000</td>
                <td className="px-4 py-2 text-center"><Badge variant="red">Overdue</Badge></td>
              </tr>
              <tr className="bg-[#eef2f6] font-bold">
                 <td colSpan="3" className="px-4 py-2.5 border-r border-gray-300 text-right text-[#1e40af]">Grand Summary</td>
                 <td className="px-4 py-2.5 border-r border-gray-300 text-right text-gray-900">৳ 1,60,000</td>
                 <td className="px-4 py-2.5 border-r border-gray-300 text-right text-emerald-600">৳ 1,35,000</td>
                 <td className="px-4 py-2.5 border-r border-gray-300 text-right text-red-600">৳ 25,000</td>
                 <td className="px-4 py-2.5"></td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

const PaymentDetailsView = () => {
  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-4">
        <TabHeader title="Payment Details" />
        <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold"><Download size={14} className="mr-2"/> Export Ledger</Button>
      </div>

      <Card className="border-t-0 rounded-tl-none overflow-x-auto bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#1e40af] text-white">
            <tr>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] w-[100px]">Date</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a]">Particulars / Description</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] w-[150px]">Payment Type / Ref</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right w-[120px]">Payable (Debit)</th>
              <th className="px-3 py-2.5 font-bold tracking-wider border-r border-[#1e3a8a] text-right w-[120px]">Payment (Credit)</th>
              <th className="px-3 py-2.5 font-bold tracking-wider text-right w-[120px]">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="bg-[#f8f9fa] font-bold text-[#1e40af] px-3 py-1.5 border-b border-gray-200">August 2026</td>
            </tr>
            <tr className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700">2026-08-01</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">Opening Balance</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-500">—</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">৳ 0</td>
            </tr>
            <tr className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700">2026-08-05</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">Advance Deposit via Bank</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-600">City Bank / TR2922</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-emerald-600">৳ 50,000</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">৳ 50,000</td>
            </tr>
            <tr className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700">2026-08-10</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">Facebook Ad Spend (act_12345)</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-600">Meta Auto Deduct</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-red-600">৳ 15,000</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">৳ 35,000</td>
            </tr>
            <tr className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700">2026-08-15</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">Agency Retainer Fee</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-600">Service Charge</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-red-600">৳ 10,000</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">৳ 25,000</td>
            </tr>
            <tr className="hover:bg-gray-50 border-b border-gray-200">
              <td className="px-3 py-2 border-r border-gray-200 text-gray-700">2026-08-20</td>
              <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">Deposit via bKash</td>
              <td className="px-3 py-2 border-r border-gray-200 text-gray-600">bKash (Bill Pay) 2922</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right text-gray-500">—</td>
              <td className="px-3 py-2 border-r border-gray-200 text-right font-semibold text-emerald-600">৳ 21,200</td>
              <td className="px-3 py-2 text-right font-bold text-[#1e40af]">৳ 46,200</td>
            </tr>
            <tr className="bg-[#eef2f6]">
              <td colSpan="3" className="px-3 py-2.5 border-r border-gray-300 text-right font-bold text-[#1e40af]">Closing Balance (August)</td>
              <td className="px-3 py-2.5 border-r border-gray-300 text-right font-bold text-red-600">৳ 25,000</td>
              <td className="px-3 py-2.5 border-r border-gray-300 text-right font-bold text-emerald-600">৳ 71,200</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#1e40af] bg-blue-50/50">৳ 46,200</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const SettingsView = ({ viewRole, showToast }) => {
  const [activeTab, setActiveTab] = useState('General');

  if (viewRole === 'Client') return <ClientProfileView />;

  return (
    <div className="p-4 animate-in fade-in duration-300 max-w-[1400px] mx-auto space-y-4">
      <div>
        <TabHeader title="Agency Profile" />
        <Card className="border-t-0 rounded-tl-none p-4 flex flex-col md:flex-row gap-6 bg-[#f8f9fa]">
          <div className="w-32 h-32 bg-gray-200 border border-gray-300 shrink-0 flex items-center justify-center">
            <BuildingIcon className="text-gray-400" size={48} />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
             <div><Label className="mb-0">Agency Name</Label><div className="text-gray-800 font-semibold">AdFlow Pro Management</div></div>
             <div><Label className="mb-0">Agency ID</Label><div className="text-gray-800">AGY-2026-1132</div></div>
             <div><Label className="mb-0">Admin Email</Label><div className="text-gray-800">admin@adflow.com</div></div>
             <div><Label className="mb-0">Subscription Plan</Label><div className="text-gray-800">Enterprise</div></div>
          </div>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-[#1e40af] mt-6">
        {['General', 'API Config', 'Team', 'Audit Logs'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-bold rounded-t-sm border border-b-0 ${activeTab === tab ? 'bg-[#1e40af] text-white border-[#1e40af]' : 'bg-gray-100 text-[#1e40af] border-gray-300 hover:bg-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="rounded-tl-none border-t-0 p-0 overflow-hidden">
        {activeTab === 'General' && (
          <div className="p-0">
             <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">Basic Information</div>
             <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                <div className="p-3 border-b border-r border-gray-200"><span className="text-gray-500 block text-xs">Primary Currency</span><span className="font-semibold">USD / BDT</span></div>
                <div className="p-3 border-b border-gray-200"><span className="text-gray-500 block text-xs">Timezone</span><span className="font-semibold">Asia/Dhaka</span></div>
                <div className="p-3 border-b border-r border-gray-200"><span className="text-gray-500 block text-xs">Brand Color</span><span className="font-semibold">#1e40af</span></div>
                <div className="p-3 border-b border-gray-200"><span className="text-gray-500 block text-xs">Support Email</span><span className="font-semibold">support@adflow.com</span></div>
             </div>
          </div>
        )}
        
        {activeTab === 'API Config' && (
           <div className="p-4 space-y-4">
              <div className="bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center gap-2">
                <CheckCircle size={16}/> Meta Graph API Connection is Active (v19.0)
              </div>
              <div className="space-y-1"><Label>System User Access Token</Label><Input type="password" defaultValue="EAAGm0PX4ZCpwBOw..." className="font-mono text-xs" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>App ID</Label><Input type="text" defaultValue="1234567890" className="font-mono text-xs" /></div>
                <div className="space-y-1"><Label>App Secret</Label><Input type="password" defaultValue="****************" className="font-mono text-xs" /></div>
              </div>
              <div className="pt-2"><Button onClick={() => showToast('API Keys saved & verified!')}>Save & Verify</Button></div>
           </div>
        )}
      </Card>
    </div>
  );
};

const ClientProfileView = () => {
  const [activeTab, setActiveTab] = useState('General');
  
  return (
    <div className="p-4 animate-in fade-in duration-300 max-w-[1400px] mx-auto space-y-4">
      <div>
        <TabHeader title="My Profile" />
        <Card className="border-t-0 rounded-tl-none p-4 flex flex-col md:flex-row gap-6 bg-white">
          {/* Avatar Area (Matches the UU student photo style) */}
          <div className="w-[140px] h-[170px] bg-[#eef2f6] border border-gray-300 shrink-0 flex flex-col items-center justify-center text-[#1e40af]">
            <UserCircle2 size={80} strokeWidth={1} />
            <span className="text-[10px] font-bold mt-2">LOGO / PHOTO</span>
          </div>
          
          {/* Top Profile Summary */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
             <div>
               <Label className="mb-0 text-gray-500 font-normal">Client Name</Label>
               <div className="text-[#1e40af] font-bold text-base">Urban Threads Co.</div>
             </div>
             <div>
               <Label className="mb-0 text-gray-500 font-normal">Client ID</Label>
               <div className="text-gray-900 font-bold">CLI-2026-992</div>
             </div>
             <div>
               <Label className="mb-0 text-gray-500 font-normal">Assigned Ad Account</Label>
               <div className="text-gray-900 font-bold">act_123456789</div>
             </div>
             <div>
               <Label className="mb-0 text-gray-500 font-normal">Account Status</Label>
               <div className="text-emerald-600 font-bold">Active</div>
             </div>
          </div>
        </Card>
      </div>

      {/* Profile Tabs (Matches the General, Education, Guardian layout) */}
      <div className="flex gap-4 border-b-2 border-[#1e40af] mt-6 pb-2 px-1">
        {['General', 'Billing Contacts', 'Assigned Team', 'Documents'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-bold pb-1 transition-colors ${activeTab === tab ? 'text-white bg-[#1e40af] px-3 rounded-t-sm' : 'text-[#1e40af] hover:text-[#1e3a8a] px-3'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="border border-gray-300 p-0 overflow-hidden bg-white">
        {activeTab === 'General' && (
          <div>
            <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-gray-300">
              Business Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 text-sm bg-white">
              <div className="p-3 border-b border-r border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Company Registration No</span>
                <span className="text-gray-900 font-semibold">URB-11223344-55</span>
              </div>
              <div className="p-3 border-b border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Industry / Category</span>
                <span className="text-gray-900 font-semibold">E-commerce & Fashion</span>
              </div>
              <div className="p-3 border-b border-r border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Point of Contact (Admin)</span>
                <span className="text-gray-900 font-semibold">Mr. John Doe</span>
              </div>
              <div className="p-3 border-b border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Contact Email</span>
                <span className="text-gray-900 font-semibold">contact@urbanthreads.com</span>
              </div>
              <div className="p-3 border-b border-r border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Phone Number</span>
                <span className="text-gray-900 font-semibold">+880 1711 223344</span>
              </div>
              <div className="p-3 border-b border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Business Address</span>
                <span className="text-gray-900 font-semibold">House 12, Road 4, Banani, Dhaka</span>
              </div>
            </div>
            
            <div className="bg-[#eef2f6] px-4 py-2 font-bold text-[#1e40af] text-sm border-b border-t border-gray-300 mt-4">
              Platform Preferences
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 text-sm bg-white">
              <div className="p-3 border-b border-r border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Primary Platforms</span>
                <span className="text-gray-900 font-semibold">Facebook & Instagram</span>
              </div>
              <div className="p-3 border-b border-gray-300">
                <span className="text-[#1e40af] font-bold text-xs block mb-1">Default Objectives</span>
                <span className="text-gray-900 font-semibold">WhatsApp Messages, Sales</span>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'General' && (
           <div className="p-8 text-center text-gray-500 font-medium">
             {activeTab} data will be displayed here.
           </div>
        )}
      </Card>
    </div>
  );
};

// Helper icon for Settings
const BuildingIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
);

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewRole, setViewRole] = useState('Admin'); 
  const [toast, setToast] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NAVIGATION = [
    { section: 'PORTAL MAIN' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'settings', label: 'System Profile', icon: Settings },
    { section: 'OPERATIONS' },
    { id: 'requests', label: 'Ad Requests', icon: FileText },
    { id: 'campaigns', label: 'Live Campaigns', icon: Megaphone },
    { section: 'FINANCIAL' },
    { id: 'adaccounts', label: 'Ad Accounts', icon: Briefcase, adminOnly: true },
    { id: 'billing', label: 'Payment Dues', icon: CreditCard },
    { id: 'payment_details', label: 'Payment Details', icon: Receipt },
  ];

  const showToast = (message, type = 'success') => setToast({ message, type });

  return (
    <div className="flex h-screen bg-[#f0f4f8] text-gray-800 font-sans overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-300 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-4 w-64">
           <button className="md:hidden text-[#1e40af]" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24}/></button>
           <div className="flex items-center gap-2 text-[#1e40af] font-bold text-xl tracking-tight hidden md:flex">
             <Shield className="fill-[#1e40af] text-white" size={24}/> ADFLOW PRO
           </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
             <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300">
               <img src={`https://ui-avatars.com/api/?name=${viewRole}&background=1e40af&color=fff&bold=true`} alt="Avatar" className="w-full h-full object-cover" />
             </div>
             <span className="text-[#1e40af] font-bold text-sm hidden sm:block">20261132 <ChevronDown size={14} className="inline ml-1"/></span>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-300 hidden md:flex flex-col mt-14 z-20 shadow-sm relative">
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {NAVIGATION.map((item, idx) => {
             if (item.section) return <div key={`sec-${idx}`} className="px-4 pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.section}</div>;
             if (item.adminOnly && viewRole === 'Client') return null;
             
             const isActive = currentView === item.id;
             return (
               <button 
                 key={item.id} 
                 onClick={() => setCurrentView(item.id)} 
                 className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-[#e6f0ff] text-[#1e40af] border-l-4 border-[#1e40af] font-bold' : 'text-[#1e40af] hover:bg-gray-50 border-l-4 border-transparent'}`}
               >
                 <item.icon size={18} className={isActive ? 'text-[#1e40af]' : 'text-[#1e40af]'} />{item.label}
               </button>
             );
          })}
        </nav>
        
        {/* Role Switcher (For Demo) */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Label className="mb-2 text-[10px]">SIMULATE ROLE VIEW</Label>
          <div className="flex border border-gray-300 rounded overflow-hidden">
            {['Client', 'Team', 'Admin'].map(r => (
              <button key={r} onClick={() => { setViewRole(r); setCurrentView('dashboard'); }} className={`flex-1 text-[10px] font-bold uppercase py-1.5 transition-colors ${viewRole === r ? 'bg-[#1e40af] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{r}</button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full mt-14 relative z-10 overflow-y-auto">
        <div className="flex-1">
          {currentView === 'dashboard' && <DashboardView viewRole={viewRole} />}
          {currentView === 'requests' && <RequestsView viewRole={viewRole} showToast={showToast} />}
          {currentView === 'campaigns' && <CampaignsView viewRole={viewRole} showToast={showToast} />}
          {currentView === 'adaccounts' && <div className="p-8 text-center text-gray-500 font-medium">Ad Accounts settings interface mapped.</div>}
          {currentView === 'billing' && <BillingView viewRole={viewRole} />}
          {currentView === 'payment_details' && <PaymentDetailsView viewRole={viewRole} />}
          {currentView === 'settings' && <SettingsView viewRole={viewRole} showToast={showToast} />}
        </div>
        
        {/* Footer to match the portal design */}
        <footer className="text-center py-6 text-xs text-[#1e40af] font-semibold">
           Copyright © 2026 All Rights Reserved <br/>
           <span className="font-normal text-gray-600">Developed by Tech Unit, AdFlow Pro</span>
        </footer>
      </main>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] md:hidden flex">
          <div className="w-64 bg-white h-full flex flex-col animate-in slide-in-from-left duration-200 shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-300 bg-[#1e40af]">
              <span className="font-bold text-lg text-white">MENU</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white"><X size={20}/></button>
            </div>
            <nav className="flex-1 py-4 overflow-y-auto">
               {NAVIGATION.map((item, idx) => {
                 if (item.section) return <div key={`msec-${idx}`} className="px-4 pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase">{item.section}</div>;
                 if (item.adminOnly && viewRole === 'Client') return null;
                 return (
                  <button key={item.id} onClick={() => {setCurrentView(item.id); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentView === item.id ? 'bg-[#e6f0ff] text-[#1e40af] border-l-4 border-[#1e40af] font-bold' : 'text-[#1e40af] border-l-4 border-transparent'}`}>
                    <item.icon size={18} />{item.label}
                  </button>
                )
               })}
            </nav>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}
    </div>
  );
}