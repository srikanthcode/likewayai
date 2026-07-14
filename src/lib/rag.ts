import clientPromise from "./mongodb";
import crypto from "crypto";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

export async function ingestDocument(
  content: string,
  metadata: { title?: string; source: string },
  projectId?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection("rag_documents");

  const docId = crypto.randomUUID();
  await collection.insertOne({
    id: docId,
    content,
    metadata,
    projectId: projectId || "default",
    createdAt: new Date(),
  });
}
