import "dotenv/config";
import { adminAuth } from "../server/firebase-admin";
const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npm run admin:set -- FIREBASE_USER_UID");
  process.exit(1);
}
const user = await adminAuth.getUser(uid);
await adminAuth.setCustomUserClaims(uid, {
  ...user.customClaims,
  admin: true,
  role: "admin",
});
console.log(
  "Administrator claim set. Sign out and sign back in to refresh permissions.",
);
