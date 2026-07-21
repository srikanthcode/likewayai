import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

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
  summary?: string;
  title?: string;
  tags?: string[];
  updatedAt: Date;
  createdAt: Date;
};

export type UserPreferences = {
  _id?: ObjectId;
  userId: string;
  language?: string;
  tone?: "formal" | "casual" | "technical" | "creative";
  codeStyle?: string;
  favoriteModels?: string[];
  favoriteModes?: string[];
  customInstructions?: string;
  updatedAt: Date;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION MEMORY - Core CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function saveMessage(userId: string, message: Omit<Message, "timestamp">, projectId: string = "default", conversationId?: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

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
        $setOnInsert: { userId, projectId: projectId || "default", createdAt: new Date() },
      },
      { upsert: true }
    );

    // Auto-generate title from first user message
    if (message.role === "user" && !conversationId) {
      await collection.updateOne(
        { userId, projectId: projectId || "default", title: { $exists: false } },
        { $set: { title: message.content.substring(0, 60) } }
      );
    }
  } catch (error) {
    console.error("Failed to save message to MongoDB:", error);
  }
}


export async function getHistory(userId: string, limit: number = 20, projectId: string = "default", conversationId?: string): Promise<Message[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories") as any;

    const query = conversationId ? { _id: new ObjectId(conversationId), userId } : { userId, projectId: projectId || "default" };
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
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

    const conversations = await collection.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .project({ _id: 1, title: 1, updatedAt: 1 })
      .toArray();

    return conversations.map(c => ({
      _id: c._id!.toString(),
      title: c.title || c.messages?.[0]?.content?.substring(0, 40) || "Untitled Chat",
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
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories") as any;

    await collection.deleteOne({ userId, projectId: projectId || "default" });
  } catch (error) {
    console.error("Failed to clear history in MongoDB:", error);
  }
}

export async function deleteConversation(userId: string, conversationId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

    await collection.deleteOne({ _id: new ObjectId(conversationId), userId });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION SUMMARIZATION
// ═══════════════════════════════════════════════════════════════════════════

export async function summarizeConversation(conversationId: string, messages: Message[]): Promise<string> {
  if (messages.length < 4) return "";
  
  // Extract key topics and decisions from the conversation
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
  const topics = new Set<string>();
  
  // Simple keyword extraction
  for (const msg of userMessages.slice(-5)) {
    const words = msg.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const word of words.slice(0, 3)) {
      topics.add(word);
    }
  }

  const summary = `Discussion about: ${Array.from(topics).slice(0, 5).join(", ")}. ${
    messages.length} messages exchanged.`;
  
  // Save summary to conversation
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");
    
    await collection.updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { summary } }
    );
  } catch (error) {
    console.error("Failed to save conversation summary:", error);
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC SEARCH OVER PAST CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function searchConversations(userId: string, query: string, limit: number = 5): Promise<{conversationId: string, title: string, snippet: string, score: number}[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

    // Text search using MongoDB text index
    const results = await collection.find({
      userId,
      $text: { $search: query }
    })
    .project({ 
      _id: 1, 
      title: 1,
      summary: 1,
      messages: { $slice: -3 } 
    })
    .limit(limit)
    .toArray();

    return results.map(r => {
      const lastUserMsg = r.messages?.find((m: any) => m.role === "user")?.content || "";
      return {
        conversationId: r._id!.toString(),
        title: r.title || "Untitled",
        snippet: r.summary || lastUserMsg.substring(0, 150),
        score: 1.0 // MongoDB text search returns by relevance
      };
    });
  } catch (error) {
    console.error("Failed to search conversations:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<UserPreferences>("user_preferences");

    const prefs = await collection.findOne({ userId });
    
    return prefs || {
      userId,
      language: "en",
      tone: "casual",
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to get user preferences:", error);
    return {
      userId,
      language: "en",
      tone: "casual",
      updatedAt: new Date(),
    };
  }
}

export async function updateUserPreferences(userId: string, updates: Partial<Omit<UserPreferences, '_id' | 'userId'>>) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<UserPreferences>("user_preferences");

    await collection.updateOne(
      { userId },
      { 
        $set: { ...updates, updatedAt: new Date() },
        $setOnInsert: { userId }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to update user preferences:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION RECOVERY
// ═══════════════════════════════════════════════════════════════════════════

export async function getActiveSession(userId: string): Promise<{conversationId: string, lastMessage: string, timestamp: Date} | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

    // Find the most recent conversation with activity in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const conversation = await collection.findOne(
      { userId, updatedAt: { $gt: oneDayAgo } },
      { sort: { updatedAt: -1 } }
    );

    if (!conversation) return null;

    const lastMsg = conversation.messages[conversation.messages.length - 1];
    return {
      conversationId: conversation._id!.toString(),
      lastMessage: lastMsg?.content?.substring(0, 100) || "",
      timestamp: conversation.updatedAt,
    };
  } catch (error) {
    console.error("Failed to get active session:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION CONTEXT FOR AI
// ═══════════════════════════════════════════════════════════════════════════

export async function getConversationContext(userId: string, projectId: string = "default"): Promise<string> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Conversation> = db.collection("chatmemories");

    // Get recent conversations for context
    const conversations = await collection.find({ userId, projectId })
      .sort({ updatedAt: -1 })
      .limit(3)
      .project({ summary: 1, title: 1, messages: { $slice: -5 } })
      .toArray();

    if (conversations.length === 0) return "";

    const contextParts: string[] = [];
    
    for (const conv of conversations) {
      if (conv.summary) {
        contextParts.push(`Previous topic: ${conv.summary}`);
      }
      // Add recent messages for continuity
      const recentMsgs = conv.messages?.slice(-3) || [];
      for (const msg of recentMsgs) {
        if (msg.role === "user") {
          contextParts.push(`User previously asked: ${msg.content.substring(0, 100)}`);
        }
      }
    }

    return contextParts.length > 0 
      ? `\n\n## CONVERSATION CONTEXT\n${contextParts.join("\n")}\n`
      : "";
  } catch (error) {
    console.error("Failed to get conversation context:", error);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export async function checkUsageLimit(userId: string, limit: number): Promise<{ allowed: boolean; current: number }> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection("usage");

    const today = new Date().toISOString().slice(0, 10);
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
    const db = client.db(DB_NAME);
    const collection = db.collection("usage");

    const today = new Date().toISOString().slice(0, 10);
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
    const db = client.db(DB_NAME);
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
