import { readFileSync } from "node:fs";

const local = new Map();
try {
  const contents = readFileSync(".env.local", "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith("#")) {
      local.set(match[1], match[2].replace(/^(['"])(.*)\1$/, "$2"));
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const settings = Object.fromEntries(
  required.map((name) => [name, process.env[name] || local.get(name)]),
);
const missing = required.filter((name) => !settings[name]?.trim());
if (missing.length) {
  throw new Error(`Missing Firebase web app build settings: ${missing.join(", ")}`);
}

if (settings.VITE_FIREBASE_PROJECT_ID !== "arthq-tech") {
  throw new Error("Production deploys must use the ArtHQ Firebase project ID: arthq-tech");
}
