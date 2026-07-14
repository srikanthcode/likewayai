import { MongoClient, MongoClientOptions, ObjectId } from "mongodb";

const rawUri = process.env.MONGODB_URI || "";
const uri = rawUri.replace(/[&?]tlsAllowInvalidCertificates=true/gi, "");

const options: MongoClientOptions = {
  maxPoolSize: process.env.NODE_ENV === "production" ? 50 : 10,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Re-export ObjectId so other modules can import it from here
export { ObjectId };

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    if (process.env.NODE_ENV === "production") {
      // In production, fail loudly if MongoDB URI is not configured
      console.error("[MongoDB] CRITICAL: MONGODB_URI not set in production! Application cannot function without a database.");
      throw new Error("MONGODB_URI must be set in production environment");
    }
    // Development only: use mock client for local development without MongoDB
    console.warn("[MongoDB] MONGODB_URI not set — using in-memory mock for development only. Auth will not persist.");
    function mockCursor(_result: any[] = []) {
      const cursor: any = {
        sort: () => cursor,
        limit: () => cursor,
        project: () => cursor,
        skip: () => cursor,
        toArray: () => Promise.resolve([]),
      };
      return cursor;
    }

    const mockClient = {
      db: () => ({
        collection: (name: string) => ({
          findOne: () => Promise.resolve(null),
          find: () => mockCursor([]),
          insertOne: (doc: any) => {
            const insertedId = new ObjectId();
            return Promise.resolve({ acknowledged: true, insertedId });
          },
          updateOne: () => Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
          deleteOne: () => Promise.resolve({ acknowledged: true, deletedCount: 1 }),
          deleteMany: () => Promise.resolve({ acknowledged: true, deletedCount: 0 }),
          countDocuments: () => Promise.resolve(0),
          aggregate: () => mockCursor([]),
        }),
      }),
      connect: () => Promise.resolve(),
      close: () => Promise.resolve(),
    } as unknown as MongoClient;

    return Promise.resolve(mockClient);
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

let clientPromise: Promise<MongoClient> | null = null;

export function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = createClientPromise();
  }
  return clientPromise;
}

export default new Proxy({} as Promise<MongoClient>, {
  get(_target, prop) {
    const promise = getClientPromise();
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return (promise as any)[prop].bind(promise);
    }
    return (promise as any)[prop];
  },
});

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}
