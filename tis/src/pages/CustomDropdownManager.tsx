/**
 * Custom Dropdown Manager
 * Allows admins to create, configure, and manage custom dropdowns
 * that appear in the Create New Incident form, scoped per company.
 */
import React, { useEffect, useState } from "react";
import { Plus, Trash2, Settings, ChevronDown, ChevronUp, Building2, Tag, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DropdownOption {
  id: string;
  label: string;
}

interface CustomDropdown {
  id: string;
  name: string;          // e.g. "Department", "Location"
  label: string;         // display label shown in the form
  options: DropdownOption[];
  enabledForAll: boolean; // if true, visible to all companies
  enabledCompanyIds: string[]; // list of company IDs if not all
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

export function CustomDropdownManager() {
  const [dropdowns, setDropdowns] = useState<CustomDropdown[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New dropdown form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDropdownName, setNewDropdownName] = useState("");
  const [newDropdownLabel, setNewDropdownLabel] = useState("");
  const [newDropdownRequired, setNewDropdownRequired] = useState(false);
  const [newDropdownAllCompanies, setNewDropdownAllCompanies] = useState(true);

  useEffect(() => {
    fetchDropdowns();
    fetchCompanies();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const res = await fetch("/api/custom-dropdowns");
      if (res.ok) {
        const data = await res.json();
        setDropdowns(data);
      }
    } catch (err) {
      console.error("Failed to fetch custom dropdowns:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {}
  };

  const handleCreateDropdown = async () => {
    if (!newDropdownName.trim() || !newDropdownLabel.trim()) return;
    setSaving("new");
    try {
      const res = await fetch("/api/custom-dropdowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDropdownName.trim(),
          label: newDropdownLabel.trim(),
          options: [],
          enabledForAll: newDropdownAllCompanies,
          enabledCompanyIds: [],
          isRequired: newDropdownRequired,
          isActive: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setDropdowns(prev => [...prev, created]);
        setNewDropdownName("");
        setNewDropdownLabel("");
        setNewDropdownRequired(false);
        setNewDropdownAllCompanies(true);
        setShowAddForm(false);
        setExpandedId(created.id);
      }
    } catch (err) {
      console.error("Failed to create dropdown:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteDropdown = async (id: string) => {
    if (!confirm("Delete this dropdown? It will no longer appear in ticket forms.")) return;
    try {
      await fetch(`/api/custom-dropdowns/${id}`, { method: "DELETE" });
      setDropdowns(prev => prev.filter(d => d.id !== id));
    } catch (err) {}
  };

  const handleAddOption = async (dropdown: CustomDropdown) => {
    const label = prompt("Enter option label:");
    if (!label?.trim()) return;
    const newOption: DropdownOption = { id: `opt_${Date.now()}`, label: label.trim() };
    const updated = { ...dropdown, options: [...dropdown.options, newOption] };
    await saveDropdown(updated);
  };

  const handleDeleteOption = async (dropdown: CustomDropdown, optionId: string) => {
    const updated = { ...dropdown, options: dropdown.options.filter(o => o.id !== optionId) };
    await saveDropdown(updated);
  };

  const handleToggleActive = async (dropdown: CustomDropdown) => {
    const updated = { ...dropdown, isActive: !dropdown.isActive };
    await saveDropdown(updated);
  };

  const handleToggleCompany = async (dropdown: CustomDropdown, companyId: string) => {
    const enabled = dropdown.enabledCompanyIds.includes(companyId);
    const updated = {
      ...dropdown,
      enabledCompanyIds: enabled
        ? dropdown.enabledCompanyIds.filter(id => id !== companyId)
        : [...dropdown.enabledCompanyIds, companyId],
      enabledForAll: false,
    };
    await saveDropdown(updated);
  };

  const handleToggleAllCompanies = async (dropdown: CustomDropdown) => {
    const updated = {
      ...dropdown,
      enabledForAll: !dropdown.enabledForAll,
      enabledCompanyIds: !dropdown.enabledForAll ? [] : dropdown.enabledCompanyIds,
    };
    await saveDropdown(updated);
  };

  const saveDropdown = async (dropdown: CustomDropdown) => {
    setSaving(dropdown.id);
    try {
      const res = await fetch(`/api/custom-dropdowns/${dropdown.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dropdown),
      });
      if (res.ok) {
        const updated = await res.json();
        setDropdowns(prev => prev.map(d => d.id === updated.id ? updated : d));
      }
    } catch (err) {
      console.error("Failed to save dropdown:", err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading custom dropdowns...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-sn-green" />
            Custom Dropdown Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add custom dropdown fields to the Create New Incident form. Control which companies see each dropdown.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(s => !s)}
          className="bg-sn-green text-sn-dark font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Dropdown
        </Button>
      </div>

      {/* Add New Dropdown Form */}
      {showAddForm && (
        <div className="bg-white border border-sn-green/40 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-sn-green">New Custom Dropdown</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Field Name (internal key)</label>
              <input
                value={newDropdownName}
                onChange={e => setNewDropdownName(e.target.value)}
                placeholder="e.g. department"
                className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Display Label</label>
              <input
                value={newDropdownLabel}
                onChange={e => setNewDropdownLabel(e.target.value)}
                placeholder="e.g. Department"
                className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newDropdownRequired}
                onChange={e => setNewDropdownRequired(e.target.checked)}
                className="w-4 h-4 accent-sn-green"
              />
              <span className="text-sm font-medium">Required field</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newDropdownAllCompanies}
                onChange={e => setNewDropdownAllCompanies(e.target.checked)}
                className="w-4 h-4 accent-sn-green"
              />
              <span className="text-sm font-medium">Enable for all companies</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button
              onClick={handleCreateDropdown}
              disabled={!newDropdownName.trim() || !newDropdownLabel.trim() || saving === "new"}
              className="bg-sn-green text-sn-dark font-bold"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving === "new" ? "Creating..." : "Create Dropdown"}
            </Button>
          </div>
        </div>
      )}

      {/* Dropdown List */}
      {dropdowns.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No custom dropdowns yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Dropdown" to create your first custom field.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dropdowns.map(dropdown => (
            <div
              key={dropdown.id}
              className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${dropdown.isActive ? 'border-border' : 'border-border/40 opacity-70'}`}
            >
              {/* Dropdown Header Row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dropdown.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{dropdown.label}</span>
                      {dropdown.isRequired && (
                        <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded uppercase">Required</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      key: <span className="font-mono">{dropdown.name}</span>
                      {" · "}
                      <span>{dropdown.options.length} option{dropdown.options.length !== 1 ? 's' : ''}</span>
                      {" · "}
                      <span className={dropdown.enabledForAll ? 'text-green-600 font-medium' : 'text-blue-600 font-medium'}>
                        {dropdown.enabledForAll ? 'All Companies' : `${dropdown.enabledCompanyIds.length} company${dropdown.enabledCompanyIds.length !== 1 ? 'ies' : ''}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(dropdown)}
                    title={dropdown.isActive ? "Disable" : "Enable"}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    {dropdown.isActive ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteDropdown(dropdown.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="Delete dropdown"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === dropdown.id ? null : dropdown.id)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1"
                  >
                    {expandedId === dropdown.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Configuration Panel */}
              {expandedId === dropdown.id && (
                <div className="border-t border-border px-5 pb-5 pt-4 bg-muted/10 grid grid-cols-2 gap-6">
                  {/* Options Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dropdown Options</h3>
                      <button
                        onClick={() => handleAddOption(dropdown)}
                        className="flex items-center gap-1 text-xs font-bold text-sn-green hover:text-sn-green/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Option
                      </button>
                    </div>
                    {dropdown.options.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-lg">
                        No options yet. Click "Add Option" to add choices.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {dropdown.options.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-2 group">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-mono w-5">{idx + 1}.</span>
                              <span className="text-sm">{opt.label}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteOption(dropdown, opt.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Company Visibility Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Company Visibility
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mb-3 bg-white border border-border rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={dropdown.enabledForAll}
                        onChange={() => handleToggleAllCompanies(dropdown)}
                        className="w-4 h-4 accent-sn-green"
                      />
                      <span className="text-sm font-semibold">Enable for ALL companies</span>
                    </label>
                    {!dropdown.enabledForAll && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {companies.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-lg">
                            No companies found.
                          </p>
                        ) : (
                          companies.map(company => (
                            <label
                              key={company.id}
                              className="flex items-center gap-2 cursor-pointer bg-white border border-border rounded-lg px-3 py-2 hover:border-sn-green/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={dropdown.enabledCompanyIds.includes(company.id)}
                                onChange={() => handleToggleCompany(dropdown, company.id)}
                                className="w-4 h-4 accent-sn-green"
                              />
                              <span className="text-sm">{company.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
