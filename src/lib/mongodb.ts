import { MongoClient, MongoClientOptions, Collection, Document } from "mongodb";

const rawUri = process.env.MONGODB_URI || "";
const uri = rawUri.replace(/[&?]tlsAllowInvalidCertificates=true/gi, "");

const options: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    // During build time, return a mock client that can be used without errors
    // This allows the build to complete without MongoDB configuration
    const mockClient = {
      db: () => ({
        collection: <T extends Document = any>(name: string): Collection<T> => ({
          findOne: () => Promise.resolve(null),
          find: () => ({ toArray: () => Promise.resolve([]) }),
          insertOne: () => Promise.resolve({ acknowledged: true }),
          updateOne: () => Promise.resolve({ acknowledged: true }),
          deleteOne: () => Promise.resolve({ acknowledged: true }),
        } as unknown as Collection<T>),
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

// Don't create the promise at module level to avoid build-time errors
// It will be created when first accessed
let clientPromise: Promise<MongoClient> | null = null;

export function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = createClientPromise();
  }
  return clientPromise;
}

// For backward compatibility, export a default that creates on first access
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
