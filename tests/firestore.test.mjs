import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

let env;
const now = Date.now();
const account = (uid) =>
  env.authenticatedContext(uid, { email: uid + "@example.test" }).firestore();
const ref = (db, path) => doc(db, path);
const profile = (uid) => ({
  uid,
  role: "user",
  email: uid + "@example.test",
  companyName: "Client Studio",
  phoneNumber: "12345",
  createdAt: now,
});
const brief = (uid) => ({
  userId: uid,
  projectName: "New portfolio",
  description: "A project brief for a portfolio.",
  serviceType: "website",
  status: "pending",
  createdAt: now,
  updatedAt: now,
});
const ticket = (uid) => ({
  userId: uid,
  subject: "Delivery date",
  message: "Please confirm the target delivery date.",
  status: "open",
  createdAt: now,
  updatedAt: now,
});
const enquiry = {
  name: "New client",
  email: "client@example.test",
  message: "Please tell me about your services.",
  status: "new",
  createdAt: now,
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-arthq",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(ref(context.firestore(), "users/staff"), {
      ...profile("staff"),
      role: "admin",
    });
  });
});
after(async () => {
  if (env) await env.cleanup();
});

test("profile registration preserves identity and trusted staff assignment", async () => {
  const db = account("alice");
  await assertFails(
    setDoc(ref(db, "users/alice"), { ...profile("alice"), role: "admin" }),
  );
  await assertFails(setDoc(ref(db, "users/bob"), profile("bob")));
  await assertSucceeds(setDoc(ref(db, "users/alice"), profile("alice")));
  await assertFails(updateDoc(ref(db, "users/alice"), { role: "admin" }));
  await assertFails(getDoc(ref(account("bob"), "users/alice")));
  await assertSucceeds(getDoc(ref(account("staff"), "users/alice")));
});
test("project visibility, owner filtering and status transitions", async () => {
  const alice = account("alice"),
    bob = account("bob"),
    staff = account("staff");
  await assertSucceeds(setDoc(ref(alice, "projects/brief"), brief("alice")));
  await assertFails(
    setDoc(ref(alice, "projects/invalid"), {
      ...brief("alice"),
      description: "short",
    }),
  );
  await assertFails(setDoc(ref(bob, "projects/foreign"), brief("alice")));
  await assertFails(
    setDoc(ref(bob, "projects/preapproved"), {
      ...brief("bob"),
      status: "completed",
    }),
  );
  await assertFails(getDoc(ref(bob, "projects/brief")));
  await assertFails(getDocs(collection(alice, "projects")));
  await assertSucceeds(
    getDocs(
      query(
        collection(alice, "projects"),
        where("userId", "==", "alice"),
        orderBy("createdAt", "desc"),
      ),
    ),
  );
  await assertFails(
    updateDoc(ref(alice, "projects/brief"), { status: "in-progress" }),
  );
  await assertFails(
    updateDoc(ref(staff, "projects/brief"), { status: "completed" }),
  );
  await assertSucceeds(
    updateDoc(ref(staff, "projects/brief"), {
      status: "in-progress",
      updatedAt: Date.now(),
    }),
  );
  await assertFails(
    updateDoc(ref(staff, "projects/brief"), {
      status: "completed",
      userId: "bob",
    }),
  );
  await assertSucceeds(
    updateDoc(ref(staff, "projects/brief"), {
      status: "completed",
      updatedAt: Date.now(),
    }),
  );
  assert.equal(
    (await getDoc(ref(alice, "projects/brief"))).data().status,
    "completed",
  );
});
test("standalone tickets are private and staff manage their lifecycle", async () => {
  const alice = account("alice"),
    bob = account("bob"),
    staff = account("staff");
  await assertSucceeds(
    setDoc(ref(alice, "support_messages/ticket"), ticket("alice")),
  );
  await assertFails(getDoc(ref(bob, "support_messages/ticket")));
  await assertFails(
    updateDoc(ref(alice, "support_messages/ticket"), { status: "resolved" }),
  );
  await assertFails(setDoc(ref(bob, "support_messages/two"), ticket("alice")));
  await assertSucceeds(
    updateDoc(ref(staff, "support_messages/ticket"), {
      status: "in-progress",
      updatedAt: Date.now(),
    }),
  );
  await assertSucceeds(
    updateDoc(ref(staff, "support_messages/ticket"), {
      status: "resolved",
      updatedAt: Date.now(),
    }),
  );
  assert.equal(
    (await getDoc(ref(alice, "support_messages/ticket"))).data().status,
    "resolved",
  );
});
test("public enquiries validate input and expose records only to staff", async () => {
  const visitor = env.unauthenticatedContext().firestore(),
    staff = account("staff");
  await assertFails(setDoc(ref(visitor, "projects/brief"), brief("alice")));
  await assertFails(
    setDoc(ref(visitor, "contact_submissions/invalid"), {
      ...enquiry,
      email: "invalid",
    }),
  );
  await assertSucceeds(
    setDoc(ref(visitor, "contact_submissions/message"), enquiry),
  );
  await assertFails(getDoc(ref(visitor, "contact_submissions/message")));
  await assertFails(
    getDoc(ref(account("alice"), "contact_submissions/message")),
  );
  await assertSucceeds(
    updateDoc(ref(staff, "contact_submissions/message"), { status: "read" }),
  );
  await assertSucceeds(
    updateDoc(ref(staff, "contact_submissions/message"), {
      status: "responded",
      respondedAt: Date.now(),
    }),
  );
});
