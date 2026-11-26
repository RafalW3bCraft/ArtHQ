import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
function inlineCredential(value: string) {
  try {
    return cert(
      JSON.parse(
        value.startsWith("{")
          ? value
          : Buffer.from(value, "base64").toString("utf8"),
      ),
    );
  } catch {
    throw new Error(
      "Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Use JSON or base64 JSON; for a service-account file path, set GOOGLE_APPLICATION_CREDENTIALS and leave FIREBASE_SERVICE_ACCOUNT_KEY empty.",
    );
  }
}
const options = key
  ? {
      projectId,
      credential: inlineCredential(key),
    }
  : { projectId };
const app = getApps()[0] || initializeApp(options);
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
