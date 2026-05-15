import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface BrandingSettings {
  companyName: string;
  logoBase64: string | null;
  logoType: string | null;
}

interface BrandingContextType {
  branding: BrandingSettings;
  updateCompanyName: (name: string) => Promise<void>;
  updateLogo: (base64: string | null, type: string | null) => Promise<void>;
  loading: boolean;
}

const defaultBranding: BrandingSettings = {
  companyName: "Connect",
  logoBase64: null,
  logoType: null,
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load branding settings from Firestore
    const brandingRef = doc(db, "settings", "branding");
    
    const unsubscribe = onSnapshot(brandingRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setBranding({
          companyName: data.companyName || defaultBranding.companyName,
          logoBase64: data.logoBase64 || null,
          logoType: data.logoType || null,
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading branding settings:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateCompanyName = async (name: string) => {
    const brandingRef = doc(db, "settings", "branding");
    await setDoc(brandingRef, { companyName: name }, { merge: true });
  };

  const updateLogo = async (base64: string | null, type: string | null) => {
    const brandingRef = doc(db, "settings", "branding");
    await setDoc(brandingRef, { logoBase64: base64, logoType: type }, { merge: true });
  };

  return (
    <BrandingContext.Provider value={{ branding, updateCompanyName, updateLogo, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
