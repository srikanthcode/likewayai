import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

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
    const db = client.db("zynthex_ai");
    const collection = db.collection<Project>("projects");

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
    const db = client.db("gemma-ai");
    const collection = db.collection<Project>("projects");

    return await collection.find({ userId }).toArray();
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
}

export async function deleteProject(projectId: string) {
  try {
    const client = await clientPromise;
    const db = client.db("gemma-ai");
    const collection = db.collection<Project>("projects");

    await collection.deleteOne({ _id: new ObjectId(projectId) });
  } catch (error) {
    console.error("Failed to delete project:", error);
  }
}
