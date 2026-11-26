"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  project: string;
  budget: string;
  timeline: string;
  source: "Web form" | "Property CSV";
  score: number;
  status: "New" | "Contacted" | "Qualified" | "Needs consent";
  assignedTo: string;
  consent: boolean;
  consentAt: string;
  dnc: boolean;
  createdAt: string;
};

type Intake = Omit<Lead, "id" | "source" | "score" | "status" | "assignedTo" | "consent" | "consentAt" | "dnc" | "createdAt"> & { consent: boolean };

const STORAGE_KEY = "remodelflow-leads-v1";
const DNC_KEY = "remodelflow-dnc-v1";
const PEOPLE = ["Avery Chen", "Jordan Lee", "Morgan Patel"];
const CITIES = ["San Jose", "Santa Clara", "San Francisco"];
const PROJECTS = ["Kitchen", "Bathroom", "ADU", "Addition"];
const initialLeads: Lead[] = [
  { id: "RF-1048", name: "Maya Thompson", email: "maya.t@example.com", phone: "(408) 555-0134", city: "San Jose", project: "Kitchen", budget: "$50k–$100k", timeline: "1–3 months", source: "Web form", score: 92, status: "Qualified", assignedTo: "Avery Chen", consent: true, consentAt: "Nov 26, 2026 · 9:42 AM", dnc: false, createdAt: "Today, 9:42 AM" },
  { id: "RF-1047", name: "Daniel Kim", email: "daniel.k@example.com", phone: "(650) 555-0198", city: "Santa Clara", project: "ADU", budget: "$100k+", timeline: "ASAP", source: "Web form", score: 88, status: "New", assignedTo: "Jordan Lee", consent: true, consentAt: "Nov 26, 2026 · 8:16 AM", dnc: false, createdAt: "Today, 8:16 AM" },
  { id: "RF-1046", name: "Elena Garcia", email: "elena.g@example.com", phone: "(415) 555-0162", city: "San Francisco", project: "Bathroom", budget: "$25k–$50k", timeline: "3–6 months", source: "Property CSV", score: 34, status: "Needs consent", assignedTo: "Unassigned", consent: false, consentAt: "—", dnc: false, createdAt: "Today, 7:50 AM" },
  { id: "RF-1045", name: "Noah Williams", email: "noah.w@example.com", phone: "(408) 555-0117", city: "San Jose", project: "Addition", budget: "$100k+", timeline: "1–3 months", source: "Web form", score: 76, status: "Contacted", assignedTo: "Morgan Patel", consent: true, consentAt: "Nov 25, 2026 · 4:31 PM", dnc: false, createdAt: "Yesterday, 4:31 PM" },
  { id: "RF-1044", name: "Olivia Martinez", email: "olivia.m@example.com", phone: "(650) 555-0181", city: "Santa Clara", project: "Kitchen", budget: "$25k–$50k", timeline: "6+ months", source: "Property CSV", score: 28, status: "Needs consent", assignedTo: "Unassigned", consent: false, consentAt: "—", dnc: false, createdAt: "Yesterday, 2:05 PM" },
];

