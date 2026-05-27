import { MongoClient, MongoClientOptions } from "mongodb";

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
    // Return a rejected promise that can be caught by calling code
    return Promise.reject(new Error("MONGODB_URI is not configured"));
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
export default new Proxy({} as any, {
  get() {
    return getClientPromise();
  }
});

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}
