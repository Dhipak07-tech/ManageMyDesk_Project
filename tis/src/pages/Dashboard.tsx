import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RefreshCw, LayoutGrid, Clock, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate } from "../lib/utils";

function toMs(val: any): number {
  if (!val) return NaN;
  if (typeof val === 'object' && val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1_000_000;
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val === 'number') return val;
  return new Date(val).getTime();
}

import { SLATimer } from "../components/SLATimer";

const PRIORITY_COLORS: Record<string, string> = {
  "1 - Critical": "#e74c3c",
  "2 - High": "#f39c12",
  "3 - Moderate": "#27ae60",
  "4 - Low": "#3498db",
};

export function Dashboard() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [users, setUsers] = useState<any[]>([]);
  const [layout, setLayout] = useState<'standard' | 'compact'>('standard');

  useEffect(() => {
    const unsubTickets = onSnapshot(query(collection(db, "tickets")), snap => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setLastRefresh(new Date());
    });
    const unsubUsers = onSnapshot(query(collection(db, "users")), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTickets(); unsubUsers(); };
  }, []);

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  const getTs = (t: any) => {
    const c = t.createdAt;
    if (!c) return 0;
    if (c?.seconds) return c.seconds * 1000;
    if (typeof c === "string") return new Date(c).getTime();
    return 0;
  };

  const open = tickets.filter(t => !["Resolved", "Closed", "Canceled"].includes(t.status ?? ""));
  
  const criticalOpen = open.filter(t => (t.priority ?? "").includes("Critical")).length;
  const unassigned = open.filter(t => !t.assignedTo).length;
  const overdue = open.filter(t => t.resolutionDeadline && new Date(t.resolutionDeadline).getTime() < now).length;
  const openCount = open.length;
  const stale7 = open.filter(t => getTs(t) < sevenDaysAgo).length;
  const older30 = open.filter(t => getTs(t) < thirtyDaysAgo).length;

  const priorityGroups = ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].map(p => ({
    name: p.replace(" - ", "\n"),
    label: p,
    count: open.filter(t => t.priority === p).length,
  }));

  const older30Groups = ["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].map(p => ({
    name: p.replace(" - ", "\n"),
    label: p,
    count: open.filter(t => t.priority === p && getTs(t) < thirtyDaysAgo).length,
  }));

  const recent = [...tickets]
    .sort((a, b) => getTs(b) - getTs(a))
    .slice(0, 8);

  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
  const avgResTime = resolvedTickets.length > 0 
    ? resolvedTickets.reduce((acc, t) => {
        const start = getTs(t);
        const end = t.resolvedAt ? toMs(t.resolvedAt) : (t.updatedAt ? toMs(t.updatedAt) : start);
        return acc + (end - start);
      }, 0) / resolvedTickets.length / 3600000 
    : 0;

  const activeSLAs = open.filter(t => (t.responseSlaStatus === 'In Progress' || t.resolutionSlaStatus === 'In Progress')).length;
  const nearBreachSLAs = open.filter(t => {
    const respDeadline = t.responseDeadline ? new Date(t.responseDeadline).getTime() : Infinity;
    const resDeadline = t.resolutionDeadline ? new Date(t.resolutionDeadline).getTime() : Infinity;
    const now = Date.now();
    const isNear = (d: number) => d !== Infinity && (d - now) < (0.2 * (24 * 3600 * 1000));
    return isNear(respDeadline) || isNear(resDeadline);
  }).length;

  const completedCount = tickets.filter(t => t.responseSlaStatus === 'Completed').length + tickets.filter(t => t.resolutionSlaStatus === 'Completed').length;
  const breachedCount = tickets.filter(t => t.responseSlaStatus === 'Breached').length + tickets.filter(t => t.resolutionSlaStatus === 'Breached').length;
  const totalSLAs = tickets.length * 2;

  const slaStats = {
    active: activeSLAs,
    nearBreach: nearBreachSLAs,
    breached: breachedCount,
    completed: completedCount,
    total: totalSLAs,
    completedPct: totalSLAs > 0 ? Math.round((completedCount / totalSLAs) * 100) : 0,
    breachedPct: totalSLAs > 0 ? Math.round((breachedCount / totalSLAs) * 100) : 0,
    avgResTime: avgResTime.toFixed(1)
  };

  const statCards = [
    { label: "Critical Open Incidents", value: criticalOpen, color: "text-red-500 font-bold", link: "/tickets?filter=critical_open" },
    { label: "Unassigned Incidents", value: unassigned, color: "text-foreground", link: "/tickets?filter=unassigned" },
    { label: "Overdue Incidents", value: overdue, color: "text-red-600 font-black", link: "/tickets?filter=overdue" },
    { label: "Open Incidents", value: openCount, color: "text-foreground", link: "/tickets?filter=open" },
    { label: "Incidents not updated for 7 days", value: stale7, color: "text-foreground", link: "/tickets?filter=stale_7" },
    { label: "Open Incidents older than 30 Days", value: older30, color: "text-foreground", link: "/tickets?filter=older_30" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Incident Overview</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLastRefresh(new Date())}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button 
            onClick={() => setLayout(prev => prev === 'standard' ? 'compact' : 'standard')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-all",
              layout === 'compact' ? "bg-sn-green/10 border-sn-green text-sn-dark" : "border-border hover:bg-muted"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {layout === 'standard' ? 'Compact Layout' : 'Standard Layout'}
          </button>
          <span className="text-[10px] text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className={cn("grid gap-6", layout === 'compact' ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1")}>
        <div className={cn(
          "bg-white border border-border rounded-lg shadow-sm overflow-hidden h-fit",
          layout === 'compact' ? "md:col-span-1" : "grid grid-cols-1"
        )}>
          <div className={cn("grid divide-border", layout === 'compact' ? "grid-cols-1 divide-y" : "grid-cols-3 divide-x")}>
            {statCards.slice(0, 3).map((s, i) => (
              <Link key={i} to={s.link} className={cn("p-6 text-center hover:bg-muted/10 transition-colors group", layout === 'compact' && "p-4")}>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
                <div className={cn("font-light transition-transform inline-block", s.color, layout === 'compact' ? "text-3xl" : "text-5xl")}>
                  {loading ? "—" : s.value}
                </div>
              </Link>
            ))}
          </div>
          <div className={cn("grid divide-border border-t border-border", layout === 'compact' ? "grid-cols-1 divide-y" : "grid-cols-3 divide-x")}>
            {statCards.slice(3, 6).map((s, i) => (
              <Link key={i} to={s.link} className={cn("p-6 text-center hover:bg-muted/10 transition-colors group", layout === 'compact' && "p-4")}>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
                <div className={cn("font-light transition-transform inline-block", s.color, layout === 'compact' ? "text-3xl" : "text-5xl")}>
                  {loading ? "—" : s.value}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className={cn("grid gap-6", layout === 'compact' ? "md:col-span-2 grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
          <div className="bg-white border border-border rounded-lg shadow-sm p-5 h-full">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-4">Open Incidents — Grouped by Priority</h3>
            <div className={cn("transition-all duration-500", layout === 'compact' ? "h-40" : "h-56")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityGroups} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" fontSize={9} width={90} />
                  <Tooltip formatter={(v: any) => [v, "Tickets"]} contentStyle={{ fontSize: 10, borderRadius: 8, border: 'none' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {priorityGroups.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.label] || "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-border rounded-lg shadow-sm p-5 h-full">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground mb-4">Open Incidents older than 30 Days</h3>
            <div className={cn("transition-all duration-500", layout === 'compact' ? "h-40" : "h-56")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={older30Groups} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" fontSize={9} width={90} />
                  <Tooltip formatter={(v: any) => [v, "Tickets"]} contentStyle={{ fontSize: 10, borderRadius: 8, border: 'none' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {older30Groups.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.label] || "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced SLA Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total SLAs", value: slaStats.total, color: "text-slate-600", icon: Clock },
          { label: "SLA Completed %", value: `${slaStats.completedPct}%`, color: "text-emerald-600", icon: CheckCircle2 },
          { label: "Breached SLA %", value: `${slaStats.breachedPct}%`, color: "text-red-600", icon: ShieldAlert },
          { label: "Avg Resolution", value: `${slaStats.avgResTime}h`, color: "text-blue-600", icon: Clock },
          { label: "Near Breach", value: slaStats.nearBreach, color: "text-orange-500", icon: AlertCircle }
        ].map((s, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 shadow-sm flex items-center gap-4 group hover:border-sn-green/30 transition-all hover:shadow-md">
            <div className={cn("p-2.5 rounded-lg bg-muted/30 group-hover:bg-muted transition-colors")}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className={cn("text-xl font-bold tracking-tight", s.color)}>{loading ? "—" : s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
          <h3 className="text-sm font-bold">Recent Incidents</h3>
          <Link to="/tickets" className="text-xs text-blue-600 hover:underline font-medium uppercase tracking-widest">View All Incidents</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
                <th className="p-3">Number</th>
                <th className="p-3">Short Description</th>
                <th className="p-3">Priority</th>
                <th className="p-3">State</th>
                <th className="p-3">Category</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3">SLA Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No incidents found.</td></tr>
              ) : recent.map(t => {
                const p = t.priority ?? "4 - Low";
                const pColor = p.includes("Critical") ? "bg-red-600 text-white"
                  : p.includes("High") ? "bg-red-100 text-red-700"
                    : p.includes("Moderate") ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700";
                const isPaused = t.status === "On Hold" || t.status === "Waiting for Customer";

                return (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                    <td className="p-3">
                      <Link to={`/tickets/${t.id}`} className="font-mono text-[11px] font-bold text-blue-600 hover:underline">
                        {t.number ?? t.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="p-3 text-[11px] font-medium max-w-[200px] truncate">{t.title ?? "—"}</td>
                    <td className="p-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${pColor}`}>{p}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-medium">{t.status ?? "New"}</span>
                    </td>
                    <td className="p-3 text-[11px] text-muted-foreground">{t.category ?? "—"}</td>
                    <td className="p-3 text-[11px] font-medium">
                      {t.assignedToName || users.find(u => u.id === t.assignedTo)?.name || t.assignedTo || "Unassigned"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5">
                        <SLATimer
                          label="Resp"
                          deadline={t.responseDeadline}
                          metAt={t.firstResponseAt}
                          isPaused={isPaused}
                          onHoldStart={t.onHoldStart}
                          totalPausedTime={t.totalPausedTime}
                        />
                        <SLATimer
                          label="Res"
                          deadline={t.resolutionDeadline}
                          metAt={t.resolvedAt}
                          isPaused={isPaused}
                          onHoldStart={t.onHoldStart}
                          totalPausedTime={t.totalPausedTime}
                          waitUntil={t.firstResponseAt ?? null}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
