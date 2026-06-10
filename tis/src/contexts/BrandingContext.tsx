import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface BrandingSettings {
  companyName: string;
  logoBase64:  string | null;
  logoType:    string | null;
}

interface BrandingContextType {
  branding:          BrandingSettings;
  updateCompanyName: (name: string)                        => Promise<void>;
  updateLogo:        (base64: string | null, type: string | null) => Promise<void>;
  loading:           boolean;
}

const DEFAULT: BrandingSettings = {
  companyName: "Connect",
  logoBase64:  null,
  logoType:    null,
};

const LS_KEY = "ticklora_branding";

function loadFromLocalStorage(): BrandingSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT;
}

function saveToLocalStorage(b: BrandingSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  // Initialise from localStorage so sidebar renders immediately with correct name/logo
  const [branding, setBranding] = useState<BrandingSettings>(loadFromLocalStorage);
  const [loading,  setLoading]  = useState(true);

  // Fetch from MySQL API on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/branding");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (!cancelled) {
          const updated: BrandingSettings = {
            companyName: data.companyName || DEFAULT.companyName,
            logoBase64:  data.logoBase64  || null,
            logoType:    data.logoType    || null,
          };
          setBranding(updated);
          saveToLocalStorage(updated);
        }
      } catch (err) {
        console.warn("[Branding] Could not load from API, using cached/default:", err);
        // Keep whatever was loaded from localStorage
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateCompanyName = useCallback(async (name: string) => {
    const updated = { ...branding, companyName: name };
    setBranding(updated);
    saveToLocalStorage(updated);
    const res = await fetch("/api/branding", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ companyName: name }),
    });
    if (!res.ok) throw new Error("Failed to save company name");
  }, [branding]);

  const updateLogo = useCallback(async (base64: string | null, type: string | null) => {
    const updated = { ...branding, logoBase64: base64, logoType: type };
    setBranding(updated);
    saveToLocalStorage(updated);
    const res = await fetch("/api/branding", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ logoBase64: base64, logoType: type }),
    });
    if (!res.ok) throw new Error("Failed to save logo");
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, updateCompanyName, updateLogo, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within a BrandingProvider");
  return ctx;
}
