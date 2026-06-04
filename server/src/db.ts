import { MongoClient, type Db } from "mongodb";
import { env, hasMongo } from "./env";
import { logger } from "./logger";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<void> {
  if (!hasMongo()) {
    logger.warn("MONGO_URL missing — auth & persistence disabled.");
    return;
  }
  client = new MongoClient(env.mongoUrl);
  await client.connect();
  db = client.db();
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("locations").createIndex({ userId: 1 }),
    db.collection("analyses").createIndex({ userId: 1, createdAt: -1 }),
  ]);
  logger.info("mongo:connected");
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB is not connected");
  return db;
}

export function mongoReady(): boolean {
  return db !== null;
}

export async function pingMongo(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
