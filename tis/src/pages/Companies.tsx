import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, doc, getDoc, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Search,
  Phone,
  Mail,
  MapPin,
  Plus,
  ArrowLeft,
  Ticket,
  Clock,
  ChevronRight,
  Globe,
  MoreVertical,
  Edit,
  Star,
  History,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  logoUrl?: string;
  type?: string;
  status?: string;
  createdAt?: string;
}

interface TicketData {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  company?: string;
}

export function Companies() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyTickets, setCompanyTickets] = useState<TicketData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    logoUrl: "",
    type: "Customer",
    status: "Active"
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCompanyDetails(id);
    } else {
      setSelectedCompany(null);
      setCompanyTickets([]);
    }
  }, [id]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name?.trim()) return;

    setSaving(true);
    try {
      if (isEditing && selectedCompany) {
        const { updateDoc, doc } = await import("firebase/firestore");
        const companyData = {
          ...newCompany,
          name: newCompany.name.trim(),
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, "companies", selectedCompany.id), companyData);
        
        // Update local state
        setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, ...companyData } as Company : c));
        setSelectedCompany({ ...selectedCompany, ...companyData } as Company);
      } else {
        const companyData = {
          ...newCompany,
          name: newCompany.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Save to Firestore
        const docRef = await addDoc(collection(db, "companies"), companyData);

        // Update local state
        const createdCompany: Company = {
          id: docRef.id,
          ...companyData,
          createdAt: new Date().toISOString()
        } as Company;

        setCompanies(prev => [...prev, createdCompany].sort((a, b) => a.name.localeCompare(b.name)));
      }

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewCompany({
      name: "",
      contactName: "",
      phone: "",
      email: "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      type: "Customer",
      status: "Active"
    });
    setIsEditing(false);
  };

  const openEditDialog = (company: Company) => {
    setNewCompany({
      name: company.name,
      contactName: company.contactName || "",
      phone: company.phone || "",
      email: company.email || "",
      address1: company.address1 || "",
      address2: company.address2 || "",
      city: company.city || "",
      province: company.province || "",
      postalCode: company.postalCode || "",
      country: company.country || "",
      logoUrl: company.logoUrl || "",
      type: company.type || "Customer",
      status: company.status || "Active",
      website: company.website || ""
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, "companies"), orderBy("name"));
      const snapshot = await getDocs(q);
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];

      if (companiesData.length === 0) {
        // Seed sample data if none exists
        const sampleCompanies: Company[] = [
          {
            id: "1",
            name: "Spec Furniture - AoT",
            contactName: "Long Nguyen",
            phone: "(416) 246-5540",
            email: "lnguyen@specfurniture.com",
            address1: "165 City View Drive",
            city: "Toronto",
            province: "ON",
            postalCode: "M9W8B1",
            country: "Canada",
            logoUrl: "https://cdn-icons-png.flaticon.com/512/2611/2611152.png",
            type: "Customer",
            status: "Active"
          },
          {
            id: "2",
            name: "Acme Corporation",
            contactName: "John Smith",
            phone: "(555) 123-4567",
            email: "john@acme.com",
            address1: "123 Business Ave",
            address2: "Suite 100",
            city: "New York",
            province: "NY",
            postalCode: "10001",
            country: "USA",
            logoUrl: "https://cdn-icons-png.flaticon.com/512/5968/5968204.png",
            type: "Customer",
            status: "Active"
          },
          {
            id: "3",
            name: "Tech Solutions Inc",
            contactName: "Sarah Johnson",
            phone: "(555) 987-6543",
            email: "sarah@techsolutions.com",
            address1: "456 Innovation Blvd",
            city: "San Francisco",
            province: "CA",
            postalCode: "94102",
            country: "USA",
            logoUrl: "https://cdn-icons-png.flaticon.com/512/2092/2092218.png",
            type: "Partner",
            status: "Active"
          }
        ];
        setCompanies(sampleCompanies);
      } else {
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      // Fallback to sample data
      setCompanies([
        {
          id: "1",
          name: "Spec Furniture - AoT",
          contactName: "Long Nguyen",
          phone: "(416) 246-5540",
          email: "lnguyen@specfurniture.com",
          address1: "165 City View Drive",
          city: "Toronto",
          province: "ON",
          postalCode: "M9W8B1",
          country: "Canada",
          logoUrl: "https://cdn-icons-png.flaticon.com/512/2611/2611152.png",
          type: "Customer",
          status: "Active"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      // In a real app, fetch from Firestore
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompany(company);
      }

      // Fetch related tickets
      const ticketsQuery = query(
        collection(db, "tickets"),
        where("company", "==", companyId),
        orderBy("createdAt", "desc")
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketData[];

      // Sample tickets if none found
      if (ticketsData.length === 0) {
        setCompanyTickets([
          {
            id: "#2492534",
            title: "Urgent: Could someone check why our new phone blocked?",
            status: "Closed",
            priority: "3 - Medium",
            createdAt: "2024-01-15",
            company: companyId
          },
          {
            id: "#2492535",
            title: "Network connectivity issues in main office",
            status: "Open",
            priority: "2 - High",
            createdAt: "2024-01-20",
            company: companyId
          }
        ]);
      } else {
        setCompanyTickets(ticketsData);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": return "bg-green-500/20 text-green-500";
      case "inactive": return "bg-gray-500/20 text-gray-400";
      case "prospect": return "bg-blue-500/20 text-blue-500";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority?.includes("1") || priority?.toLowerCase().includes("critical")) {
      return "bg-red-500/20 text-red-500";
    } else if (priority?.includes("2") || priority?.toLowerCase().includes("high")) {
      return "bg-orange-500/20 text-orange-500";
    } else if (priority?.includes("3") || priority?.toLowerCase().includes("medium")) {
      return "bg-yellow-500/20 text-yellow-500";
    }
    return "bg-blue-500/20 text-blue-500";
  };

  // Company Detail View
  if (selectedCompany && id) {
    const openTickets = companyTickets.filter(t => t.status === "Open" || t.status === "New" || t.status === "In Progress" || t.status === "Assigned").length;
    const closedTickets = companyTickets.filter(t => t.status === "Closed" || t.status === "Resolved").length;

    return (
      <div className="space-y-0">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-sn-dark via-slate-800 to-slate-900 text-white -m-8 mb-0 px-8 pt-6 pb-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/50 mb-4">
            <button onClick={() => navigate("/companies")} className="hover:text-white flex items-center gap-1 transition-colors">
              <Building2 className="w-3.5 h-3.5" /> Companies
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80">{selectedCompany.name}</span>
          </div>

          {/* Title Row */}
          <div className="flex items-center justify-between pb-5">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/companies")} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              {selectedCompany.logoUrl ? (
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg overflow-hidden">
                  <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sn-green/80 to-emerald-600 flex items-center justify-center text-sn-dark text-lg font-black shadow-lg">
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{selectedCompany.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/50">{selectedCompany.type || "Customer"}</span>
                  <span className="text-white/20">•</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", selectedCompany.status === "Active" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-400")}>
                    {selectedCompany.status || "Active"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/20 text-white hover:bg-white/10 bg-transparent text-xs"
                onClick={() => openEditDialog(selectedCompany)}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent text-xs"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete ${selectedCompany.name}?`)) {
                    await import("firebase/firestore").then(async ({ deleteDoc, doc }) => {
                      await deleteDoc(doc(db, "companies", selectedCompany.id));
                      navigate("/companies");
                    });
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6">
            {[
              { id: "details", label: "Details", icon: Building2 },
              { id: "tickets", label: "Tickets", icon: Ticket, count: companyTickets.length },
              { id: "history", label: "History", icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors",
                  activeTab === tab.id ? "border-sn-green text-white" : "border-transparent text-white/40 hover:text-white/70"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="bg-white/10 text-white/70 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="pt-6">
          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-5">
                {/* Company Info */}
                <div className="bg-white border border-border rounded-xl shadow-sm">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> Company Information
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: "Company Name", value: selectedCompany.name },
                      { label: "Contact Person", value: selectedCompany.contactName || "—" },
                      { label: "Phone", value: selectedCompany.phone || "—", icon: Phone },
                      { label: "Email", value: selectedCompany.email || "—", icon: Mail },
                      { label: "Website", value: selectedCompany.website || "—", icon: Globe },
                      { label: "Type", value: selectedCompany.type || "Customer" },
                    ].map(field => (
                      <div key={field.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{field.label}</p>
                        <div className="flex items-center gap-2">
                          {field.icon && <field.icon className="w-3.5 h-3.5 text-muted-foreground/60" />}
                          <p className="text-sm font-medium">{field.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address Info */}
                <div className="bg-white border border-border rounded-xl shadow-sm">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> Address Information
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: "Street Address", value: selectedCompany.address1 || "—" },
                      { label: "Address Line 2", value: selectedCompany.address2 || "—" },
                      { label: "City", value: selectedCompany.city || "—" },
                      { label: "Province / State", value: selectedCompany.province || "—" },
                      { label: "Postal Code", value: selectedCompany.postalCode || "—" },
                      { label: "Country", value: selectedCompany.country || "—" },
                    ].map(field => (
                      <div key={field.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{field.label}</p>
                        <p className="text-sm font-medium">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Stats Card */}
                <div className="bg-white border border-border rounded-xl shadow-sm p-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Ticket Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Tickets</span>
                      <span className="text-sm font-bold">{companyTickets.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Open</span>
                      <span className="text-sm font-bold text-orange-500">{openTickets}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Resolved</span>
                      <span className="text-sm font-bold text-emerald-600">{closedTickets}</span>
                    </div>
                    {/* Mini bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${companyTickets.length ? (closedTickets / companyTickets.length) * 100 : 0}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">
                      {companyTickets.length ? Math.round((closedTickets / companyTickets.length) * 100) : 0}% resolution rate
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-border rounded-xl shadow-sm p-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start bg-sn-green/10 text-sn-dark hover:bg-sn-green/20 border-0 shadow-none" 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/tickets?action=new&companyId=${selectedCompany.id}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create Ticket
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (selectedCompany.email) {
                          window.location.href = `mailto:${selectedCompany.email}`;
                        } else {
                          alert("No email address provided for this company.");
                        }
                      }}
                    >
                      <Mail className="w-4 h-4 mr-2" /> Send Email
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (selectedCompany.phone) {
                          window.location.href = `tel:${selectedCompany.phone}`;
                        } else {
                          alert("No phone number provided for this company.");
                        }
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" /> Call Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Related Tickets</h3>
              </div>
              {companyTickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets found for this company</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {companyTickets.map(ticket => (
                    <div key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/40 cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <Ticket className="w-4 h-4 text-muted-foreground/50" />
                        <div>
                          <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">{ticket.id} • {ticket.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", getPriorityColor(ticket.priority))}>{ticket.priority}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", ticket.status === "Open" || ticket.status === "New" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>{ticket.status}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Activity History</h3>
              </div>
              <div className="p-5">
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                  {[
                    { icon: Building2, title: "Company record created", time: selectedCompany.createdAt || "2024-01-15 10:30 AM", color: "bg-emerald-500" },
                    { icon: Edit, title: "Contact information updated", time: "2024-01-20 02:15 PM", color: "bg-blue-500" },
                  ].map((event, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className={cn("absolute -left-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm", event.color)} />
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // Companies List View
  const activeCount = companies.filter(c => c.status === "Active").length;
  const prospectCount = companies.filter(c => c.status === "Prospect").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage customer, partner, and vendor organizations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sn-green text-sn-dark font-bold hover:bg-sn-green/90 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto !bg-white !text-gray-900 border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">{isEditing ? "Edit Company" : "Create New Company"}</DialogTitle>
              <DialogDescription className="text-gray-500">
                {isEditing ? "Update company information." : "Fill in the details to add a new company."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name" className="text-gray-700">Company Name *</Label><Input id="name" value={newCompany.name} onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter company name" required className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
                <div className="space-y-2"><Label htmlFor="contactName" className="text-gray-700">Contact Name</Label><Input id="contactName" value={newCompany.contactName} onChange={(e) => setNewCompany(prev => ({ ...prev, contactName: e.target.value }))} placeholder="Primary contact" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="phone" className="text-gray-700">Phone</Label><Input id="phone" value={newCompany.phone} onChange={(e) => setNewCompany(prev => ({ ...prev, phone: e.target.value }))} placeholder="(555) 123-4567" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
                <div className="space-y-2"><Label htmlFor="email" className="text-gray-700">Email</Label><Input id="email" type="email" value={newCompany.email} onChange={(e) => setNewCompany(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@company.com" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="website" className="text-gray-700">Website</Label><Input id="website" value={newCompany.website} onChange={(e) => setNewCompany(prev => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
                <div className="space-y-2">
                  <Label htmlFor="logo" className="text-gray-700">Company Logo (PNG/JPEG)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="logo" 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewCompany(prev => ({ ...prev, logoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="bg-white border-gray-300 text-gray-900 text-xs h-9 px-2 pt-1.5"
                    />
                    {newCompany.logoUrl && (
                      <div className="w-9 h-9 rounded border border-gray-200 flex items-center justify-center shrink-0 bg-gray-50 overflow-hidden">
                        <img src={newCompany.logoUrl} className="w-full h-full object-contain" alt="Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="address1" className="text-gray-700">Address</Label><Input id="address1" value={newCompany.address1} onChange={(e) => setNewCompany(prev => ({ ...prev, address1: e.target.value }))} placeholder="Street address" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="city" className="text-gray-700">City</Label><Input id="city" value={newCompany.city} onChange={(e) => setNewCompany(prev => ({ ...prev, city: e.target.value }))} placeholder="City" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
                <div className="space-y-2"><Label htmlFor="province" className="text-gray-700">Province/State</Label><Input id="province" value={newCompany.province} onChange={(e) => setNewCompany(prev => ({ ...prev, province: e.target.value }))} placeholder="ON / NY" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="postalCode" className="text-gray-700">Postal Code</Label><Input id="postalCode" value={newCompany.postalCode} onChange={(e) => setNewCompany(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="M9W8B1" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
                <div className="space-y-2"><Label htmlFor="country" className="text-gray-700">Country</Label><Input id="country" value={newCompany.country} onChange={(e) => setNewCompany(prev => ({ ...prev, country: e.target.value }))} placeholder="Canada" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="type" className="text-gray-700">Type</Label><select id="type" value={newCompany.type} onChange={(e) => setNewCompany(prev => ({ ...prev, type: e.target.value }))} className="w-full h-10 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-sn-green"><option value="Customer">Customer</option><option value="Partner">Partner</option><option value="Vendor">Vendor</option><option value="Prospect">Prospect</option></select></div>
                <div className="space-y-2"><Label htmlFor="status" className="text-gray-700">Status</Label><select id="status" value={newCompany.status} onChange={(e) => setNewCompany(prev => ({ ...prev, status: e.target.value }))} className="w-full h-10 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-sn-green"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Prospect">Prospect</option></select></div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !newCompany.name?.trim()}>
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                  ) : isEditing ? "Save Changes" : "Create Company"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: companies.length, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
          { label: "Active", value: activeCount, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Prospects", value: prospectCount, color: "text-sky-600", bg: "bg-sky-50 border-sky-100" },
          { label: "Inactive", value: companies.length - activeCount - prospectCount, color: "text-gray-500", bg: "bg-gray-50 border-gray-100" },
        ].map(stat => (
          <div key={stat.label} className={cn("rounded-xl border p-4", stat.bg)}>
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, contact, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{filteredCompanies.length} of {companies.length}</span>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-sn-green border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} onClick={() => navigate(`/companies/${company.id}`)} className="border-b border-border/50 hover:bg-blue-50/40 cursor-pointer transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {company.logoUrl ? (
                        <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sn-dark to-slate-700 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{company.name}</p>
                        {company.email && <p className="text-xs text-muted-foreground">{company.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{company.contactName || "â€”"}</p>
                    {company.phone && <p className="text-xs text-muted-foreground">{company.phone}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground">{[company.city, company.province].filter(Boolean).join(", ") || "â€”"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{company.type || "Customer"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", getStatusColor(company.status || "Active"))}>{company.status || "Active"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" className="h-7 w-7 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openEditDialog(company); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-red-600 border-red-200 hover:bg-red-50" onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${company.name}?`)) {
                           const { deleteDoc, doc } = await import("firebase/firestore");
                           await deleteDoc(doc(db, "companies", company.id));
                           setCompanies(prev => prev.filter(c => c.id !== company.id));
                        }
                      }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
          {filteredCompanies.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-sm">No companies found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or create a new company</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Companies;
