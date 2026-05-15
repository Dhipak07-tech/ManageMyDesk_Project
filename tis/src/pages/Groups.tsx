import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, writeBatch, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Search, Plus, Trash2, Edit2, Users as UsersIcon, X, Shield, Zap, Clock, Globe, UserCheck, BarChart3, Settings, ExternalLink, Mail, MapPin } from "lucide-react";
import { GROUP_TYPES, GROUP_MEMBER_ROLES } from "../lib/serviceCatalog";
import { cn } from "@/lib/utils";

// A simple fallback Button component since @/components/ui/button doesn't exist
const Button = ({ className, ...props }: any) => (
  <button
    className={`px-4 py-2 rounded font-bold hover:opacity-90 transition disabled:opacity-50 ${className}`}
    {...props}
  />
);

export function Groups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const INITIAL_FORM_STATE = { 
    name: '', 
    code: '',
    description: '', 
    email: '',
    type: 'Service Desk',
    managerId: '',
    managerName: '',
    businessHours: '09:00 - 18:00',
    timezone: 'UTC',
    escalationGroupId: '',
    parentGroupId: '',
    defaultAssigneeId: '',
    autoAssignmentEnabled: false,
    roundRobinEnabled: false,
    skillTags: '',
    queueCapacity: 50,
    region: 'Global',
    status: 'active'
  };

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [availableSearch, setAvailableSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, "settings_groups"), snap => 
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubUsers = onSnapshot(collection(db, "users"), snap => 
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubGroups(); unsubUsers(); };
  }, []);
  const handleCreateOrUpdate = async () => {
    if (!form.name) return;
    try {
      const managerName = form.managerId ? users.find(u => u.id === form.managerId || u.uid === form.managerId)?.name || "" : "";
      
      const groupData = {
        name: form.name,
        code: form.code,
        description: form.description,
        email: form.email,
        type: form.type,
        managerId: form.managerId,
        managerName: managerName,
        businessHours: form.businessHours,
        timezone: form.timezone,
        escalationGroupId: form.escalationGroupId,
        parentGroupId: form.parentGroupId,
        defaultAssigneeId: form.defaultAssigneeId,
        autoAssignmentEnabled: form.autoAssignmentEnabled,
        roundRobinEnabled: form.roundRobinEnabled || false,
        skillTags: Array.isArray(form.skillTags) ? form.skillTags : typeof form.skillTags === 'string' ? form.skillTags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        queueCapacity: Number(form.queueCapacity),
        region: form.region,
        status: form.status,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.name || 'System'
      };

      // Firestore throws an error if any field is undefined. Clean the data.
      Object.keys(groupData).forEach((k) => {
        if ((groupData as any)[k] === undefined) {
          delete (groupData as any)[k];
        }
      });

      if (selectedGroup) {
        const batch = writeBatch(db);
        batch.update(doc(db, "settings_groups", selectedGroup.id), groupData);
        await batch.commit();
      } else {
        const newRef = doc(collection(db, "settings_groups"));
        await setDoc(newRef, {
          ...groupData,
          memberIds: [],
          memberCount: 0,
          openTickets: 0,
          slaCompliance: 100,
          createdAt: new Date().toISOString(),
          createdBy: profile?.name || 'System'
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error saving group: " + (e.message || String(e)));
    }
  };

  const handleDelete = async (group: any) => {
    if (!confirm(`Delete group ${group.name}?`)) return;
    try {
      const batch = writeBatch(db);
      // Remove this group from all users
      (group.memberIds || []).forEach((userId: string) => {
        batch.update(doc(db, "users", userId), { groupIds: arrayRemove(group.id) });
      });
      batch.delete(doc(db, "settings_groups", group.id));
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async (userId: string) => {
    // Optimistic UI: Update local state immediately
    const updatedMemberIds = [...(selectedGroup.memberIds || []), userId];
    const updatedGroup = { ...selectedGroup, memberIds: updatedMemberIds, memberCount: updatedMemberIds.length };
    
    // Update both main list and current selected group
    setSelectedGroup(updatedGroup);
    setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "settings_groups", selectedGroup.id), { 
        memberIds: arrayUnion(userId),
        memberCount: updatedMemberIds.length
      });
      batch.update(doc(db, "users", userId), { 
        groupIds: arrayUnion(selectedGroup.id) 
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
      // Rollback on error (simplified: fetch fresh data via onSnapshot)
      alert("Failed to add member.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // Optimistic UI: Update local state immediately
    const updatedMemberIds = (selectedGroup.memberIds || []).filter((id: string) => id !== userId);
    const updatedGroup = { ...selectedGroup, memberIds: updatedMemberIds, memberCount: updatedMemberIds.length };
    
    setSelectedGroup(updatedGroup);
    setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "settings_groups", selectedGroup.id), { 
        memberIds: arrayRemove(userId),
        memberCount: updatedMemberIds.length
      });
      batch.update(doc(db, "users", userId), { 
        groupIds: arrayRemove(selectedGroup.id) 
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
      alert("Failed to remove member.");
    }
  };

  const filtered = groups.filter(g => !search || g.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 w-full max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sn-dark">Group Management</h1>
          <p className="text-muted-foreground text-sm">Manage assignment groups and members</p>
        </div>
        <Button onClick={() => { setSelectedGroup(null); setForm(INITIAL_FORM_STATE); setIsModalOpen(true); }} className="bg-sn-green text-sn-dark font-bold">
          <Plus className="w-4 h-4 mr-2" /> Create Group
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-sn-green" />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} groups</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(group => (
          <div key={group.id} className="bg-white border-2 border-border rounded-xl overflow-hidden hover:border-sn-green/40 transition-all duration-300 shadow-sm hover:shadow-md group">
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-br from-white to-muted/5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sn-green/10 rounded-lg">
                    <Shield className="w-5 h-5 text-sn-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-sn-dark leading-tight">{group.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{group.code || 'NO_CODE'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase border border-indigo-100">
                    {group.type || 'Standard'}
                  </span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border",
                    group.status === 'active' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {group.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 h-8 leading-relaxed italic">{group.description || 'No description provided.'}</p>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 divide-x divide-border bg-muted/10 border-b border-border">
              <div className="p-3 text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-black mb-0.5">Open Tickets</p>
                <p className="text-sm font-bold text-sn-dark">{group.openTickets || 0}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-black mb-0.5">SLA Compliance</p>
                <p className={cn("text-sm font-bold", (group.slaCompliance || 0) < 90 ? "text-red-600" : "text-emerald-600")}>
                  {group.slaCompliance || 100}%
                </p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-black mb-0.5">Members</p>
                <p className="text-sm font-bold text-indigo-600">{(group.memberIds || []).length}</p>
              </div>
            </div>

            {/* Quick Details */}
            <div className="p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="font-bold uppercase tracking-tight">Manager</span>
                </div>
                <span className="font-bold text-sn-dark">{group.managerName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-bold uppercase tracking-tight">Hours ({group.timezone || 'UTC'})</span>
                </div>
                <span className="font-medium text-sn-dark">{group.businessHours || '24/7'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-bold uppercase tracking-tight">Auto-Routing</span>
                </div>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                  group.autoAssignmentEnabled ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                )}>
                  {group.autoAssignmentEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 bg-muted/5 border-t border-border flex justify-between items-center group-hover:bg-muted/10 transition-colors">
              <button 
                onClick={() => { setSelectedGroup(group); setIsMembersModalOpen(true); }} 
                className="text-sn-green text-[11px] hover:underline font-black flex items-center gap-1.5 uppercase tracking-wider"
              >
                <UsersIcon className="w-3.5 h-3.5" /> Manage Queue
              </button>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { 
                    setSelectedGroup(group); 
                    setForm({
                      name: group.name, 
                      code: group.code || '',
                      description: group.description, 
                      email: group.email || '',
                      type: group.type || 'Service Desk',
                      managerId: group.managerId || '',
                      managerName: group.managerName || '',
                      businessHours: group.businessHours || '09:00 - 18:00',
                      timezone: group.timezone || 'UTC',
                      escalationGroupId: group.escalationGroupId || '',
                      parentGroupId: group.parentGroupId || '',
                      defaultAssigneeId: group.defaultAssigneeId || '',
                      autoAssignmentEnabled: group.autoAssignmentEnabled || false,
                      roundRobinEnabled: group.roundRobinEnabled || false,
                      skillTags: Array.isArray(group.skillTags) ? group.skillTags.join(', ') : (group.skillTags || ''),
                      queueCapacity: group.queueCapacity || 50,
                      region: group.region || 'Global',
                      status: group.status || 'active'
                    }); 
                    setIsModalOpen(true); 
                    setActiveTab("general");
                  }} 
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Group"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(group)} 
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 text-white rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-sn-dark">{selectedGroup ? 'Edit Assignment Group' : 'Create Assignment Group'}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Enterprise Group Configuration</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-border bg-muted/5">
              {[
                { id: 'general', label: 'General', icon: <Shield className="w-3.5 h-3.5" /> },
                { id: 'operations', label: 'Operations', icon: <Zap className="w-3.5 h-3.5" /> },
                { id: 'routing', label: 'Routing & Escalation', icon: <BarChart3 className="w-3.5 h-3.5" /> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-r border-border transition-all",
                    activeTab === tab.id ? "bg-white text-sn-green border-b-2 border-b-sn-green" : "text-muted-foreground hover:bg-muted/10"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'general' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Group Name</label>
                      <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none transition-all" placeholder="e.g. Network Team" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Group Code</label>
                      <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm font-mono text-sn-dark focus:ring-2 focus:ring-sn-green outline-none transition-all" placeholder="e.g. GRP_NET" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Group Type</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none h-11">
                      {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Group Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-border rounded-lg pl-10 p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" placeholder="group@company.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Manager</label>
                      <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none h-11">
                        <option value="">-- Unassigned --</option>
                        {users.filter(u => u.role === 'agent' || u.role === 'admin' || u.role === 'sub_admin' || u.role === 'super_admin' || u.role === 'ultra_super_admin').map(u => (
                          <option key={u.id} value={u.id}>{u.name || u.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm h-24 text-sn-dark focus:ring-2 focus:ring-sn-green outline-none resize-none" placeholder="Enter group purpose and scope..." />
                  </div>
                </div>
              )}

              {activeTab === 'operations' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Business Hours</label>
                      <div className="relative">
                        <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={form.businessHours} onChange={e => setForm({...form, businessHours: e.target.value})} className="w-full border border-border rounded-lg pl-10 p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" placeholder="e.g. 09:00 - 18:00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Timezone</label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})} className="w-full border border-border rounded-lg pl-10 p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" placeholder="e.g. IST (UTC+5:30)" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Region/Location</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="w-full border border-border rounded-lg pl-10 p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" placeholder="e.g. APAC, EMEA" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Queue Capacity</label>
                      <input type="number" value={form.queueCapacity} onChange={e => setForm({...form, queueCapacity: Number(e.target.value)})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Operational Status</label>
                    <div className="flex gap-4">
                      {['active', 'inactive'].map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={form.status === s} onChange={() => setForm({...form, status: s})} className="w-4 h-4 text-sn-green focus:ring-sn-green" />
                          <span className="text-sm capitalize text-sn-dark font-medium">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'routing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="bg-muted/20 p-4 rounded-xl space-y-4 border border-border">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Assignment Controls</h4>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center justify-between p-3 bg-white border border-border rounded-lg cursor-pointer hover:border-sn-green/50 transition-all">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-sn-dark">Auto-Assignment</span>
                          <span className="text-[10px] text-muted-foreground">Automatically route new tickets to this group</span>
                        </div>
                        <input type="checkbox" checked={form.autoAssignmentEnabled} onChange={e => setForm({...form, autoAssignmentEnabled: e.target.checked})} className="w-5 h-5 rounded text-sn-green focus:ring-sn-green" />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-white border border-border rounded-lg cursor-pointer hover:border-sn-green/50 transition-all">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-sn-dark">Round Robin</span>
                          <span className="text-[10px] text-muted-foreground">Distribute tickets evenly among available members</span>
                        </div>
                        <input type="checkbox" checked={form.roundRobinEnabled} onChange={e => setForm({...form, roundRobinEnabled: e.target.checked})} className="w-5 h-5 rounded text-sn-green focus:ring-sn-green" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Escalation Group</label>
                      <select value={form.escalationGroupId} onChange={e => setForm({...form, escalationGroupId: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none h-11">
                        <option value="">-- None --</option>
                        {groups.filter(g => g.id !== selectedGroup?.id).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Default Assignee</label>
                      <select value={form.defaultAssigneeId} onChange={e => setForm({...form, defaultAssigneeId: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none h-11">
                        <option value="">-- Unassigned --</option>
                        {users.filter(u => (selectedGroup?.memberIds || []).includes(u.id)).map(u => (
                          <option key={u.id} value={u.id}>{u.name || u.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Required Skill Tags (Comma separated)</label>
                    <input value={form.skillTags} onChange={e => setForm({...form, skillTags: e.target.value})} className="w-full border border-border rounded-lg p-2.5 text-sm text-sn-dark focus:ring-2 focus:ring-sn-green outline-none" placeholder="e.g. SAP, Azure, Firewall, Security" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border flex justify-end gap-3 bg-muted/5">
              <Button onClick={() => setIsModalOpen(false)} className="bg-white border border-border text-sn-dark hover:bg-muted/20">Cancel</Button>
              <Button onClick={handleCreateOrUpdate} className="bg-sn-green text-sn-dark font-black uppercase tracking-widest text-[11px] px-8 h-11 shadow-lg shadow-sn-green/20 hover:shadow-sn-green/40 active:scale-95 transition-all">
                {selectedGroup ? 'Update Group' : 'Create Group'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isMembersModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sn-green/10 flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-sn-green" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-sn-dark">Manage Members</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-muted rounded font-mono">{selectedGroup.name}</span>
                    <span>• {selectedGroup.email || 'No email set'}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMembersModalOpen(false)} className="hover:bg-muted p-1.5 rounded-full transition-colors">
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-grow overflow-hidden grid grid-cols-2 divide-x divide-border bg-muted/5">
              {/* Current Members Column */}
              <div className="flex flex-col h-full overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Current Members ({(selectedGroup.memberIds || []).length})
                  </h4>
                </div>
                <div className="relative mb-4">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Filter current members..." 
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-sn-green"
                  />
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {users
                    .filter(u => (selectedGroup.memberIds || []).includes(u.id))
                    .filter(u => !memberSearch || u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || u.email?.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(u => (
                      <div key={u.id} className="group flex flex-col p-4 bg-white border border-border rounded-xl hover:border-sn-green/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-sn-dark/5 flex items-center justify-center text-xs font-bold text-sn-dark uppercase">
                                {u.name?.split(' ').map((n:string) => n[0]).join('') || u.email[0]}
                              </div>
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                u.availabilityStatus === 'available' ? "bg-emerald-500" : 
                                u.availabilityStatus === 'away' ? "bg-amber-500" : "bg-gray-300"
                              )} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-sn-dark flex items-center gap-2">
                                {u.name || u.email}
                                {u.id === selectedGroup.managerId && <Shield className="w-3 h-3 text-sn-green" title="Group Manager" />}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-medium">{u.email}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveMember(u.id)} 
                            className="text-muted-foreground hover:text-red-600 p-1 rounded-md transition-colors"
                            title="Remove from group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-border/50">
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">Group Role</p>
                            <select 
                              className="w-full bg-muted/30 border border-border rounded-md px-2 py-1 text-[10px] font-bold text-sn-dark outline-none focus:ring-1 focus:ring-sn-green"
                              defaultValue={u.roleInGroup || "Support Agent"}
                            >
                              {GROUP_MEMBER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">Workload</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-grow bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-sn-green h-full" style={{ width: `${Math.min((u.currentWorkload || 0) * 10, 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-sn-dark">{u.currentWorkload || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {(selectedGroup.memberIds || []).length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/5 text-muted-foreground italic text-sm">
                      No members assigned
                    </div>
                  )}
                </div>
              </div>

              {/* Available Users Column */}
              <div className="flex flex-col h-full overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Available Users</h4>
                </div>
                <div className="relative mb-4">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search available users..." 
                    value={availableSearch}
                    onChange={e => setAvailableSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-sn-green"
                  />
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {users
                    .filter(u => !(selectedGroup.memberIds || []).includes(u.id))
                    .filter(u => !availableSearch || u.name?.toLowerCase().includes(availableSearch.toLowerCase()) || u.email?.toLowerCase().includes(availableSearch.toLowerCase()))
                    .map(u => (
                      <div 
                        key={u.id} 
                        className="group flex justify-between items-center p-3 bg-white border border-border rounded-lg hover:border-sn-green/50 hover:bg-sn-green/5 cursor-pointer transition-all shadow-sm"
                        onClick={() => handleAddMember(u.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sn-green/10 flex items-center justify-center text-[10px] font-bold text-sn-green uppercase">
                            {u.name?.split(' ').map((n:string) => n[0]).join('') || u.email[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-sn-dark">{u.name || u.email}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center group-hover:border-sn-green group-hover:bg-sn-green group-hover:text-white transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
