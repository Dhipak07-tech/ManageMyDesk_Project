import React, { useState } from "react";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useNavigate } from "react-router-dom";
import { ROLE_LABELS, type Role } from "../lib/roles";
import { Crown, Shield, UserCog, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// Local Button component
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-sn-green text-sn-dark hover:bg-sn-green/90 shadow-md",
      outline: "border-2 border-border bg-transparent hover:bg-muted/50 text-foreground",
      ghost: "bg-transparent hover:bg-muted/50 text-muted-foreground"
    };
    return (
      <button
        ref={ref}
        className={cn(
          "px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Same hash function as Register
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

const DEMO_ROLES: { role: Role; label: string; description: string; icon: any; color: string }[] = [
  { role: "user",              label: "User",              description: "End user — raise & track tickets",        icon: UserCog, color: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200" },
  { role: "agent",             label: "Agent",             description: "Support agent — manage incidents",         icon: UserCog, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { role: "sub_admin",         label: "Sub Admin",         description: "Read-only company-wide visibility",        icon: Eye,     color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { role: "admin",             label: "Admin",             description: "Manage users, SLA & approvals",            icon: Shield,  color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { role: "super_admin",       label: "Super Admin",       description: "Manage dropdowns & system config",         icon: Crown,   color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { role: "ultra_super_admin", label: "Ultra Super Admin", description: "Full control — grant/remove all access",   icon: Crown,   color: "bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-800 border-orange-300 hover:from-yellow-100 hover:to-orange-100" },
];

export function Login() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  const navigate = useNavigate();

  /* ── Demo login ─────────────────────────────────────────── */
  const handleDemoLogin = async (role: Role) => {
    setError("");
    setDemoLoading(role);
    try {
      const uid       = `demo_${role}_${Date.now()}`;
      const name      = ROLE_LABELS[role];
      const emailAddr = `demo-${role}@connectit.local`;
      const demoProfile = { uid, name, email: emailAddr, role, isDemo: true };

      localStorage.setItem("demo_user", JSON.stringify(demoProfile));

      try {
        await setDoc(doc(db, "users", uid), { ...demoProfile, createdAt: serverTimestamp() });
      } catch (_) { /* offline — localStorage session still works */ }

      window.location.href = "/";
    } catch (err: any) {
      setError("Demo login failed: " + err.message);
      setDemoLoading(null);
    }
  };

  /* ── Email/password login (Firestore-based) ────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter email and password."); return; }
    setError("");
    setIsLoading(true);
    try {
      // Look up user by email in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("No account found with this email. Please register first.");
        setIsLoading(false);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Check password hash
      if (userData.passwordHash && userData.passwordHash !== simpleHash(password)) {
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      // Check if account is disabled
      if (userData.disabled) {
        setError("This account has been disabled. Please contact an administrator.");
        setIsLoading(false);
        return;
      }

      // Login successful — save to localStorage
      localStorage.setItem("demo_user", JSON.stringify({
        uid: userData.uid || userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role || "user",
        phone: userData.phone || ""
      }));

      window.location.href = "/";
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed: " + (err.message || "Please try again."));
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sn-dark p-4">
      <div className="w-full max-w-4xl flex gap-6 items-start">

        {/* ── Login Form ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-sn-sidebar p-8 text-white text-center">
            <div className="w-16 h-16 bg-sn-green rounded-xl flex items-center justify-center font-bold text-3xl text-sn-dark mx-auto mb-4 shadow-lg">C</div>
            <h1 className="text-2xl font-bold">Connect IT</h1>
            <p className="text-white/60 text-sm mt-2">Sign in to your service portal</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">{error}</div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-sn-green outline-none"
                placeholder="name@company.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-sn-green outline-none"
                placeholder="••••••••" />
            </div>

            <Button type="submit" disabled={isLoading}
              className="w-full py-6 bg-sn-green text-sn-dark font-bold text-base hover:bg-sn-green/90 disabled:opacity-50">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account? <Link to="/register" className="text-sn-green font-bold hover:underline">Register</Link>
            </p>
          </form>
        </div>

        {/* ── Role Panel ── */}
        <div className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-sn-dark to-gray-800 p-6 text-white text-center">
            <div className="text-2xl mb-1">🚀</div>
            <h2 className="font-bold text-lg">Quick Login</h2>
            <p className="text-white/60 text-xs mt-1">No password needed — instant access</p>
          </div>

          <div className="p-4 space-y-2.5">
            {DEMO_ROLES.map(({ role, label, description, icon: Icon, color }) => (
              <button key={role} onClick={() => handleDemoLogin(role)}
                disabled={demoLoading !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${color}`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-sm leading-tight">
                    {demoLoading === role ? "Logging in..." : label}
                  </div>
                  <div className="text-[10px] opacity-70 leading-tight mt-0.5 truncate">{description}</div>
                </div>
                {demoLoading === role && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
              </button>
            ))}

            <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-border">
              Quick sessions use localStorage auth.<br />All data is shared via Firestore.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