function scoreLead(data: Pick<Intake, "project" | "budget" | "timeline" | "city">) {
  const budgetPoints: Record<string, number> = { "$100k+": 35, "$50k–$100k": 28, "$25k–$50k": 19, "Under $25k": 10, "Not sure": 8 };
  const timelinePoints: Record<string, number> = { ASAP: 30, "1–3 months": 26, "3–6 months": 18, "6+ months": 10, "Just researching": 5 };
  return Math.min(99, (budgetPoints[data.budget] ?? 10) + (timelinePoints[data.timeline] ?? 10) + (data.project === "ADU" || data.project === "Addition" ? 20 : 16) + (CITIES.includes(data.city) ? 14 : 0));
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvEscape(value: string) { return `"${value.replace(/"/g, '""')}"`; }

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [dncPhones, setDncPhones] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("All locations");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [showForm, setShowForm] = useState(false);
  const [showDnc, setShowDnc] = useState(false);
  const [dncInput, setDncInput] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Intake>({ name: "", email: "", phone: "", city: "San Jose", project: "Kitchen", budget: "$50k–$100k", timeline: "1–3 months", consent: false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedDnc = localStorage.getItem(DNC_KEY);
      if (stored) setLeads(JSON.parse(stored) as Lead[]);
      if (storedDnc) setDncPhones(JSON.parse(storedDnc) as string[]);
    } catch { /* Start with sample data if local storage is unavailable or invalid. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
      localStorage.setItem(DNC_KEY, JSON.stringify(dncPhones));
    }
  }, [leads, dncPhones, ready]);

  const eligibleLeads = leads.filter((lead) => lead.consent && !lead.dnc && !dncPhones.includes(normalizePhone(lead.phone)));
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const matchesText = `${lead.name} ${lead.email} ${lead.phone} ${lead.city} ${lead.project}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (cityFilter === "All locations" || lead.city === cityFilter) && (sourceFilter === "All sources" || lead.source === sourceFilter);
  }), [leads, query, cityFilter, sourceFilter]);
  const totalQualified = leads.filter((lead) => lead.score >= 70 && lead.consent && !lead.dnc).length;
  const stats = [
    { label: "Total leads", value: leads.length.toString(), change: "+12.8%", icon: "◉", tone: "blue" },
    { label: "Qualified leads", value: totalQualified.toString(), change: "+8.2%", icon: "✳", tone: "green" },
    { label: "Avg. lead score", value: leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length).toString() : "0", change: "+4.6%", icon: "↗", tone: "purple" },
    { label: "Ready to export", value: eligibleLeads.length.toString(), change: "Consent verified", icon: "⇧", tone: "orange" },
  ];

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.consent) { notify("Explicit contact consent is required to add an exportable web lead."); return; }
    const phone = normalizePhone(form.phone);
    const isDnc = dncPhones.includes(phone);
    const score = scoreLead(form);
    const next: Lead = {
      ...form,
      id: `RF-${Math.floor(1000 + Math.random() * 9000)}`,
      source: "Web form",
      score,
      status: isDnc ? "Needs consent" : score >= 70 ? "Qualified" : "New",
      assignedTo: isDnc ? "Suppressed" : PEOPLE[leads.length % PEOPLE.length],
      consent: true,
      consentAt: new Date().toLocaleString(),
      dnc: isDnc,
      createdAt: "Just now",
    };
    setLeads((current) => [next, ...current]);
    setForm({ name: "", email: "", phone: "", city: "San Jose", project: "Kitchen", budget: "$50k–$100k", timeline: "1–3 months", consent: false });
    setShowForm(false);
    notify(isDnc ? "Lead saved and suppressed: phone is on the DNC list." : "Opt-in lead added and routed successfully.");
  }

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      if (rows.length < 2) { notify("CSV is empty or missing a header row."); return; }
      const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const find = (record: string[], choices: string[]) => record[headers.findIndex((header) => choices.includes(header))] ?? "";
      const imported: Lead[] = rows.slice(1).map((cells, index) => {
        const name = find(cells, ["name", "fullname", "ownername"]) || "Unknown homeowner";
        const phone = find(cells, ["phone", "telephone", "phonenumber"]);
        const cityRaw = find(cells, ["city", "propertycity"]);
        const projectRaw = find(cells, ["project", "projecttype", "interest"]).toLowerCase();
        const city = CITIES.find((item) => item.toLowerCase() === cityRaw.toLowerCase()) ?? cityRaw || "Unspecified";
        const project = PROJECTS.find((item) => projectRaw.includes(item.toLowerCase())) ?? "Kitchen";
        const dnc = dncPhones.includes(normalizePhone(phone));
        const importedForm = { project, budget: "Not sure", timeline: "Just researching", city };
        return {
          id: `RF-${Date.now().toString().slice(-5)}${index}`,
          name,
          email: find(cells, ["email", "emailaddress"]),
          phone,
          city,
          project,
          budget: "Not sure",
          timeline: "Just researching",
          source: "Property CSV" as const,
          score: scoreLead(importedForm),
          status: "Needs consent" as const,
          assignedTo: dnc ? "Suppressed" : "Unassigned",
          consent: false,
          consentAt: "—",
          dnc,
          createdAt: "Just imported",
        };
      }).filter((lead) => lead.phone || lead.email);
      setLeads((current) => [...imported, ...current]);
      notify(`${imported.length} property record${imported.length === 1 ? "" : "s"} imported. No marketing consent was inferred; records remain non-exportable until valid consent is recorded.`);
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function exportLeads() {
    const rows = eligibleLeads;
    if (!rows.length) { notify("No consented, non-suppressed leads are ready to export."); return; }
    const columns = ["First Name", "Last Name", "Email", "Phone", "City", "Project", "Budget", "Timeline", "Lead Score", "Assigned To", "Consent", "Consent Timestamp", "Source"];
    const lines = rows.map((lead) => {
      const [first, ...last] = lead.name.trim().split(/\s+/);
      return [first, last.join(" "), lead.email, lead.phone, lead.city, lead.project, lead.budget, lead.timeline, String(lead.score), lead.assignedTo, "Yes", lead.consentAt, lead.source].map(csvEscape).join(",");
    });
    const blob = new Blob([[columns.map(csvEscape).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "remodelflow-consented-leads.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${rows.length} consented lead${rows.length === 1 ? "" : "s"} exported.`);
  }

  function addDnc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = normalizePhone(dncInput);
    if (phone.length < 10) { notify("Enter a valid phone number to add it to suppression."); return; }
    const nextDnc = [...new Set([...dncPhones, phone])];
    setDncPhones(nextDnc);
    setLeads((current) => current.map((lead) => normalizePhone(lead.phone) === phone ? { ...lead, dnc: true, assignedTo: "Suppressed" } : lead));
    setDncInput("");
    notify("Number added to DNC suppression. Matching leads are blocked from export.");
  }

  function changeStatus(id: string, status: Lead["status"]) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status } : lead));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview"><span className="brand-mark">R</span><span>remodel<span className="brand-light">flow</span></span></a>
        <div className="workspace"><div className="workspace-avatar">B</div><div><strong>Bay Area Homes</strong><small>Pro workspace</small></div><span className="chevron">⌄</span></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {[ ["Overview", "▦"], ["Leads", "◎"], ["Routing", "⇄"], ["Analytics", "▥"] ].map(([label, icon]) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); if (label === "Leads") document.getElementById("lead-list")?.scrollIntoView({ behavior: "smooth" }); }}><span className="nav-icon">{icon}</span>{label}{label === "Leads" && <span className="nav-count">{leads.length}</span>}</button>)}
        </nav>
        <div className="nav-label tools-label">TOOLS</div>
        <nav className="side-nav" aria-label="Tools">
          <button className={`nav-item ${showDnc ? "active" : ""}`} onClick={() => setShowDnc(true)}><span className="nav-icon">⊘</span>DNC suppression</button>
          <button className="nav-item" onClick={exportLeads}><span className="nav-icon">⇧</span>Export center</button>
          <button className="nav-item" onClick={() => document.getElementById("csv-upload")?.click()}><span className="nav-icon">⇩</span>Import property data</button>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>Need a hand?</strong><p>Learn how to get the most from your leads.</p><button onClick={() => notify("Getting started: import property CSVs, capture opt-in requests, then export eligible leads.")}>Visit help center <span>↗</span></button></div><button className="profile"><span className="profile-avatar">SC</span><span className="profile-name"><strong>Sophie Carter</strong><small>Administrator</small></span><span className="profile-more">···</span></button></div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Help" onClick={() => notify("Your support team is here to help.")}>?</button><button className="icon-button notification" aria-label="Notifications" onClick={() => notify("You’re all caught up.")}>♧<i /></button><span className="top-divider"/><span className="today-label">Thu, Nov 26, 2026</span><span className="mini-avatar">SC</span></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">THURSDAY, NOVEMBER 26, 2026 <span className="live-dot"/> LIVE OVERVIEW</div><h1>Good morning, Sophie <span>✦</span></h1><p>Here’s what’s happening with your remodeling leads today.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => document.getElementById("csv-upload")?.click()}><span>⇧</span> Import CSV</button><button className="button button-primary" onClick={() => setShowForm(true)}><span>＋</span> Add a lead</button><input id="csv-upload" className="visually-hidden" type="file" accept=".csv,text/csv" onChange={importFile}/></div></div>
          <section className="stats-grid" aria-label="Lead metrics">{stats.map((stat) => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span></div><div className="stat-bottom"><strong>{stat.value}</strong>{stat.label === "Ready to export" ? <span className="stat-note">{stat.change}</span> : <span className="stat-change">↗ {stat.change}</span>}</div><div className="stat-caption">vs. previous 30 days</div></article>)}</section>
          <section className="insight-row"><div className="insight-icon">✦</div><p><strong>Nice work!</strong> You have <b>{eligibleLeads.length} consented lead{eligibleLeads.length === 1 ? "" : "s"}</b> ready for your dialer. Property records stay suppressed until homeowner contact consent is recorded.</p><button onClick={exportLeads}>Export leads <span>→</span></button></section>
          <section className="overview-grid"><article className="panel performance-panel"><div className="panel-heading"><div><h2>Lead performance</h2><p>New and qualified leads over time</p></div><select aria-label="Chart date range" defaultValue="Last 7 days"><option>Last 7 days</option><option>Last 30 days</option></select></div><div className="chart-legend"><span><i className="legend-blue"/> New leads</span><span><i className="legend-green"/> Qualified</span></div><div className="chart-wrap"><div className="chart-y"><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart"><div className="gridline g1"/><div className="gridline g2"/><div className="gridline g3"/><div className="gridline g4"/><svg viewBox="0 0 640 168" preserveAspectRatio="none" role="img" aria-label="Lead performance trend chart"><defs><linearGradient id="fillBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6178ed" stopOpacity=".18"/><stop offset="1" stopColor="#6178ed" stopOpacity="0"/></linearGradient></defs><path d="M0 128 C44 122 42 100 91 111 S143 87 183 94 S229 67 274 82 S329 68 366 74 S419 44 456 61 S508 30 547 50 S597 21 640 26 L640 168 L0 168Z" fill="url(#fillBlue)"/><path d="M0 128 C44 122 42 100 91 111 S143 87 183 94 S229 67 274 82 S329 68 366 74 S419 44 456 61 S508 30 547 50 S597 21 640 26" fill="none" stroke="#6578e8" strokeWidth="3"/><path d="M0 150 C47 145 47 135 91 139 S138 124 183 133 S230 114 274 122 S325 107 366 114 S415 93 456 103 S504 83 547 91 S599 73 640 78" fill="none" stroke="#37a987" strokeWidth="2.5" strokeDasharray="5 5"/></svg><div className="chart-x"><span>Nov 20</span><span>Nov 21</span><span>Nov 22</span><span>Nov 23</span><span>Nov 24</span><span>Nov 25</span><span>Nov 26</span></div></div></div></article>
            <article className="panel sources-panel"><div className="panel-heading"><div><h2>Lead sources</h2><p>Where your leads come from</p></div><button className="more-button" aria-label="More source options">···</button></div><div className="donut-area"><div className="donut"><div className="donut-center"><strong>{leads.length}</strong><small>Total leads</small></div></div><div className="source-legend"><div><i className="source-web"/><span>Opt-in web form</span><strong>{leads.filter((lead) => lead.source === "Web form").length}</strong></div><div><i className="source-property"/><span>Property CSV</span><strong>{leads.filter((lead) => lead.source === "Property CSV").length}</strong></div><div><i className="source-referral"/><span>Other</span><strong>0</strong></div></div></div><div className="source-foot"><span className="source-foot-dot"/> Consent checked before export</div></article></section>
          <section className="panel leads-panel" id="lead-list"><div className="leads-heading"><div><h2>Recent leads <span className="lead-total">{leads.length}</span></h2><p>Review and manage your latest homeowner inquiries</p></div><button className="view-all" onClick={() => { setActiveNav("Leads"); document.getElementById("lead-table")?.scrollIntoView({ behavior: "smooth" }); }}>View all leads <span>→</span></button></div><div className="table-toolbar"><label className="search-box"><span>⌕</span><input aria-label="Search leads" placeholder="Search leads..." value={query} onChange={(event) => setQuery(event.target.value)}/><kbd>⌘ K</kbd></label><div className="table-filters"><select aria-label="Filter by location" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option>All locations</option>{CITIES.map((city) => <option key={city}>{city}</option>)}</select><select aria-label="Filter by source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>All sources</option><option>Web form</option><option>Property CSV</option></select><button className="filter-button" onClick={() => { setCityFilter("All locations"); setSourceFilter("All sources"); setQuery(""); }}>↕ <span>Reset</span></button></div></div><div className="table-scroll" id="lead-table"><table><thead><tr><th>LEAD</th><th>LOCATION</th><th>PROJECT</th><th>LEAD SCORE</th><th>STATUS</th><th>ASSIGNED TO</th><th>CONSENT</th><th/></tr></thead><tbody>{filteredLeads.map((lead) => <tr key={lead.id}><td><div className="lead-person"><span className={`lead-avatar avatar-${lead.id.charCodeAt(lead.id.length - 1) % 5}`}>{lead.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{lead.name}</strong><small>{lead.email || lead.phone || "No contact details"}</small></span></div></td><td><span className="location-cell"><i/> {lead.city}</span></td><td><span className="project-pill">{lead.project}</span></td><td><div className="score-cell"><span className={`score-ring ${lead.score >= 70 ? "high" : lead.score >= 45 ? "medium" : "low"}`}>{lead.score}</span><span className="score-label">{lead.score >= 70 ? "High" : lead.score >= 45 ? "Medium" : "Low"}</span></div></td><td><select className={`status-select status-${lead.status.toLowerCase().replace(/\s/g, "-")}`} value={lead.status} aria-label={`Status for ${lead.name}`} onChange={(event) => changeStatus(lead.id, event.target.value as Lead["status"])}><option>New</option><option>Contacted</option><option>Qualified</option><option>Needs consent</option></select></td><td><span className={`assignee ${lead.assignedTo === "Unassigned" || lead.assignedTo === "Suppressed" ? "unassigned" : ""}`}><i>{lead.assignedTo === "Unassigned" ? "+" : lead.assignedTo === "Suppressed" ? "⊘" : lead.assignedTo.split(" ").map((part) => part[0]).join("")}</i>{lead.assignedTo}</span></td><td>{lead.consent && !lead.dnc && !dncPhones.includes(normalizePhone(lead.phone)) ? <span className="consent-yes"><i>✓</i> Opted in</span> : <span className="consent-no"><i>!</i> Not eligible</span>}</td><td><button className="row-more" aria-label={`More options for ${lead.name}`} onClick={() => notify(`${lead.name} · ${lead.source} · ${lead.consent ? `Consent recorded ${lead.consentAt}` : "No marketing consent recorded"}`)}>···</button></td></tr>)}</tbody></table>{filteredLeads.length === 0 && <div className="empty-state">No leads match your filters.</div>}</div><div className="table-footer"><span>Showing <strong>{filteredLeads.length ? 1 : 0}–{filteredLeads.length}</strong> of <strong>{filteredLeads.length}</strong> leads</span><div><button disabled>← Previous</button><button disabled>Next →</button></div></div></section>
          <footer className="footnote"><span>RemodelFlow</span> · Consent-first lead management · <button onClick={() => notify("Property-derived records are not treated as consent to call or text.")}>Data use &amp; compliance</button><span className="footnote-right">Bay Area · Pacific Time</span></footer>
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title"><div className="modal-heading"><div><span className="modal-kicker">NEW HOMEOWNER INQUIRY</span><h2 id="lead-modal-title">Add an opt-in lead</h2><p>Capture project details and documented contact permission.</p></div><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={submitLead}><div className="form-grid"><label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Jamie Rivera"/></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="jamie@email.com"/></label><label>Phone number<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(408) 555-0100"/></label><label>City<select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>{CITIES.map((city) => <option key={city}>{city}</option>)}</select></label><label>Project type<select value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })}>{PROJECTS.map((project) => <option key={project}>{project}</option>)}</select></label><label>Estimated budget<select value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })}{["Under $25k", "$25k–$50k", "$50k–$100k", "$100k+", "Not sure"].map((value) => <option key={value}>{value}</option>)}</label><label className="full-field">Project timeline<select value={form.timeline} onChange={(event) => setForm({ ...form, timeline: event.target.value })}{["ASAP", "1–3 months", "3–6 months", "6+ months", "Just researching"].map((value) => <option key={value}>{value}</option>)}</label></div><label className="consent-check"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })}/><span><strong>Permission to contact recorded</strong><small>The homeowner requested contact about this project. Record the consent language and timestamp in your production workflow. Do not select based on property records alone.</small></span></label><div className="modal-actions"><span>Lead score is calculated from qualification details.</span><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button button-primary">Save lead <span>→</span></button></div></form></section></div>}

      {showDnc && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDnc(false); }}><section className="modal dnc-modal" role="dialog" aria-modal="true" aria-labelledby="dnc-title"><div className="modal-heading"><div><span className="modal-kicker">SUPPRESSION CONTROLS</span><h2 id="dnc-title">Do-not-call list</h2><p>Suppressed numbers can’t be exported, even if a lead has consent recorded.</p></div><button className="modal-close" onClick={() => setShowDnc(false)} aria-label="Close">×</button></div><form className="dnc-form" onSubmit={addDnc}><label htmlFor="dnc-phone">Add a phone number</label><div><input id="dnc-phone" type="tel" value={dncInput} onChange={(event) => setDncInput(event.target.value)} placeholder="(408) 555-0100" required/><button className="button button-primary" type="submit">Add to DNC</button></div></form><div className="dnc-list-title">Suppressed numbers <span>{dncPhones.length}</span></div>{dncPhones.length ? <ul className="dnc-list">{dncPhones.map((phone) => <li key={phone}><span>⊘ &nbsp; +{phone}</span><button onClick={() => { setDncPhones((current) => current.filter((value) => value !== phone)); notify("Number removed from this workspace suppression list."); }}>Remove</button></li>)}</ul> : <div className="dnc-empty">No numbers added yet. DNC checks are applied to all leads before dialer export.</div>}<div className="compliance-note"><strong>Always verify applicable suppression lists.</strong> This workspace list is a basic operational control, not a substitute for required federal, state, or company-specific do-not-call checks.</div></section></div>}
      {notice && <div className="toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    </main>
  );
}
