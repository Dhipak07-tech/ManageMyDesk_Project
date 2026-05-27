import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { initializeFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const hasFirebaseProjectConfig = Boolean(
  (firebaseConfig as any).projectId && (firebaseConfig as any).authDomain
);

// Safe stubs so the rest of the codebase can import without crashing
let app: FirebaseApp;
let _auth: Auth;
let _db: Firestore;
let runtimeFirebaseAvailable = false;

try {
  if (!hasFirebaseProjectConfig) {
    throw new Error("Firebase project config is missing.");
  }

  app = initializeApp(firebaseConfig);
  _auth = getAuth(app);
  _db = initializeFirestore(app, {}, (firebaseConfig as any).firestoreDatabaseId);
  runtimeFirebaseAvailable = true;

  // Proactive connection test (non-blocking, errors are normal)
  (async () => {
    try {
      await getDocFromServer(doc(_db, "test", "connection"));
    } catch (error: any) {
      if (error?.message?.includes("the client is offline")) {
        console.warn("[Firebase] Firestore offline.");
      } else {
        console.log("[Firebase] Firestore connection test complete.");
      }
    }
  })();
} catch (err: any) {
  console.warn("[Firebase] Initialization skipped:", err.message);
  // Create minimal stubs so non-Firebase flows can still render
  app = {} as FirebaseApp;
  _auth = { currentUser: null, onAuthStateChanged: () => () => {} } as unknown as Auth;
  _db = {} as Firestore;
}

export const firebaseAvailable = runtimeFirebaseAvailable;
export const auth = _auth;
export const db = _db;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!firebaseAvailable) return;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };

  console.error("Firestore Error Details:", JSON.stringify(errInfo));
  // We log instead of throwing to prevent crashing the UI during review sessions
}
