import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";
import { isVipUser } from "./auth";

const DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

export type SubscriptionStatus = "active" | "authenticated" | "cancelled" | "expired" | "pending";

export interface UserSubscription {
  userId: string;
  plan: "Core" | "Go" | "Plus" | "Pro";
  subscriptionId?: string;
  status: SubscriptionStatus;
  updatedAt: Date;
}

// Helper to cast string safely to ObjectId
function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function getUserPlan(userId: string): Promise<UserSubscription> {
  // VIP / Owner unlock: full Pro provisions (check by ID)
  if (isVipUser(userId)) {
    return {
      userId,
      plan: "Pro",
      subscriptionId: "vip_unlimited_pro",
      status: "active",
      updatedAt: new Date(),
    };
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection("users");

    const oid = toObjectId(userId);
    if (!oid) {
      return {
        userId,
        plan: "Core",
        status: "pending",
        updatedAt: new Date(),
      };
    }

    const user = await collection.findOne({ _id: oid as any });
    
    if (!user) {
      return {
        userId,
        plan: "Core",
        status: "pending",
        updatedAt: new Date(),
      };
    }

    // VIP check by email too (covers mismatched MongoDB _id)
    if (isVipUser(user._id?.toString(), user.email)) {
      return {
        userId,
        plan: "Pro",
        subscriptionId: "vip_unlimited_pro",
        status: "active",
        updatedAt: new Date(),
      };
    }

    // Map DB user fields to the UserSubscription schema
    // In plans.ts the values are lowercase equivalents or capitalizations. We normalize here.
    let planName = user.plan || "Core";
    // Capitalize first letter to match client expectation (e.g. core -> Core, free -> Core)
    if (planName === "free") planName = "Core";
    else if (planName === "core") planName = "Core";
    else if (planName === "go") planName = "Go";
    else if (planName === "plus") planName = "Plus";
    else if (planName === "pro") planName = "Pro";

    return {
      userId,
      plan: planName as any,
      subscriptionId: user.subscriptionId || "",
      status: user.subscriptionStatus || "active",
      updatedAt: user.updatedAt || user.createdAt || new Date(),
    };
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return {
      userId,
      plan: "Core",
      status: "pending",
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
    const db = client.db(DB_NAME);
    const collection = db.collection("users");

    const oid = toObjectId(userId);
    if (!oid) {
      throw new Error(`Invalid User ID: ${userId}`);
    }

    // Map plan to lowercase values stored in database
    let dbPlan: string = plan.toLowerCase();
    if (dbPlan === "core") dbPlan = "free"; // Core is the free tier in db

    const result = await collection.updateOne(
      { _id: oid as any },
      { 
        $set: { 
          plan: dbPlan, 
          subscriptionStatus: status, 
          subscriptionId, 
          updatedAt: new Date() 
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`User not found with ID ${userId}`);
    }

    console.log(`[Subscription Update] Successfully updated user ${userId} to plan ${plan} (${dbPlan})`);
  } catch (error) {
    console.error("Error updating user subscription:", error);
    throw error;
  }
}
