import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Shield, 
  Send, 
  RefreshCw,
  MoreVertical,
  Check,
  Building2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

interface EmailConfig {
  id: string;
  company_name: string;
  email_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_pass: string;
  encryption: string;
  is_active: number;
  is_default: number;
  created_at: string;
}

export function EmailIntegrations() {
  const { profile } = useAuth();
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  // Premium Wizard States
  const [currentStep, setCurrentStep] = useState(1);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showImapPass, setShowImapPass] = useState(false);

  // Reset wizard states when opening the modal
  useEffect(() => {
    if (showModal) {
      setCurrentStep(1);
      setShowSmtpPass(false);
      setShowImapPass(false);
      setTestResult(null);
    }
  }, [showModal]);
  
  const [form, setForm] = useState<Partial<EmailConfig>>({
    company_name: "",
    email_address: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_user: "",
    imap_pass: "",
    encryption: "TLS",
    is_active: 1,
    is_default: 0
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-configs");
      const data = await res.json();
      setConfigs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/email-configs/${editingId}` : "/api/email-configs";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchConfigs();
        setForm({
          company_name: "",
          email_address: "",
          smtp_host: "smtp.gmail.com",
          smtp_port: 587,
          smtp_user: "",
          smtp_pass: "",
          imap_host: "imap.gmail.com",
          imap_port: 993,
          imap_user: "",
          imap_pass: "",
          encryption: "TLS",
          is_active: 1,
          is_default: 0
        });
        setEditingId(null);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email-configs/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.detail || data.message || data.error });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    }
    setTesting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;
    try {
      await fetch(`/api/email-configs/${id}`, { method: "DELETE" });
      fetchConfigs();
    } catch (e) { console.error(e); }
  };

  if (profile?.role !== 'ultra_super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only Ultra Super Admins can manage email integrations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Email Integration Management</h1>
          <p className="text-muted-foreground">Manage multi-company SMTP and IMAP configurations for automated support ticketing.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowModal(true); }} className="bg-sn-green text-sn-dark font-bold gap-2">
          <Plus className="w-4 h-4" /> Add Integration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.map(config => (
          <div key={config.id} className="sn-card p-6 flex flex-col space-y-4 relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sn-green/10 flex items-center justify-center text-sn-green">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sn-dark">{config.company_name}</h3>
                  <p className="text-xs text-muted-foreground">{config.email_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {config.is_default === 1 && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Default</span>
                )}
                {config.is_active === 1 ? (
                  <CheckCircle className="w-4 h-4 text-sn-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Status</p>
                <div className="flex items-center gap-1.5 text-xs text-sn-dark">
                  <Send className="w-3.5 h-3.5" /> {config.smtp_host}:{config.smtp_port}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">IMAP Status</p>
                <div className="flex items-center gap-1.5 text-xs text-sn-dark">
                  <RefreshCw className="w-3.5 h-3.5" /> {config.imap_host}:{config.imap_port}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setEditingId(config.id);
                setForm(config);
                setShowModal(true);
              }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(config.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {configs.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center sn-card bg-muted/20">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-lg text-sn-dark">No Integrations Configured</h3>
            <p className="text-muted-foreground text-sm">Add your first company email configuration to start polling tickets.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[950px] overflow-hidden animate-in zoom-in duration-300 flex flex-col border border-slate-100 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sn-green/10 flex items-center justify-center text-sn-green">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{editingId ? "Edit Integration" : "Add New Integration"}</h2>
                  <p className="text-xs text-slate-400">Configure company-specific email connection settings.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Close modal"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Step Header */}
            <div className="px-8 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between max-w-[650px] mx-auto">
                {[
                  { step: 1, label: 'Company Details' },
                  { step: 2, label: 'Security' },
                  { step: 3, label: 'Email Configuration' }
                ].map((s, idx) => (
                  <React.Fragment key={s.step}>
                    {idx > 0 && (
                      <div className={`flex-grow h-0.5 mx-4 rounded-full transition-all duration-300 ${currentStep >= s.step ? 'bg-sn-green' : 'bg-slate-100'}`} />
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(s.step)}
                      className="flex items-center gap-2.5 focus:outline-none group"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                        currentStep === s.step
                          ? 'bg-sn-green border-sn-green text-sn-dark font-extrabold shadow-sm shadow-sn-green/20'
                          : currentStep > s.step
                          ? 'bg-sn-green/15 border-sn-green/20 text-sn-green'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                      }`}>
                        {currentStep > s.step ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                      </div>
                      <span className={`text-xs font-semibold hidden sm:inline transition-colors ${
                        currentStep === s.step ? 'text-slate-800 font-bold' : 'text-slate-400 group-hover:text-slate-600'
                      }`}>
                        {s.label}
                      </span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden">
              {/* Modal Body with Scrollable Area */}
              <div className="p-8 overflow-y-auto space-y-6 flex-grow custom-scrollbar min-h-[300px]">
                
                {/* STEP 1: COMPANY DETAILS */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-5">
                      <div>
                        <label htmlFor="company_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Company Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
                          <input 
                            id="company_name"
                            required 
                            placeholder="e.g. Technosprint"
                            value={form.company_name} 
                            onChange={e => setForm(f => ({...f, company_name: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-sn-green/40 focus:border-sn-green transition-all" 
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">Enter the display or registered name of the customer company.</p>
                      </div>
                      
                      <div>
                        <label htmlFor="email_address" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Support Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
                          <input 
                            id="email_address"
                            required 
                            type="email" 
                            placeholder="e.g. support@technosprint.net"
                            value={form.email_address} 
                            onChange={e => setForm(f => ({...f, email_address: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-sn-green/40 focus:border-sn-green transition-all" 
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">The primary inbox used for processing ticketing and support issues.</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-8 pt-4">
                      <div className="flex items-center gap-3">
                        <button 
                          id="toggle_active"
                          type="button" 
                          onClick={() => setForm(f => ({...f, is_active: f.is_active === 1 ? 0 : 1}))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_active === 1 ? 'bg-sn-green' : 'bg-slate-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div>
                          <label htmlFor="toggle_active" className="text-sm font-semibold text-slate-700 block">Active Integration</label>
                          <span className="text-xs text-slate-400">Trigger background mail polling and processing.</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          id="toggle_default"
                          type="button" 
                          onClick={() => setForm(f => ({...f, is_default: f.is_default === 1 ? 0 : 1}))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_default === 1 ? 'bg-blue-500' : 'bg-slate-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_default === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div>
                          <label htmlFor="toggle_default" className="text-sm font-semibold text-slate-700 block">Set as Default Integration</label>
                          <span className="text-xs text-slate-400">Use this fallback for unmatched incoming email domains.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: SECURITY SELECTION */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="text-center max-w-md mx-auto mb-6">
                      <Lock className="w-8 h-8 text-sn-green mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Encryption Layer</h4>
                      <p className="text-xs text-slate-400 mt-1">Configure the cryptographic security layer required by your mail server.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'TLS', label: '🔒 TLS', desc: 'Recommended for secure email transmission (standard).' },
                        { id: 'SSL', label: '🔐 SSL', desc: 'Alternative secure connection for dedicated environments.' },
                        { id: 'None', label: '⚪ None', desc: 'No encryption (insecure). Plain-text transmission.' }
                      ].map(opt => {
                        const isSelected = form.encryption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setForm(f => ({...f, encryption: opt.id}))}
                            className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none flex flex-col justify-between h-40 ${
                              isSelected 
                                ? 'border-sn-green bg-sn-green/5 shadow-md shadow-sn-green/10 ring-2 ring-sn-green/20' 
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between w-full">
                              <span className="text-2xl font-bold text-slate-800">{opt.label}</span>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-sn-green flex items-center justify-center text-sn-dark">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <div className="mt-4">
                              <span className="block text-xs text-slate-500 leading-normal">
                                {opt.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: EMAIL CONFIGURATION (SMTP & IMAP) */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: SMTP Settings */}
                      <div className="bg-slate-50/50 border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Send className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">📤 SMTP Settings (Outbound)</h4>
                            <span className="text-[10px] text-slate-400">Used for dispatching auto-replies and notifications.</span>
                          </div>
                        </div>

                        <div className="space-y-4 mt-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label htmlFor="smtp_host" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">SMTP Host</label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input 
                                  id="smtp_host"
                                  required 
                                  placeholder="smtp.gmail.com"
                                  value={form.smtp_host} 
                                  onChange={e => setForm(f => ({...f, smtp_host: e.target.value}))}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1 block">Used for sending outgoing emails</span>
                            </div>
                            <div>
                              <label htmlFor="smtp_port" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Port</label>
                              <input 
                                id="smtp_port"
                                required 
                                type="number" 
                                placeholder="587"
                                value={form.smtp_port} 
                                onChange={e => setForm(f => ({...f, smtp_port: parseInt(e.target.value)}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                              <span className="text-[9px] text-slate-400 mt-1 block">Recommended port: 587 (TLS)</span>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="smtp_user" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Username</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <input 
                                id="smtp_user"
                                required 
                                placeholder="e.g. user@gmail.com"
                                value={form.smtp_user} 
                                onChange={e => setForm(f => ({...f, smtp_user: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">Outgoing SMTP authentication username.</span>
                          </div>

                          <div>
                            <label htmlFor="smtp_pass" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Password / App Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <input 
                                id="smtp_pass"
                                required 
                                type={showSmtpPass ? "text" : "password"} 
                                placeholder="••••••••••••"
                                value={form.smtp_pass} 
                                onChange={e => setForm(f => ({...f, smtp_pass: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-10 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                              <button 
                                type="button"
                                onClick={() => setShowSmtpPass(!showSmtpPass)}
                                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">Authentication credentials or service key.</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: IMAP Settings */}
                      <div className="bg-slate-50/50 border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">📥 IMAP Settings (Inbound)</h4>
                            <span className="text-[10px] text-slate-400">Used for retrieving incoming emails for tickets.</span>
                          </div>
                        </div>

                        <div className="space-y-4 mt-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label htmlFor="imap_host" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">IMAP Host</label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input 
                                  id="imap_host"
                                  required 
                                  placeholder="imap.gmail.com"
                                  value={form.imap_host} 
                                  onChange={e => setForm(f => ({...f, imap_host: e.target.value}))}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1 block">Used for reading incoming emails</span>
                            </div>
                            <div>
                              <label htmlFor="imap_port" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Port</label>
                              <input 
                                id="imap_port"
                                required 
                                type="number" 
                                placeholder="993"
                                value={form.imap_port} 
                                onChange={e => setForm(f => ({...f, imap_port: parseInt(e.target.value)}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                              <span className="text-[9px] text-slate-400 mt-1 block">Recommended port: 993 (SSL/TLS)</span>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="imap_user" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Username</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <input 
                                id="imap_user"
                                required 
                                placeholder="e.g. user@gmail.com"
                                value={form.imap_user} 
                                onChange={e => setForm(f => ({...f, imap_user: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">Incoming IMAP authentication username.</span>
                          </div>

                          <div>
                            <label htmlFor="imap_pass" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Password / App Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <input 
                                id="imap_pass"
                                required 
                                type={showImapPass ? "text" : "password"} 
                                placeholder="••••••••••••"
                                value={form.imap_pass} 
                                onChange={e => setForm(f => ({...f, imap_pass: e.target.value}))}
                                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-10 text-xs outline-none focus:ring-1 focus:ring-sn-green" 
                              />
                              <button 
                                type="button"
                                onClick={() => setShowImapPass(!showImapPass)}
                                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showImapPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">Authentication credentials or service key.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connection Status Area */}
                <div className="pt-2">
                  {testing && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-full px-4 py-2 w-fit animate-pulse">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-ping" />
                      <span>Testing Connection...</span>
                    </div>
                  )}

                  {!testing && testResult && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-top-2 duration-200 ${
                      testResult.success 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {testResult.success ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">🟢 Connected Successfully</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span className="text-xs font-bold">🔴 Authentication Failed</span>
                          </div>
                          <p className="text-[11px] opacity-90 pl-4">{testResult.message}</p>
                          {testResult.message?.includes('535') && (
                            <p className="text-[10px] pl-4 font-medium text-rose-600">
                              Tip: Gmail/Office365 requires an "App Password" instead of your normal account password.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTest} 
                  disabled={testing} 
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold text-xs h-9 gap-2 shadow-sm animate-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> 
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowModal(false)} 
                    className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs h-9 px-6 animate-all"
                  >
                    Cancel
                  </Button>

                  {currentStep > 1 && (
                    <Button 
                      type="button" 
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 px-4 gap-1 animate-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </Button>
                  )}

                  {currentStep < 3 ? (
                    <Button 
                      type="button" 
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="bg-slate-800 text-white hover:bg-slate-700 text-xs h-9 px-5 gap-1 shadow-sm animate-all"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={saving} 
                      className="bg-sn-green text-sn-dark font-extrabold hover:bg-sn-green/95 text-xs h-9 px-8 transition-transform hover:scale-[1.02] shadow-sm animate-all"
                    >
                      {saving ? "Saving..." : editingId ? "Update Integration" : "Save Integration"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
