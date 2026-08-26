// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — KNOWLEDGE GRAPH MEMORY
// Semantic, episodic, and relational memory system
// ══════════════════════════════════════════════════════════════════════

import clientPromise from "../mongodb";
import { ObjectId, Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

// ── Types ────────────────────────────────────────────────────────────

export type MemoryType = "semantic" | "episodic" | "procedural" | "preference";

export interface MemoryNode {
  _id?: ObjectId;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  tags: string[];
  strength: number; // 0-1, decays over time
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryEdge {
  _id?: ObjectId;
  userId: string;
  sourceId: string;
  targetId: string;
  relation: string;
  weight: number;
  createdAt: Date;
}

// ══════════════════════════════════════════════════════════════════════
// MEMORY OPERATIONS
// ══════════════════════════════════════════════════════════════════════

export async function addMemory(userId: string, memory: {
  type: MemoryType;
  content: string;
  tags?: string[];
  metadata?: Record<string, any>;
}): Promise<MemoryNode | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<MemoryNode> = db.collection("memory_nodes");

    const newMemory: MemoryNode = {
      userId,
      type: memory.type,
      content: memory.content,
      tags: memory.tags || [],
      metadata: memory.metadata || {},
      strength: 1,
      accessCount: 0,
      lastAccessed: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newMemory);
    return { ...newMemory, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add memory:", error);
    return null;
  }
}

export async function recallMemory(userId: string, query: string, limit: number = 10): Promise<MemoryNode[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<MemoryNode> = db.collection("memory_nodes");

    const memories = await collection.find({
      userId,
      $or: [
        { content: { $regex: query, $options: "i" } },
        { tags: { $in: query.toLowerCase().split(/\s+/) } },
      ],
    })
    .sort({ strength: -1, lastAccessed: -1 })
    .limit(limit)
    .toArray();

    // Update access count and last accessed
    const ids = memories.map(m => m._id!);
    if (ids.length > 0) {
      await collection.updateMany(
        { _id: { $in: ids } },
        { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date() } }
      );
    }

    return memories;
  } catch (error) {
    console.error("Failed to recall memory:", error);
    return [];
  }
}

export async function strengthenMemory(userId: string, memoryId: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<MemoryNode> = db.collection("memory_nodes");

    await collection.updateOne(
      { _id: new ObjectId(memoryId), userId },
      { $set: { strength: 1, lastAccessed: new Date() }, $inc: { accessCount: 1 } }
    );
  } catch (error) {
    console.error("Failed to strengthen memory:", error);
  }
}

export async function decayMemories(userId: string, decayRate: number = 0.01): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<MemoryNode> = db.collection("memory_nodes");

    await collection.updateMany(
      { userId, strength: { $gt: 0.01 } },
      [{ $set: { strength: { $max: [0, { $subtract: ["$strength", decayRate] }] } } }]
    );
  } catch (error) {
    console.error("Failed to decay memories:", error);
  }
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await Promise.all([
      db.collection("memory_nodes").deleteOne({ _id: new ObjectId(memoryId), userId }),
      db.collection("memory_edges").deleteMany({
        $or: [{ sourceId: memoryId }, { targetId: memoryId }],
      }),
    ]);
  } catch (error) {
    console.error("Failed to delete memory:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// RELATIONSHIP OPERATIONS
// ══════════════════════════════════════════════════════════════════════

export async function addRelation(userId: string, sourceId: string, targetId: string, relation: string): Promise<MemoryEdge | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<MemoryEdge> = db.collection("memory_edges");

    // Check if relation exists
    const existing = await collection.findOne({ userId, sourceId, targetId, relation });
    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: { weight: Math.min(1, (existing.weight || 0) + 0.1) } }
      );
      return existing;
    }

    const edge: MemoryEdge = { userId, sourceId, targetId, relation, weight: 0.5, createdAt: new Date() };
    const result = await collection.insertOne(edge);
    return { ...edge, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add relation:", error);
    return null;
  }
}

export async function getRelatedMemories(userId: string, memoryId: string, depth: number = 1): Promise<{ node: MemoryNode; edge: MemoryEdge }[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const edgesCollection: Collection<MemoryEdge> = db.collection("memory_edges");
    const nodesCollection: Collection<MemoryNode> = db.collection("memory_nodes");

    const results: { node: MemoryNode; edge: MemoryEdge }[] = [];
    const visited = new Set<string>([memoryId]);
    let currentIds = [memoryId];

    for (let d = 0; d < depth; d++) {
      const edges = await edgesCollection.find({
        userId,
        $or: [
          { sourceId: { $in: currentIds } },
          { targetId: { $in: currentIds } },
        ],
      }).toArray();

      const nextIds: string[] = [];
      for (const edge of edges) {
        const targetId = currentIds.includes(edge.sourceId) ? edge.targetId : edge.sourceId;
        if (!visited.has(targetId)) {
          visited.add(targetId);
          nextIds.push(targetId);

          const node = await nodesCollection.findOne({ _id: new ObjectId(targetId) });
          if (node) {
            results.push({ node, edge });
          }
        }
      }
      currentIds = nextIds;
    }

    return results;
  } catch (error) {
    console.error("Failed to get related memories:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════
// CONTEXT BUILDING
// ══════════════════════════════════════════════════════════════════════

export async function buildMemoryContext(userId: string, query: string): Promise<string> {
  const memories = await recallMemory(userId, query, 5);
  if (memories.length === 0) return "";

  let context = "## Relevant Memories\n\n";
  for (const m of memories) {
    context += `- [${m.type}] ${m.content}\n`;
  }
  return context;
}

export async function getMemoryStats(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const [nodeCount, edgeCount, byType] = await Promise.all([
      db.collection("memory_nodes").countDocuments({ userId }),
      db.collection("memory_edges").countDocuments({ userId }),
      db.collection("memory_nodes").aggregate([
        { $match: { userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    return { nodeCount, edgeCount, byType };
  } catch (error) {
    console.error("Failed to get memory stats:", error);
    return { nodeCount: 0, edgeCount: 0, byType: [] };
  }
}
