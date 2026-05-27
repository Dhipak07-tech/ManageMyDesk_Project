import React, { createContext, useContext, useEffect, useState } from "react";
import { ROLE_HIERARCHY, ROLE_LABELS, Role } from "../lib/roles";
import { firebaseAvailable, auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

// Import Firebase functions — they are no-ops when firebaseAvailable is false
// because firebase.ts exports safe stubs in that case.
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  demoLogin: (role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  demoLogin: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state to localStorage so standalone pages (timesheet) can read it
  useEffect(() => {
    if (user && profile) {
      localStorage.setItem('timesheet_user', JSON.stringify({
        uid: user.uid,
        name: profile.name || user.displayName || user.email?.split("@")[0] || "User",
        email: user.email,
        role: profile.role || 'user'
      }));
    } else if (!user) {
      localStorage.removeItem('timesheet_user');
    }
  }, [user, profile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let settled = false;

    const resolveLoading = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    // Safety timeout: if loading hasn't resolved in 8s, force it to false
    // This prevents the blank white screen from hanging indefinitely.
    const safetyTimeout = setTimeout(() => {
      console.warn("[AuthContext] Safety timeout — forcing loading=false");
      resolveLoading();
    }, 8000);

    // --- Path 1: Existing localStorage session ---
    const sessionStr = localStorage.getItem('demo_user');
    if (sessionStr) {
      try {
        const sessionUser = JSON.parse(sessionStr);
        setUser({
          uid: sessionUser.uid,
          email: sessionUser.email,
          displayName: sessionUser.name,
        });
        setProfile(sessionUser);
        resolveLoading();

        // Subscribe to real-time Firestore updates if Firebase is available
        if (firebaseAvailable) {
          try {
            const docRef = doc(db, "users", sessionUser.uid);
            unsubscribeProfile = onSnapshot(
              docRef,
              (docSnap) => {
                if (docSnap.exists()) {
                  const freshData = docSnap.data();
                  const localRole = (sessionUser.role || "user") as Role;
                  const freshRole = (freshData.role || "user") as Role;
                  const finalRole =
                    ROLE_HIERARCHY[freshRole] >= ROLE_HIERARCHY[localRole]
                      ? freshRole
                      : localRole;
                  setProfile({ ...sessionUser, ...freshData, role: finalRole });
                  localStorage.setItem('demo_user', JSON.stringify({
                    uid: freshData.uid || sessionUser.uid,
                    name: freshData.name || sessionUser.name,
                    email: freshData.email || sessionUser.email,
                    role: finalRole,
                    phone: freshData.phone || "",
                  }));
                }
              },
              () => {
                // Firestore listen failed — keep using cached session data silently
              }
            );
          } catch {
            // Firestore not available — silently continue with localStorage data
          }
        }

        return () => {
          clearTimeout(safetyTimeout);
          if (unsubscribeProfile) unsubscribeProfile();
        };
      } catch {
        localStorage.removeItem('demo_user');
      }
    }

    // --- Path 2: Firebase not configured — resolve immediately, redirect to login ---
    if (!firebaseAvailable) {
      resolveLoading();
      return () => { clearTimeout(safetyTimeout); };
    }

    // --- Path 3: Firebase auth state listener ---
    try {
      unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        // Don't overwrite demo user state from localStorage
        const demoSession = localStorage.getItem('demo_user');
        if (!firebaseUser && demoSession) {
          resolveLoading();
          return;
        }

        setUser(firebaseUser);

        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (firebaseUser) {
          try {
            const docRef = doc(db, "users", firebaseUser.uid);
            unsubscribeProfile = onSnapshot(
              docRef,
              async (docSnap) => {
                if (docSnap.exists()) {
                  setProfile(docSnap.data());
                } else {
                  const initialProfile = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
                    email: firebaseUser.email,
                    role: "user",
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                  };
                  try {
                    await setDoc(docRef, initialProfile);
                  } catch (err) {
                    handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
                  }
                  setProfile(initialProfile);
                }
                resolveLoading();
              },
              (err) => {
                handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
                resolveLoading();
              }
            );
          } catch {
            resolveLoading();
          }
        } else {
          setProfile(null);
          resolveLoading();
        }
      });
    } catch (e) {
      console.warn("[AuthContext] onAuthStateChanged failed:", e);
      resolveLoading();
    }

    return () => {
      clearTimeout(safetyTimeout);
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const demoLogin = async (role: Role) => {
    if (firebaseAvailable) {
      try {
        const { signInAnonymously } = await import("firebase/auth");
        const { doc: fbDoc, setDoc: fbSetDoc, serverTimestamp: fbST } = await import("firebase/firestore");
        const result = await signInAnonymously(auth);
        const fbUser = result.user;
        const docRef = fbDoc(db, "users", fbUser.uid);
        await fbSetDoc(docRef, {
          uid: fbUser.uid,
          name: ROLE_LABELS[role],
          email: `demo-${role}@connectit.local`,
          role: role,
          createdAt: fbST(),
        });
        localStorage.setItem('demo_user', JSON.stringify({
          uid: fbUser.uid,
          name: ROLE_LABELS[role],
          email: `demo-${role}@connectit.local`,
          role: role,
        }));
        return;
      } catch (err: any) {
        console.warn("Firebase auth failed, using local demo mode:", err);
      }
    }

    // Local fallback
    const mockUid = 'demo_' + role + '_' + Date.now();
    const mockUser = {
      uid: mockUid,
      name: ROLE_LABELS[role],
      email: `demo-${role}@connectit.local`,
      role: role,
      isDemo: true,
    };
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    setUser({ uid: mockUid, email: mockUser.email, displayName: mockUser.name });
    setProfile(mockUser);
  };

  const signOut = async () => {
    try {
      if (firebaseAvailable) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Ignore
    }
    localStorage.removeItem('demo_user');
    localStorage.removeItem('timesheet_user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, demoLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
