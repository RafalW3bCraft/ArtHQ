import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
} from "firebase/auth";
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const auth =
  config.apiKey && config.projectId && config.appId
    ? getAuth(initializeApp(config))
    : null;
export const googleProvider = new GoogleAuthProvider();
if (auth && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true")
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
