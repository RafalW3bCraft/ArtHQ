const {
  VITE_FIREBASE_API_KEY: apiKey,
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_APP_ID: appId,
} = import.meta.env;
export const emulatorMode =
  import.meta.env.VITE_USE_EMULATORS === "true" &&
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  projectId?.startsWith("demo-");
export const backendConfigured = Boolean(
  apiKey &&
  projectId &&
  appId &&
  (!projectId.startsWith("demo-") || emulatorMode),
);
export const firebaseConfig = {
  apiKey,
  projectId,
  appId,
  authDomain: projectId + ".firebaseapp.com",
};
export const serviceUnavailable =
  "The client service is currently unavailable. Please check back soon.";
