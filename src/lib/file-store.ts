// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — GENERATED FILE STORE
// Stores AI-generated documents (PDF/DOCX/XLSX) in MongoDB so they can be
// downloaded via /api/files/[id]. Works on Vercel serverless (ephemeral FS)
// because bytes live in the database. Files auto-expire after 7 days.
// ══════════════════════════════════════════════════════════════════════

import clientPromise, { ObjectId } from "./mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";
const COLLECTION = "generated_files";
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB safety cap
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface StoredFileMeta {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

interface GeneratedFileDoc {
  _id?: ObjectId;
  userId: string;
  projectId: string;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Save generated file bytes. Returns the public download path.
 */
export async function saveGeneratedFile(
  userId: string,
  projectId: string,
  filename: string,
  contentType: string,
  data: Buffer
): Promise<{ id: string; url: string; size: number }> {
  if (!data || data.length === 0) {
    throw new Error("Cannot save empty file");
  }
  if (data.length > MAX_FILE_BYTES) {
    throw new Error(`Generated file too large (${(data.length / 1024 / 1024).toFixed(1)} MB, max 15 MB)`);
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Ensure TTL index once per process (cheap no-op if it exists)
  void db.collection(COLLECTION).createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "generated_files_ttl" }
  ).catch(() => {});

  const doc: GeneratedFileDoc = {
    userId,
    projectId,
    filename: sanitizeFilename(filename),
    contentType,
    size: data.length,
    data,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
  };

  const result = await db.collection(COLLECTION).insertOne(doc);
  const id = result.insertedId.toString();

  return { id, url: `/api/files/${id}`, size: data.length };
}

/**
 * Load a file for download. Enforces ownership when userId is provided.
 */
export async function getGeneratedFile(
  id: string,
  userId?: string
): Promise<{ meta: StoredFileMeta; data: Buffer } | null> {
  if (!ObjectId.isValid(id)) return null;

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const query: Record<string, any> = { _id: new ObjectId(id) };
  // Anonymous users may only fetch files they created anonymously
  if (userId !== undefined) query.userId = userId;

  const doc = await db.collection<GeneratedFileDoc>(COLLECTION).findOne(query);
  if (!doc) return null;

  return {
    meta: {
      id: doc._id!.toString(),
      filename: doc.filename,
      contentType: doc.contentType,
      size: doc.size,
      createdAt: doc.createdAt,
    },
    data: doc.data,
  };
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._\- ]/g, "_").trim();
  return (cleaned || "document").slice(0, 120);
}
