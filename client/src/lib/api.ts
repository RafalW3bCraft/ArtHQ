import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  briefSchema,
  contactFormSchema,
  ticketSchema,
  type ContactForm,
  type Project,
  type SupportMessage,
} from "@shared/schema";
import { db } from "./firebase";

export type CollectionName =
  "projects" | "support_messages" | "contact_submissions" | "users";
export function subscribeRecords<T>(
  name: CollectionName,
  userId: string | undefined,
  receive: (rows: T[]) => void,
  fail: (error: Error) => void,
) {
  const constraints = userId ? [where("userId", "==", userId)] : [];
  const source = query(
    collection(db, name),
    ...constraints,
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    source,
    (snapshot) =>
      receive(
        snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as T),
      ),
    fail,
  );
}
function requireNetwork() {
  if (!navigator.onLine)
    throw new Error("You are offline. Reconnect and try again.");
}

export const projectsApi = {
  async create(userId: string, input: unknown) {
    requireNetwork();
    const now = Date.now();
    await addDoc(collection(db, "projects"), {
      ...briefSchema.parse(input),
      userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
  async updateStatus(id: string, status: Project["status"]) {
    requireNetwork();
    await updateDoc(doc(db, "projects", id), { status, updatedAt: Date.now() });
  },
};
export const supportApi = {
  async create(userId: string, input: unknown) {
    requireNetwork();
    const now = Date.now();
    await addDoc(collection(db, "support_messages"), {
      ...ticketSchema.parse(input),
      userId,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
  async updateStatus(id: string, status: SupportMessage["status"]) {
    requireNetwork();
    await updateDoc(doc(db, "support_messages", id), {
      status,
      updatedAt: Date.now(),
    });
  },
};
export const contactApi = {
  async submit(data: ContactForm) {
    requireNetwork();
    await addDoc(collection(db, "contact_submissions"), {
      ...contactFormSchema.parse(data),
      status: "new",
      createdAt: Date.now(),
    });
  },
  async updateStatus(id: string, status: "read" | "responded") {
    requireNetwork();
    await updateDoc(
      doc(db, "contact_submissions", id),
      status === "responded" ? { status, respondedAt: Date.now() } : { status },
    );
  },
};
