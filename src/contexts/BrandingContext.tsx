import React, { createContext, useContext, useState, useEffect } from "react";
import { firebaseAvailable, db } from "../lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

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
  const [loading, setLoading] = useState(firebaseAvailable); // only loading if Firebase is available

  useEffect(() => {
    if (!firebaseAvailable) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    try {
      const brandingRef = doc(db, "settings", "branding");
      unsubscribe = onSnapshot(
        brandingRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setBranding({
              companyName: data.companyName || defaultBranding.companyName,
              logoBase64: data.logoBase64 || null,
              logoType: data.logoType || null,
            });
          }
          setLoading(false);
        },
        (error) => {
          console.warn("[BrandingContext] Firestore error (non-fatal):", error.message);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn("[BrandingContext] Failed to subscribe to branding:", e);
      setLoading(false);
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const updateCompanyName = async (name: string) => {
    if (!firebaseAvailable) return;
    try {
      const brandingRef = doc(db, "settings", "branding");
      await setDoc(brandingRef, { companyName: name }, { merge: true });
    } catch (e) {
      console.warn("[BrandingContext] updateCompanyName failed:", e);
    }
  };

  const updateLogo = async (base64: string | null, type: string | null) => {
    if (!firebaseAvailable) return;
    try {
      const brandingRef = doc(db, "settings", "branding");
      await setDoc(brandingRef, { logoBase64: base64, logoType: type }, { merge: true });
    } catch (e) {
      console.warn("[BrandingContext] updateLogo failed:", e);
    }
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
