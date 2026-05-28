import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";

export type SubscriptionStatus = "active" | "authenticated" | "cancelled" | "expired" | "pending";

export interface UserSubscription {
  userId: string;
  plan: "Core" | "Go" | "Plus" | "Pro";
  subscriptionId?: string;
  status: SubscriptionStatus;
  updatedAt: Date;
}

export async function getUserPlan(userId: string): Promise<UserSubscription> {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection: Collection<UserSubscription> = db.collection("users");

    const user = await collection.findOne({ userId });
    
    if (!user) {
      return {
        userId,
        plan: "Pro",
        status: "active",
        updatedAt: new Date(),
      };
    }

    return user;
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return {
      userId,
      plan: "Pro",
      status: "active",
      updatedAt: new Date(),
    };
  }
}

export async function updateUserSubscription(
  userId: string, 
  plan: "Core" | "Go" | "Plus" | "Pro", 
  status: SubscriptionStatus,
  subscriptionId?: string
) {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection: Collection<UserSubscription> = db.collection("users");

    await collection.updateOne(
      { userId },
      { 
        $set: { 
          plan, 
          status, 
          subscriptionId, 
          updatedAt: new Date() 
        },
        $setOnInsert: { userId }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error updating user subscription:", error);
    throw error;
  }
}
