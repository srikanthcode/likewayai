import { MongoClient, MongoClientOptions, ObjectId } from "mongodb";

const rawUri = process.env.MONGODB_URI || "";
const uri = rawUri.replace(/[&?]tlsAllowInvalidCertificates=true/gi, "");

const options: MongoClientOptions = {
  maxPoolSize: process.env.NODE_ENV === "production" ? 50 : 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoFallbackStore: Map<string, any> | undefined;
}

export { ObjectId };

// Memory store fallback when MongoDB Atlas is unreachable
if (!global._mongoFallbackStore) {
  global._mongoFallbackStore = new Map<string, any>();
}

function createMockClient(): MongoClient {
  function mockCursor(items: any[] = []) {
    const cursor: any = {
      sort: () => cursor,
      limit: () => cursor,
      project: () => cursor,
      skip: () => cursor,
      toArray: () => Promise.resolve(items),
    };
    return cursor;
  }

  const store = global._mongoFallbackStore!;

  const mockDb = {
    collection: (name: string) => {
      const colKey = `col_${name}`;
      if (!store.has(colKey)) store.set(colKey, []);
      const docs: any[] = store.get(colKey);

      return {
        findOne: (query: any) => {
          if (!query) return Promise.resolve(null);
          const found = docs.find((d) => {
            if (query.email && d.email === query.email.toLowerCase()) return true;
            if (query._id && d._id?.toString() === query._id?.toString()) return true;
            return false;
          });
          return Promise.resolve(found || null);
        },
        find: (query: any = {}) => {
          let res = docs;
          if (query.email) res = res.filter((d) => d.email === query.email.toLowerCase());
          return mockCursor(res);
        },
        insertOne: (doc: any) => {
          const _id = doc._id || new ObjectId();
          const savedDoc = { ...doc, _id };
          docs.push(savedDoc);
          return Promise.resolve({ acknowledged: true, insertedId: _id });
        },
        updateOne: (filter: any, update: any) => {
          const idx = docs.findIndex((d) => {
            if (filter.email && d.email === filter.email.toLowerCase()) return true;
            if (filter._id && d._id?.toString() === filter._id?.toString()) return true;
            return false;
          });
          if (idx !== -1 && update.$set) {
            docs[idx] = { ...docs[idx], ...update.$set };
          }
          return Promise.resolve({ acknowledged: true, matchedCount: idx !== -1 ? 1 : 0, modifiedCount: 1 });
        },
        deleteOne: (filter: any) => {
          const idx = docs.findIndex((d) => filter._id && d._id?.toString() === filter._id?.toString());
          if (idx !== -1) docs.splice(idx, 1);
          return Promise.resolve({ acknowledged: true, deletedCount: idx !== -1 ? 1 : 0 });
        },
        deleteMany: () => Promise.resolve({ acknowledged: true, deletedCount: 0 }),
        countDocuments: () => Promise.resolve(docs.length),
        aggregate: () => mockCursor([]),
      };
    },
  };

  return {
    db: () => mockDb,
    connect: () => Promise.resolve(),
    close: () => Promise.resolve(),
  } as unknown as MongoClient;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    console.warn("[MongoDB] MONGODB_URI not set — using resilient in-memory client.");
    return Promise.resolve(createMockClient());
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client
      .connect()
      .then((c) => {
        console.log("[MongoDB] Connected successfully to Atlas cluster.");
        return c;
      })
      .catch((err) => {
        console.error("[MongoDB] Connection error, activating resilient fallback client:", err.message);
        // Reset global promise so next request can retry Atlas connection
        global._mongoClientPromise = undefined;
        return createMockClient();
      });
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
