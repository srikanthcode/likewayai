// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — PROJECT WORKSPACE SYSTEM
// Full workspace with files, memory, tasks, and context
// ══════════════════════════════════════════════════════════════════════

import clientPromise from "./mongodb";
import { ObjectId, Collection } from "mongodb";
import fs from "fs";
import path from "path";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";
const WORKSPACE_DIR = path.join(process.cwd(), "workspaces");

// ── Types ────────────────────────────────────────────────────────────

export interface ProjectFile {
  _id?: ObjectId;
  projectId: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  content?: string; // For text files
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemory {
  _id?: ObjectId;
  projectId: string;
  key: string;
  value: string;
  category: "preference" | "fact" | "decision" | "context" | "instruction";
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTask {
  _id?: ObjectId;
  projectId: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  assignedAgent?: string;
  result?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ProjectConversation {
  _id?: ObjectId;
  projectId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface Project {
  _id?: ObjectId;
  userId: string;
  name: string;
  emoji?: string;
  description: string;
  systemPrompt?: string;
  instructions?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Workspace Helpers ────────────────────────────────────────────────

function ensureWorkspaceDir(projectId: string) {
  const dir = path.join(WORKSPACE_DIR, projectId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT CRUD
// ══════════════════════════════════════════════════════════════════════

export async function createProject(project: Omit<Project, "_id" | "createdAt" | "updatedAt">) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");

    const newProject: Project = {
      ...project,
      instructions: project.instructions || [],
      tags: project.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newProject);
    ensureWorkspaceDir(result.insertedId.toString());
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
    return await collection.find({ userId }).sort({ updatedAt: -1 }).toArray();
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
}

export async function getProject(projectId: string, userId: string): Promise<Project | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");
    return await collection.findOne({ _id: new ObjectId(projectId), userId });
  } catch (error) {
    console.error("Failed to get project:", error);
    return null;
  }
}

export async function updateProject(projectId: string, userId: string, updates: Partial<Project>) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<Project> = db.collection("projects");
    await collection.updateOne(
      { _id: new ObjectId(projectId), userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  } catch (error) {
    console.error("Failed to update project:", error);
  }
}

export async function deleteProject(projectId: string, userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Delete project and all related data
    await Promise.all([
      db.collection("projects").deleteOne({ _id: new ObjectId(projectId), userId }),
      db.collection("project_files").deleteMany({ projectId }),
      db.collection("project_memory").deleteMany({ projectId }),
      db.collection("project_tasks").deleteMany({ projectId }),
      db.collection("project_conversations").deleteMany({ projectId }),
    ]);

    // Delete workspace directory
    const dir = path.join(WORKSPACE_DIR, projectId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Failed to delete project:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// FILE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════

export async function addProjectFile(projectId: string, file: {
  name: string;
  mimeType: string;
  content?: string;
}): Promise<ProjectFile | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectFile> = db.collection("project_files");

    const workspaceDir = ensureWorkspaceDir(projectId);
    const filePath = path.join(workspaceDir, file.name);

    // Save file to disk
    if (file.content) {
      fs.writeFileSync(filePath, file.content);
    }

    const newFile: ProjectFile = {
      projectId,
      name: file.name,
      path: filePath,
      mimeType: file.mimeType,
      size: file.content ? Buffer.byteLength(file.content) : 0,
      content: file.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newFile);
    return { ...newFile, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add project file:", error);
    return null;
  }
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectFile> = db.collection("project_files");
    return await collection.find({ projectId }).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error("Failed to get project files:", error);
    return [];
  }
}

export async function getProjectFile(projectId: string, fileId: string): Promise<ProjectFile | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectFile> = db.collection("project_files");
    return await collection.findOne({ _id: new ObjectId(fileId), projectId });
  } catch (error) {
    console.error("Failed to get project file:", error);
    return null;
  }
}

export async function deleteProjectFile(projectId: string, fileId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectFile> = db.collection("project_files");

    const file = await collection.findOne({ _id: new ObjectId(fileId), projectId });
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await collection.deleteOne({ _id: new ObjectId(fileId), projectId });
  } catch (error) {
    console.error("Failed to delete project file:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT MEMORY (Knowledge Base)
// ══════════════════════════════════════════════════════════════════════

export async function addProjectMemory(projectId: string, memory: {
  key: string;
  value: string;
  category: "preference" | "fact" | "decision" | "context" | "instruction";
}): Promise<ProjectMemory | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectMemory> = db.collection("project_memory");

    const newMemory: ProjectMemory = {
      projectId,
      ...memory,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newMemory);
    return { ...newMemory, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add project memory:", error);
    return null;
  }
}

export async function getProjectMemory(projectId: string, category?: string): Promise<ProjectMemory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectMemory> = db.collection("project_memory");
    const query: any = { projectId };
    if (category) query.category = category;
    return await collection.find(query).sort({ updatedAt: -1 }).toArray();
  } catch (error) {
    console.error("Failed to get project memory:", error);
    return [];
  }
}

export async function searchProjectMemory(projectId: string, query: string): Promise<ProjectMemory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectMemory> = db.collection("project_memory");
    return await collection.find({
      projectId,
      $or: [
        { key: { $regex: query, $options: "i" } },
        { value: { $regex: query, $options: "i" } },
      ],
    }).toArray();
  } catch (error) {
    console.error("Failed to search project memory:", error);
    return [];
  }
}

