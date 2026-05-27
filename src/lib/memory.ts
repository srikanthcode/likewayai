import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  files?: string[];
  timestamp: Date;
};

export type Conversation = {
  _id?: ObjectId;
  userId: string;
  messages: Message[];
  updatedAt: Date;
};

export async function saveMessage(userId: string, message: Omit<Message, "timestamp">, projectId: string = "default", conversationId?: string) {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Conversation>("chatmemories");

    const fullMessage: Message = {
      ...message,
      timestamp: new Date(),
    };

    let query: any = { userId, projectId: projectId || "default" };
    if (conversationId && ObjectId.isValid(conversationId)) {
      query = { _id: new ObjectId(conversationId), userId };
    }

    await collection.updateOne(
      query,
      {
        $push: { messages: fullMessage },
        $set: { updatedAt: new Date() },
        $setOnInsert: { userId, projectId: projectId || "default" },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to save message to MongoDB:", error);
  }
}


export async function getHistory(userId: string, limit: number = 20, projectId: string = "default", conversationId?: string): Promise<Message[]> {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Conversation>("chatmemories") as any;

    const query = conversationId ? { _id: new ObjectId(conversationId) } : { userId, projectId: projectId || "default" };
    const conversation = await collection.findOne(query);

    return conversation ? conversation.messages.slice(-limit) : [];
  } catch (error) {
    console.error("Failed to get history from MongoDB:", error);
    return [];
  }
}

export async function listConversations(userId: string, limit: number = 20): Promise<{_id: string, title: string, updatedAt: Date}[]> {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Conversation>("chatmemories");

    const conversations = await collection.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .project({ _id: 1, messages: { $slice: 1 }, updatedAt: 1 })
      .toArray();

    return conversations.map(c => ({
      _id: c._id!.toString(),
      title: c.messages[0]?.content.substring(0, 40) || "Untitled Chat",
      updatedAt: c.updatedAt
    }));
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return [];
  }
}

export async function clearHistory(userId: string, projectId: string = "default") {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Conversation>("chatmemories") as any;

    await collection.deleteOne({ userId, projectId: projectId || "default" });

  } catch (error) {
    console.error("Failed to clear history in MongoDB:", error);
  }
}

export async function deleteConversation(userId: string, conversationId: string) {
  try {
    const client = await clientPromise;
    const db = client.db("zynthex_ai");
    const collection = db.collection<Conversation>("chatmemories");

    await collection.deleteOne({ _id: new ObjectId(conversationId), userId });

  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
}

export async function checkUsageLimit(userId: string, limit: number): Promise<{ allowed: boolean; current: number }> {
    try {
        const client = await clientPromise;
        const db = client.db("zynthex_ai");
        const collection = db.collection("usage");

        const today = new Date().toDateString();
        const usage = await collection.findOne({ userId, date: today }) as any;

        if (!usage) return { allowed: true, current: 0 };
        return { allowed: usage.count < limit, current: usage.count };
    } catch (error) {
        console.error("Usage Check Error:", error);
        return { allowed: true, current: 0 }; 
    }
}

export async function incrementUsage(userId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("zynthex_ai");
        const collection = db.collection("usage");

        const today = new Date().toDateString();
        await collection.updateOne(
            { userId, date: today },
            { 
                $inc: { count: 1 },
                $setOnInsert: { userId, date: today }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error("Usage Increment Error:", error);
    }
}

export async function checkRateLimit(userId: string, limitPerMinute: number = 20): Promise<boolean> {
    try {
        const client = await clientPromise;
        const db = client.db("zynthex_ai");
        const collection = db.collection("rate_limits");

        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        const count = await collection.countDocuments({ 
            userId, 
            timestamp: { $gt: oneMinuteAgo } 
        });
        
        if (count >= limitPerMinute) return false;

        await collection.insertOne({ userId, timestamp: now });
        return true;
    } catch (error) {
        console.error("Rate Limit Error:", error);
        return true;
    }
}


