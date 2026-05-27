import clientPromise from "./mongodb";

export async function ingestDocument(
  content: string,
  metadata: { title?: string; source: string },
  projectId?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("zynthex_ai");
  const collection = db.collection("rag_documents");

  const docId = Math.random().toString(36).substring(2, 9);
  await collection.insertOne({
    id: docId,
    content,
    metadata,
    projectId: projectId || "default",
    createdAt: new Date(),
  });
}