export async function deleteProjectMemory(projectId: string, memoryId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectMemory> = db.collection("project_memory");
    await collection.deleteOne({ _id: new ObjectId(memoryId), projectId });
  } catch (error) {
    console.error("Failed to delete project memory:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT TASKS
// ══════════════════════════════════════════════════════════════════════

export async function addProjectTask(projectId: string, task: {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  assignedAgent?: string;
}): Promise<ProjectTask | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectTask> = db.collection("project_tasks");

    const newTask: ProjectTask = {
      projectId,
      title: task.title,
      description: task.description,
      status: "pending",
      priority: task.priority || "medium",
      assignedAgent: task.assignedAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newTask);
    return { ...newTask, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add project task:", error);
    return null;
  }
}

export async function getProjectTasks(projectId: string, status?: string): Promise<ProjectTask[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectTask> = db.collection("project_tasks");
    const query: any = { projectId };
    if (status) query.status = status;
    return await collection.find(query).sort({ priority: -1, createdAt: -1 }).toArray();
  } catch (error) {
    console.error("Failed to get project tasks:", error);
    return [];
  }
}

export async function updateProjectTask(projectId: string, taskId: string, updates: Partial<ProjectTask>) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectTask> = db.collection("project_tasks");

    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.status === "completed") {
      updateData.completedAt = new Date();
    }

    await collection.updateOne(
      { _id: new ObjectId(taskId), projectId },
      { $set: updateData }
    );
  } catch (error) {
    console.error("Failed to update project task:", error);
  }
}

export async function deleteProjectTask(projectId: string, taskId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectTask> = db.collection("project_tasks");
    await collection.deleteOne({ _id: new ObjectId(taskId), projectId });
  } catch (error) {
    console.error("Failed to delete project task:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT CONVERSATIONS
// ══════════════════════════════════════════════════════════════════════

export async function addProjectConversation(projectId: string, title: string): Promise<ProjectConversation | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectConversation> = db.collection("project_conversations");

    const newConvo: ProjectConversation = {
      projectId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newConvo);
    return { ...newConvo, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to add project conversation:", error);
    return null;
  }
}

export async function addMessageToConversation(projectId: string, conversationId: string, message: ConversationMessage) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectConversation> = db.collection("project_conversations");

    await collection.updateOne(
      { _id: new ObjectId(conversationId), projectId },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      }
    );
  } catch (error) {
    console.error("Failed to add message to conversation:", error);
  }
}

export async function getProjectConversations(projectId: string): Promise<ProjectConversation[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ProjectConversation> = db.collection("project_conversations");
    return await collection.find({ projectId }).sort({ updatedAt: -1 }).toArray();
  } catch (error) {
    console.error("Failed to get project conversations:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER (For AI)
// ══════════════════════════════════════════════════════════════════════

export async function buildProjectContext(projectId: string): Promise<string> {
  try {
    const [project, memory, tasks, files] = await Promise.all([
      getProject(projectId, ""), // We need to get by ID
      getProjectMemory(projectId),
      getProjectTasks(projectId),
      getProjectFiles(projectId),
    ]);

    let context = `# Project: ${project?.name || "Unknown"}\n`;
    context += `Description: ${project?.description || "No description"}\n\n`;

    if (project?.instructions && project.instructions.length > 0) {
      context += "## Instructions\n";
      project.instructions.forEach(i => context += `- ${i}\n`);
      context += "\n";
    }

    if (memory.length > 0) {
      context += "## Project Knowledge\n";
      memory.forEach(m => context += `- [${m.category}] ${m.key}: ${m.value}\n`);
      context += "\n";
    }

    const pendingTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
    if (pendingTasks.length > 0) {
      context += "## Pending Tasks\n";
      pendingTasks.forEach(t => context += `- [${t.priority}] ${t.title}${t.description ? `: ${t.description}` : ""}\n`);
      context += "\n";
    }

    if (files.length > 0) {
      context += "## Files\n";
      files.forEach(f => context += `- ${f.name} (${f.mimeType}, ${f.size} bytes)\n`);
      context += "\n";
    }

    return context;
  } catch (error) {
    console.error("Failed to build project context:", error);
    return "";
  }
}
