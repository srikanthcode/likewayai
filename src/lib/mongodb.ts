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

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function matchesFilter(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(cond)) {
      if (!cond.some((sub) => matchesFilter(doc, sub))) return false;
      continue;
    }
    const val = key.includes(".") ? getNestedValue(doc, key) : doc[key];
    if (key === "_id") {
      if (doc._id?.toString() !== cond?.toString()) return false;
      continue;
    }
    if (key === "email" && typeof cond === "string" && typeof val === "string") {
      if (val.toLowerCase() !== cond.toLowerCase()) return false;
      continue;
    }
    if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof ObjectId) && !(cond instanceof Date)) {
      if ("$exists" in cond) {
        const exists = val !== undefined;
        if ( Boolean(cond.$exists) !== exists) return false;
      }
      if ("$lt" in cond) {
        if (typeof val !== "number" || !(val < (cond.$lt as number))) return false;
      }
      if ("$lte" in cond) {
        if (typeof val !== "number" || !(val <= (cond.$lte as number))) return false;
      }
      if ("$gt" in cond) {
        if (typeof val !== "number" || !(val > (cond.$gt as number))) return false;
      }
      if ("$ne" in cond) {
        if (val === cond.$ne) return false;
      }
      continue;
    }
    if (val !== cond) return false;
  }
  return true;
}

function applyUpdate(doc: any, update: any, isInsert = false): any {
  if (!update) return doc;
  if (isInsert && update.$setOnInsert) {
    for (const [k, v] of Object.entries(update.$setOnInsert)) {
      setNestedValue(doc, k, v);
    }
  }
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      setNestedValue(doc, k, v);
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const current = Number(getNestedValue(doc, k) ?? 0);
      setNestedValue(doc, k, current + Number(v));
    }
  }
  return doc;
}

function createMockClient(): MongoClient {
  function mockCursor(items: any[] = []) {
    const list = [...items];
    const cursor: any = {
      sort: () => cursor,
      limit: (n: number) => {
        list.splice(n);
        return cursor;
      },
      project: () => cursor,
      skip: (n: number) => {
        list.splice(0, n);
        return cursor;
      },
      toArray: () => Promise.resolve(list),
    };
    return cursor;
  }

  const store = global._mongoFallbackStore!;

  const mockDb = {
    command: (cmd?: any) => Promise.resolve({ ok: 1, ping: 1 }),
    listCollections: () => mockCursor([]),
    collection: (name: string) => {
      const colKey = `col_${name}`;
      if (!store.has(colKey)) store.set(colKey, []);
      const docs: any[] = store.get(colKey);

      return {
        createIndex: () => Promise.resolve("ok"),
        findOne: (query: any) => {
          if (!query) return Promise.resolve(null);
          const found = docs.find((d) => matchesFilter(d, query));
          return Promise.resolve(found || null);
        },
        find: (query: any = {}) => {
          const res = docs.filter((d) => matchesFilter(d, query));
          return mockCursor(res);
        },
        insertOne: (doc: any) => {
          const _id = doc._id || new ObjectId();
          const savedDoc = { ...doc, _id };
          docs.push(savedDoc);
          return Promise.resolve({ acknowledged: true, insertedId: _id });
        },
        updateOne: (filter: any, update: any, opts: any = {}) => {
          const idx = docs.findIndex((d) => matchesFilter(d, filter));
          if (idx !== -1) {
            applyUpdate(docs[idx], update, false);
            return Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });
          }
          if (opts?.upsert) {
            const seed: any = { _id: new ObjectId() };
            for (const [k, v] of Object.entries(filter || {})) {
              if (!k.startsWith("$") && (typeof v === "string" || typeof v === "number" || v instanceof ObjectId)) {
                setNestedValue(seed, k, v);
              }
            }
            applyUpdate(seed, update, true);
            docs.push(seed);
            return Promise.resolve({ acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: seed._id });
          }
          return Promise.resolve({ acknowledged: true, matchedCount: 0, modifiedCount: 0 });
        },
        deleteOne: (filter: any) => {
          const idx = docs.findIndex((d) => matchesFilter(d, filter));
          if (idx !== -1) docs.splice(idx, 1);
          return Promise.resolve({ acknowledged: true, deletedCount: idx !== -1 ? 1 : 0 });
        },
        deleteMany: (filter: any = {}) => {
          let deleted = 0;
          for (let i = docs.length - 1; i >= 0; i--) {
            if (matchesFilter(docs[i], filter)) {
              docs.splice(i, 1);
              deleted++;
            }
          }
          return Promise.resolve({ acknowledged: true, deletedCount: deleted });
        },
        countDocuments: (filter: any = {}) => Promise.resolve(docs.filter((d) => matchesFilter(d, filter)).length),
        estimatedDocumentCount: () => Promise.resolve(docs.length),
        aggregate: () => mockCursor([]),
        findOneAndUpdate: (filter: any, update: any, opts: any = {}) => {
          const idx = docs.findIndex((d) => matchesFilter(d, filter));
          if (idx !== -1) {
            applyUpdate(docs[idx], update, false);
            return Promise.resolve(docs[idx]);
          }
          if (opts?.upsert) {
            const seed: any = { _id: new ObjectId() };
            for (const [k, v] of Object.entries(filter || {})) {
              if (!k.startsWith("$") && (typeof v === "string" || typeof v === "number" || v instanceof ObjectId)) {
                setNestedValue(seed, k, v);
              }
            }
            applyUpdate(seed, update, true);
            docs.push(seed);
            return Promise.resolve(seed);
          }
          return Promise.resolve(null);
        },
      };
    },
  };

  return {
    db: () => mockDb,
    connect: () => Promise.resolve(),
    close: () => Promise.resolve(),
  } as unknown as MongoClient;
}

let _lastConnectAttempt = 0;
let _fallbackClient: MongoClient | null = null;
const RETRY_COOLDOWN_MS = 60000;

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    console.warn("[MongoDB] MONGODB_URI not set — using resilient in-memory client.");
    return Promise.resolve(createMockClient());
  }

  if (_fallbackClient && Date.now() - _lastConnectAttempt < RETRY_COOLDOWN_MS) {
    return Promise.resolve(_fallbackClient);
  }

  if (!global._mongoClientPromise) {
    _lastConnectAttempt = Date.now();
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client
      .connect()
      .then((c) => {
        console.log("[MongoDB] Connected successfully to Atlas cluster.");
        _fallbackClient = null;
        return c;
      })
      .catch((err) => {
        console.error("[MongoDB] Connection error, activating resilient fallback client:", err.message);
        _lastConnectAttempt = Date.now();
        _fallbackClient = createMockClient();
        global._mongoClientPromise = Promise.resolve(_fallbackClient);
        setTimeout(() => {
          global._mongoClientPromise = undefined;
        }, RETRY_COOLDOWN_MS);
        return _fallbackClient;
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
