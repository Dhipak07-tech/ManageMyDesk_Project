import React, { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_HIERARCHY, Role } from "../lib/roles";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Map, AlertTriangle, ArrowUpRight, Zap, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  "1 - Critical": { color: "#e74c3c", bg: "bg-red-500/15", border: "border-red-500/40", label: "Critical" },
  "2 - High":     { color: "#f39c12", bg: "bg-orange-500/15", border: "border-orange-500/40", label: "High" },
  "3 - Moderate": { color: "#27ae60", bg: "bg-green-500/15", border: "border-green-500/40", label: "Moderate" },
  "4 - Low":      { color: "#3498db", bg: "bg-blue-500/15", border: "border-blue-500/40", label: "Low" },
};

function toMs(val: any): number {
  if (!val) return NaN;
  if (typeof val === 'object' && val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1_000_000;
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val === 'number') return val;
  return new Date(val).getTime();
}


function IncidentMapView({ tickets }: { tickets: any[] }) {
  const [viewMode, setViewMode] = useState<"group" | "category" | "priority" | "individual">("group");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filters for By Individual
  const [indDate, setIndDate] = useState("all");
  const [indPriority, setIndPriority] = useState("all");
  const [indStatus, setIndStatus] = useState("all");
  const [indSort, setIndSort] = useState("most_assigned");
  const [indSearch, setIndSearch] = useState("");

  const openTickets = useMemo(
    () => tickets.filter(t => !["Resolved", "Closed", "Canceled"].includes(t.status ?? "")),
    [tickets]
  );

  const individualStats = useMemo(() => {
    if (viewMode !== "individual") return [];
    
    // Apply ticket-level filters before aggregation
    const now = Date.now();
    const filteredTickets = tickets.filter(t => {
      // Date Filter
      if (indDate === "7d" && now - toMs(t.createdAt) > 7 * 24 * 3600 * 1000) return false;
      if (indDate === "30d" && now - toMs(t.createdAt) > 30 * 24 * 3600 * 1000) return false;
      
      // Priority Filter
      if (indPriority !== "all" && !t.priority?.includes(indPriority)) return false;
      
      // Status Filter
      if (indStatus !== "all" && t.status !== indStatus) return false;

      return true;
    });

    const stats: Record<string, any> = {};
    
    filteredTickets.forEach(t => {
      // Aggregate by assignee
      if (t.assignedTo || t.assignedToName) {
        const id = t.assignedTo || t.assignedToName;
        const name = t.assignedToName || t.assignedTo || "Unknown";
        
        if (!stats[id]) {
          stats[id] = { id, name, assigned: 0, created: 0, resolved: 0, pending: 0, inProgress: 0, escalated: 0, closed: 0, openTickets: [] };
        }
        
        stats[id].assigned++;
        
        const status = t.status || "New";
        if (status === "Resolved") stats[id].resolved++;
        else if (status === "Closed") stats[id].closed++;
        else if (status === "In Progress") stats[id].inProgress++;
        else if (status === "Escalated") stats[id].escalated++;
        else if (status !== "Canceled") stats[id].pending++;
        
        if (!["Resolved", "Closed", "Canceled"].includes(status)) {
          stats[id].openTickets.push(t);
        }
      }
      
      // Aggregate by creator
      if (t.createdBy) {
        const id = t.createdBy;
        const name = t.caller || "Unknown";
        if (!stats[id]) {
          stats[id] = { id, name, assigned: 0, created: 0, resolved: 0, pending: 0, inProgress: 0, escalated: 0, closed: 0, openTickets: [] };
        }
        // Only count creation if we haven't already filtered out the user logic.
        stats[id].created++;
      }
    });

    return Object.values(stats)
      .map(s => {
        const totalCompleted = s.resolved + s.closed;
        const totalActionable = s.assigned;
        const resRate = totalActionable > 0 ? (totalCompleted / totalActionable) * 100 : 0;
        
        let workload = "Low";
        const active = s.pending + s.inProgress + s.escalated;
        if (active > 10) workload = "High";
        else if (active > 4) workload = "Medium";
        
        return { ...s, resolutionRate: resRate, workload, activeCount: active };
      })
      .filter(s => {
        if (indSearch && !s.name.toLowerCase().includes(indSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (indSort === "highest_resolved") return (b.resolved + b.closed) - (a.resolved + a.closed);
        if (indSort === "most_pending") return b.pending - a.pending;
        if (indSort === "highest_workload") return b.activeCount - a.activeCount;
        if (indSort === "most_active") return (b.assigned + b.created) - (a.assigned + a.created);
        if (indSort === "best_resolution") return b.resolutionRate - a.resolutionRate;
        return b.assigned - a.assigned; // most_assigned
      });
  }, [tickets, viewMode, indDate, indPriority, indStatus, indSort, indSearch]);

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    openTickets.forEach(t => {
      let key: string;
      if (viewMode === "group") {
        key = (t.assignmentGroup && t.assignmentGroup.trim()) ? t.assignmentGroup : "Unassigned";
      } else if (viewMode === "category") {
        const catValue = t.incidentCategory || t.incident_category || t.category;
        key = (catValue && catValue.trim()) ? catValue : "Uncategorized";
      } else {
        key = t.priority || "4 - Low";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups)
      .map(([name, items]) => ({ name, items, count: items.length }))
      .sort((a, b) => b.count - a.count);
  }, [openTickets, viewMode]);

  if (openTickets.length === 0 && viewMode !== "individual") {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-bold text-lg">All Clear!</p>
        <p className="text-sm">No open incidents to display on the map.</p>
      </div>
    );
  }

  if (viewMode === "individual" && individualStats.length === 0) {
    return (
      <div className="space-y-4">
        {/* Render View Mode Tabs to allow switching back */}
        <div className="flex items-center gap-2">
          {(["group", "category", "priority", "individual"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === mode
                  ? "bg-sn-green text-sn-dark shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {mode === "group" ? "By Group" : mode === "category" ? "By Category" : mode === "priority" ? "By Priority" : "By Individual"}
            </button>
          ))}
        </div>
        <div className="h-96 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
          <Users className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold text-lg">No Individual Data</p>
          <p className="text-sm">No analytics available for the selected filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex items-center gap-2">
        {(["group", "category", "priority", "individual"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              viewMode === mode
                ? "bg-sn-green text-sn-dark shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {mode === "group" ? "By Group" : mode === "category" ? "By Category" : mode === "priority" ? "By Priority" : "By Individual"}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {viewMode === "individual" ? `${individualStats.length} individuals` : `${openTickets.length} open incidents`}
        </div>
      </div>

      {viewMode === "individual" && (
        <div className="p-3 bg-muted/20 border border-border rounded-xl flex flex-wrap gap-3 items-center">
          <input 
            type="text" 
            placeholder="Search User..." 
            value={indSearch} 
            onChange={e => setIndSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white dark:bg-black/20 outline-none focus:ring-1 focus:ring-sn-green w-40"
          />
          <select value={indDate} onChange={e => setIndDate(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white dark:bg-black/20 outline-none focus:ring-1 focus:ring-sn-green">
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <select value={indPriority} onChange={e => setIndPriority(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white dark:bg-black/20 outline-none focus:ring-1 focus:ring-sn-green">
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
          <select value={indStatus} onChange={e => setIndStatus(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white dark:bg-black/20 outline-none focus:ring-1 focus:ring-sn-green">
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={indSort} onChange={e => setIndSort(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white dark:bg-black/20 outline-none focus:ring-1 focus:ring-sn-green ml-auto font-bold text-sn-green">
            <option value="most_assigned">Most Assigned</option>
            <option value="highest_resolved">Highest Resolved</option>
            <option value="most_pending">Most Pending</option>
            <option value="highest_workload">Highest Workload</option>
            <option value="most_active">Most Active</option>
            <option value="best_resolution">Best Resolution Rate</option>
          </select>
        </div>
      )}

      {/* Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {viewMode === "individual" ? (
          individualStats.map(user => (
            <div key={user.id} className="sn-card relative overflow-hidden group p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sn-green/20 to-sn-green/5 flex items-center justify-center text-sn-green font-black text-lg border border-sn-green/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm truncate w-40" title={user.name}>{user.name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", 
                      user.workload === 'High' ? 'bg-red-500/15 text-red-600 border border-red-500/30' : 
                      user.workload === 'Medium' ? 'bg-orange-500/15 text-orange-600 border border-orange-500/30' : 
                      'bg-green-500/15 text-green-600 border border-green-500/30'
                    )}>
                      {user.workload} Workload
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 bg-muted/30 rounded-lg border border-border flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Assigned</div>
                  <div className="font-black text-lg text-foreground">{user.assigned}</div>
                </div>
                <div className="p-2 bg-green-500/5 rounded-lg border border-green-500/20 flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold text-green-600/80 uppercase tracking-wider mb-0.5">Resolved</div>
                  <div className="font-black text-lg text-green-600">{user.resolved + user.closed}</div>
                </div>
                <div className="p-2 bg-orange-500/5 rounded-lg border border-orange-500/20 flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold text-orange-600/80 uppercase tracking-wider mb-0.5">Pending</div>
                  <div className="font-black text-lg text-orange-600">{user.pending}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg border border-border flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Created</div>
                  <div className="font-black text-lg text-foreground">{user.created}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span className="text-muted-foreground">Resolution Rate</span>
                  <span className={user.resolutionRate > 80 ? "text-sn-green" : user.resolutionRate > 50 ? "text-orange-500" : "text-red-500"}>
                    {user.resolutionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", 
                    user.resolutionRate > 80 ? "bg-sn-green" : user.resolutionRate > 50 ? "bg-orange-500" : "bg-red-500"
                  )} style={{ width: `${user.resolutionRate}%` }}></div>
                </div>
              </div>

              {/* Existing Ticket List Style for Open Tickets */}
              {user.openTickets.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pt-2 border-t border-border/50">
                  {user.openTickets.slice(0, 5).map((t: any) => {
                    const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG["4 - Low"];
                    const isSlaBreached = t.responseSlaStatus === "Breached" || t.resolutionSlaStatus === "Breached";
                    return (
                      <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-2 p-1.5 rounded-lg transition-all text-[10px] hover:bg-black/5 dark:hover:bg-white/5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="font-mono font-bold text-blue-600 truncate w-16">{t.number || t.id.slice(0,8)}</span>
                        <span className="text-muted-foreground truncate flex-1">{t.title || "—"}</span>
                        {isSlaBreached && <Zap className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                  {user.openTickets.length > 5 && (
                    <div className="text-[9px] text-muted-foreground text-center pt-1 font-bold">+{user.openTickets.length - 5} more active</div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
        groupedData.map(group => {
          const criticalCount = group.items.filter((t: any) => t.priority?.includes("Critical")).length;
          const highCount = group.items.filter((t: any) => t.priority?.includes("High")).length;
          const breachedCount = group.items.filter(
            (t: any) => t.responseSlaStatus === "Breached" || t.resolutionSlaStatus === "Breached"
          ).length;

          return (
            <div
              key={group.name}
              className={cn(
                "relative rounded-xl border-2 p-4 transition-all duration-300 cursor-default group overflow-hidden",
                criticalCount > 0
                  ? "border-red-400/60 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 shadow-lg shadow-red-500/10"
                  : highCount > 0
                    ? "border-orange-400/40 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10"
                    : "border-border bg-gradient-to-br from-white to-muted/30 dark:from-gray-900 dark:to-gray-800/50"
              )}
            >
              {/* Pulse indicator for critical */}
              {criticalCount > 0 && (
                <div className="absolute top-3 right-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
                    <div className="w-3 h-3 bg-red-500 rounded-full relative" />
                  </div>
                </div>
              )}

              {/* Group Name */}
              <h4 className="text-sm font-bold text-foreground mb-2 pr-6 truncate">{group.name}</h4>

              {/* Count */}
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className={cn(
                    "text-3xl font-black tabular-nums leading-none",
                    criticalCount > 0 ? "text-red-600" : highCount > 0 ? "text-orange-600" : "text-foreground"
                  )}
                >
                  {group.count}
                </span>
                <span className="text-xs text-muted-foreground font-medium">incidents</span>
              </div>

              {/* Priority Breakdown Bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mb-3">
                {["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].map(p => {
                  const pCount = group.items.filter((t: any) => t.priority === p).length;
                  if (pCount === 0) return null;
                  const pct = (pCount / group.count) * 100;
                  return (
                    <div
                      key={p}
                      className="h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: PRIORITY_CONFIG[p]?.color || "#94a3b8" }}
                      title={`${PRIORITY_CONFIG[p]?.label}: ${pCount}`}
                    />
                  );
                })}
              </div>

              {/* Priority Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["1 - Critical", "2 - High", "3 - Moderate", "4 - Low"].map(p => {
                  const pCount = group.items.filter((t: any) => t.priority === p).length;
                  if (pCount === 0) return null;
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <span
                      key={p}
                      className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border", cfg.bg, cfg.border)}
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}: {pCount}
                    </span>
                  );
                })}
              </div>

              {/* SLA Breach Warning */}
              {breachedCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-600 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider animate-pulse">
                    {breachedCount} SLA Breached
                  </span>
                </div>
              )}

              {/* Ticket List */}
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {group.items.slice(0, 8).map((t: any) => {
                  const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG["4 - Low"];
                  const isSlaBreached =
                    t.responseSlaStatus === "Breached" || t.resolutionSlaStatus === "Breached";
                  return (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-lg transition-all text-[10px] group/item",
                        hoveredId === t.id
                          ? "bg-black/5 dark:bg-white/5"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                      onMouseEnter={() => setHoveredId(t.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="font-mono font-bold text-blue-600 truncate">
                        {t.number || t.id.slice(0, 8)}
                      </span>
                      <span className="text-muted-foreground truncate flex-1">{t.title || "—"}</span>
                      {isSlaBreached && <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 flex-shrink-0" />
                    </Link>
                  );
                })}
                {group.items.length > 8 && (
                  <div className="text-[10px] text-muted-foreground text-center py-1 font-medium">
                    +{group.items.length - 8} more
                  </div>
                )}
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-2">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {cfg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [resolutionData, setResolutionData] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const isAgent = ROLE_HIERARCHY[profile.role as Role] >= ROLE_HIERARCHY["agent"];
    const ticketsRef = collection(db, "tickets");
    const q = isAgent ? query(ticketsRef) : query(ticketsRef, where("createdBy", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const ticketsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTickets(ticketsList);

        // Status Distribution
        const statusCounts: any = {};
        ticketsList.forEach((t: any) => {
          statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        });
        setData(Object.keys(statusCounts).map(status => ({ name: status, count: statusCounts[status] })));

        // Category Distribution
        const catCounts: any = {};
        ticketsList.forEach((t: any) => {
          const catValue = t.incidentCategory || t.incident_category || t.category || "Uncategorized";
          catCounts[catValue] = (catCounts[catValue] || 0) + 1;
        });
        setCategoryData(Object.keys(catCounts).map(cat => ({ name: cat, value: catCounts[cat] })));

        // Resolution Code Distribution
        const resCounts: any = {};
        ticketsList.forEach((t: any) => {
          if (t.status === "Resolved" || t.status === "Closed") {
            const code = t.resolutionCode || "Uncoded";
            resCounts[code] = (resCounts[code] || 0) + 1;
          }
        });
        setResolutionData(Object.keys(resCounts).map(code => ({ name: code, count: resCounts[code] })));

        // SLA Compliance dynamically calculated
        const slaCounts = { "Within SLA": 0, "At Risk": 0, Breached: 0 };
        const now = Date.now();

        const getDynamicSLAStatus = (ticket: any, type: 'response' | 'resolution') => {
          const metAt = type === 'response' ? ticket.firstResponseAt : ticket.resolvedAt;
          if (metAt) {
            const metMs = toMs(metAt);
            if (!isNaN(metMs)) return "Within SLA"; // Or completed
          }

          if (type === 'resolution' && !ticket.firstResponseAt && ticket.status === "New") {
             // Resolution timer hasn't started yet
             return "Within SLA";
          }

          const deadline = type === 'response' ? ticket.responseDeadline : ticket.resolutionDeadline;
          const deadlineMs = toMs(deadline);
          
          if (isNaN(deadlineMs)) return "Within SLA"; // Ignore tickets without deadlines

          const isPaused = ticket.status === "On Hold" || ticket.status === "Waiting for Customer" || ticket.status === "Awaiting User" || ticket.status === "Awaiting Vendor";
          
          let effectiveNow = now;
          if (isPaused && ticket.onHoldStart) {
            const holdMs = toMs(ticket.onHoldStart);
            if (!isNaN(holdMs)) effectiveNow = holdMs;
          }
          
          const diff = deadlineMs - effectiveNow + (Number(ticket.totalPausedTime) || 0);

          if (diff <= 0) return "Breached";
          if (diff < 3600000) return "At Risk"; // Less than 1 hour left
          return "Within SLA";
        };

        ticketsList.forEach((t: any) => {
          // Exclude resolved/closed/canceled tickets from "At Risk" or "Breached" if they met it.
          // But actually, we want to know historically if they breached.
          // If they are closed/resolved, getDynamicSLAStatus handles metAt checking.
          const respStatus = getDynamicSLAStatus(t, 'response');
          const resStatus = getDynamicSLAStatus(t, 'resolution');

          if (resStatus === "Breached" || respStatus === "Breached") {
            slaCounts["Breached"]++;
          } else if (resStatus === "At Risk" || respStatus === "At Risk") {
            slaCounts["At Risk"]++;
          } else {
            slaCounts["Within SLA"]++;
          }
        });

        setSlaData([
          { name: "Within SLA", value: slaCounts["Within SLA"] },
          { name: "At Risk", value: slaCounts["At Risk"] },
          { name: "Breached", value: slaCounts["Breached"] },
        ]);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, "tickets");
      }
    );
    return unsubscribe;
  }, []);

  const COLORS = ["#81B532", "#151B26", "#3b82f6", "#ef4444", "#f59e0b"];
  const SLA_COLORS = ["#81B532", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Visual insights into service desk performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SLA Compliance Widget */}
        <div className="sn-card">
          <h3 className="text-lg font-bold mb-6">SLA Compliance Rate</h3>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slaData.some(d => d.value > 0) ? slaData : [{ name: "No Data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={slaData.some(d => d.value > 0) ? 3 : 0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(slaData.some(d => d.value > 0) ? slaData : [{ name: "No Data", value: 1 }]).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          slaData.some(d => d.value > 0)
                            ? SLA_COLORS[index % SLA_COLORS.length]
                            : "#e2e8f0"
                        }
                      />
                    )
                  )}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [value + " tickets", name]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-4xl font-bold text-sn-dark dark:text-white leading-none">
                {(() => {
                  const total = slaData.reduce((sum, d) => sum + d.value, 0);
                  const withinSla = slaData[0]?.value ?? 0;
                  return total > 0 ? Math.round((withinSla / total) * 100) : 0;
                })()}
                %
              </span>
              <span className="text-xs text-muted-foreground font-medium mt-1">Compliance</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {slaData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SLA_COLORS[index % SLA_COLORS.length] }}
                />
                <span className="text-sm font-medium text-foreground">
                  {entry.name}:&nbsp;<strong>{entry.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="sn-card">
          <h3 className="text-lg font-bold mb-6">Ticket Status Distribution</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar dataKey="count" fill="#81B532" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sn-card">
          <h3 className="text-lg font-bold mb-6">Tickets by Category</h3>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Codes Chart */}
        <div className="sn-card">
          <h3 className="text-lg font-bold mb-6">Tickets by Resolution Code</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  resolutionData.length > 0
                    ? resolutionData
                    : [{ name: "No Resolved Tickets", count: 0 }]
                }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={9} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══ CRITICAL INCIDENTS MAP — FULL WIDTH ═══ */}
        <div className="sn-card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Map className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Critical Incidents Map</h3>
              <p className="text-xs text-muted-foreground">
                Interactive visualization of open incidents by group, category, or priority.
              </p>
            </div>
          </div>
          <IncidentMapView tickets={tickets} />
        </div>
      </div>
    </div>
  );
}
