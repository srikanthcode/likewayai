// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — PAYMENT REFERENCE STORE
// Maps Razorpay order/subscription IDs to the authenticated user and the
// plan they intended to buy, so webhooks and confirmations can be resolved
// server-side instead of trusting anything from the client.
// ══════════════════════════════════════════════════════════════════════

import clientPromise from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";
const COLLECTION = "payment_refs";

export type PaymentRefType = "order" | "subscription";

export interface PaymentRef {
  id: string;              // Razorpay order_id / subscription_id
  type: PaymentRefType;
  userId: string;
  planId: string;          // Core | Go | Plus | Pro
  amount?: number;         // paise, for one-time orders
  status?: string;         // created | paid | active | cancelled | expired
  createdAt: Date;
  updatedAt?: Date;
}

let indexEnsured = false;
async function getCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<PaymentRef>(COLLECTION);
  if (!indexEnsured) {
    try {
      await collection.createIndex({ id: 1 }, { unique: true, name: "payment_refs_id" });
      await collection.createIndex({ userId: 1, createdAt: -1 }, { name: "payment_refs_user" });
    } catch {
      // non-fatal
    }
    indexEnsured = true;
  }
  return collection;
}

export async function recordPaymentRef(ref: Omit<PaymentRef, "createdAt" | "updatedAt">): Promise<void> {
  try {
    const collection = await getCollection();
    await collection.updateOne(
      { id: ref.id },
      { $set: { ...ref, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error("[PaymentsStore] Failed to record payment ref:", err);
  }
}

export async function getPaymentRef(id: string): Promise<PaymentRef | null> {
  try {
    const collection = await getCollection();
    return (await collection.findOne({ id })) as PaymentRef | null;
  } catch {
    return null;
  }
}

export async function markPaymentRefStatus(id: string, status: string): Promise<void> {
  try {
    const collection = await getCollection();
    await collection.updateOne({ id }, { $set: { status, updatedAt: new Date() } });
  } catch {
    // non-fatal
  }
}