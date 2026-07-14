import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

export interface Project {
  _id?: ObjectId;
  userId: string;
  name: string;
  emoji?: string;
  description: string;

  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createProject(project: Omit<Project, "_id" | "createdAt" | "updatedAt">) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");

    const newProject: Project = {
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newProject);
    return { ...newProject, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
}

export async function getProjects(userId: string): Promise<Project[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");

    return await collection.find({ userId }).toArray();
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
}

export async function deleteProject(projectId: string, userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");

    await collection.deleteOne({ _id: new ObjectId(projectId), userId });
  } catch (error) {
    console.error("Failed to delete project:", error);
  }
}
