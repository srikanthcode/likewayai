// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — BACKGROUND AGENT SCHEDULER
// Recurring tasks, scheduled agents, and automation
// ══════════════════════════════════════════════════════════════════════

import clientPromise from "../mongodb";
import { ObjectId, Collection } from "mongodb";

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";

// ── Types ────────────────────────────────────────────────────────────

export type ScheduleType = "once" | "daily" | "weekly" | "monthly" | "interval";

export interface ScheduledTask {
  _id?: ObjectId;
  userId: string;
  projectId?: string;
  name: string;
  description?: string;
  prompt: string;
  agentId?: string;
  modelId?: string;
  schedule: {
    type: ScheduleType;
    interval?: number; // minutes (for interval type)
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:MM for daily/weekly/monthly
    timezone?: string;
  };
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  lastResult?: string;
  lastStatus?: "success" | "error" | "running";
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskExecution {
  _id?: ObjectId;
  taskId: string;
  userId: string;
  status: "running" | "success" | "error" | "cancelled";
  result?: string;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  startedAt: Date;
  completedAt?: Date;
}

// ── Schedule Calculator ──────────────────────────────────────────────

function calculateNextRun(schedule: ScheduledTask["schedule"], lastRun?: Date): Date {
  const now = new Date();
  const [hours, minutes] = (schedule.time || "09:00").split(":").map(Number);

  if (schedule.type === "once") {
    return lastRun ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
  }

  if (schedule.type === "interval") {
    const intervalMs = (schedule.interval || 60) * 60 * 1000;
    return new Date((lastRun?.getTime() || now.getTime()) + intervalMs);
  }

  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (schedule.type === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (schedule.type === "weekly") {
    const targetDay = schedule.dayOfWeek ?? 1;
    const currentDay = next.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    next.setDate(next.getDate() + (daysUntilTarget === 0 && next <= now ? 7 : daysUntilTarget));
    return next;
  }

  if (schedule.type === "monthly") {
    const targetDay = schedule.dayOfMonth ?? 1;
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  return new Date(now.getTime() + 60 * 60 * 1000);
}

// ══════════════════════════════════════════════════════════════════════
// SCHEDULED TASK CRUD
// ══════════════════════════════════════════════════════════════════════

export async function createScheduledTask(task: Omit<ScheduledTask, "_id" | "createdAt" | "updatedAt" | "runCount" | "nextRun">): Promise<ScheduledTask | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ScheduledTask> = db.collection("scheduled_tasks");

    const newTask: ScheduledTask = {
      ...task,
      runCount: 0,
      nextRun: calculateNextRun(task.schedule),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newTask);
    return { ...newTask, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to create scheduled task:", error);
    return null;
  }
}

export async function getScheduledTasks(userId: string): Promise<ScheduledTask[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ScheduledTask> = db.collection("scheduled_tasks");
    return await collection.find({ userId }).sort({ nextRun: 1 }).toArray();
  } catch (error) {
    console.error("Failed to get scheduled tasks:", error);
    return [];
  }
}

export async function getDueTasks(): Promise<ScheduledTask[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ScheduledTask> = db.collection("scheduled_tasks");

    return await collection.find({
      enabled: true,
      nextRun: { $lte: new Date() },
    }).toArray();
  } catch (error) {
    console.error("Failed to get due tasks:", error);
    return [];
  }
}

export async function updateScheduledTask(taskId: string, userId: string, updates: Partial<ScheduledTask>) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<ScheduledTask> = db.collection("scheduled_tasks");

    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  } catch (error) {
    console.error("Failed to update scheduled task:", error);
  }
}

export async function deleteScheduledTask(taskId: string, userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await Promise.all([
      db.collection("scheduled_tasks").deleteOne({ _id: new ObjectId(taskId), userId }),
      db.collection("task_executions").deleteMany({ taskId }),
    ]);
  } catch (error) {
    console.error("Failed to delete scheduled task:", error);
  }
}

// ══════════════════════════════════════════════════════════════════════
// TASK EXECUTION TRACKING
// ══════════════════════════════════════════════════════════════════════

export async function recordExecution(execution: Omit<TaskExecution, "_id">): Promise<TaskExecution | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<TaskExecution> = db.collection("task_executions");

    const result = await collection.insertOne(execution);
    return { ...execution, _id: result.insertedId };
  } catch (error) {
    console.error("Failed to record execution:", error);
    return null;
  }
}

export async function updateExecution(executionId: string, updates: Partial<TaskExecution>) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<TaskExecution> = db.collection("task_executions");

    await collection.updateOne(
      { _id: new ObjectId(executionId) },
      { $set: updates }
    );
  } catch (error) {
    console.error("Failed to update execution:", error);
  }
}

export async function getTaskExecutions(taskId: string, limit: number = 10): Promise<TaskExecution[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection: Collection<TaskExecution> = db.collection("task_executions");

    return await collection
      .find({ taskId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error("Failed to get task executions:", error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════
// SCHEDULER PROCESSOR (Run periodically)
// ══════════════════════════════════════════════════════════════════════

export async function processDueTasks(executeTask: (task: ScheduledTask) => Promise<string>): Promise<number> {
  const dueTasks = await getDueTasks();
  let processed = 0;

  for (const task of dueTasks) {
    try {
      // Record execution
      const execution = await recordExecution({
        taskId: task._id!.toString(),
        userId: task.userId,
        status: "running",
        startedAt: new Date(),
      });

      // Execute the task
      const result = await executeTask(task);

      // Update execution
      if (execution?._id) {
        await updateExecution(execution._id.toString(), {
          status: "success",
          result,
          completedAt: new Date(),
        });
      }

      // Update task
      const nextRun = calculateNextRun(task.schedule, new Date());
      const shouldDisable = task.schedule.type === "once";

      await updateScheduledTask(task._id!.toString(), task.userId, {
        lastRun: new Date(),
        nextRun: shouldDisable ? undefined : nextRun,
        runCount: task.runCount + 1,
        lastResult: result,
        lastStatus: "success",
        enabled: !shouldDisable,
      });

      processed++;
    } catch (error: any) {
      console.error(`Failed to execute scheduled task ${task._id}:`, error);

      const execution = await recordExecution({
        taskId: task._id!.toString(),
        userId: task.userId,
        status: "error",
        error: error.message,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      await updateScheduledTask(task._id!.toString(), task.userId, {
        lastRun: new Date(),
        nextRun: calculateNextRun(task.schedule, new Date()),
        lastStatus: "error",
        lastResult: error.message,
      });
    }
  }

  return processed;
}

// ══════════════════════════════════════════════════════════════════════
// QUICK CREATE HELPERS
// ══════════════════════════════════════════════════════════════════════

export async function scheduleDailyTask(userId: string, name: string, prompt: string, time: string = "09:00") {
  return createScheduledTask({
    userId,
    name,
    prompt,
    schedule: { type: "daily", time },
    enabled: true,
  });
}

export async function scheduleWeeklyTask(userId: string, name: string, prompt: string, dayOfWeek: number = 1, time: string = "09:00") {
  return createScheduledTask({
    userId,
    name,
    prompt,
    schedule: { type: "weekly", dayOfWeek, time },
    enabled: true,
  });
}

export async function scheduleOnce(userId: string, name: string, prompt: string) {
  return createScheduledTask({
    userId,
    name,
    prompt,
    schedule: { type: "once" },
    enabled: true,
  });
}

export async function scheduleInterval(userId: string, name: string, prompt: string, intervalMinutes: number = 60) {
  return createScheduledTask({
    userId,
    name,
    prompt,
    schedule: { type: "interval", interval: intervalMinutes },
    enabled: true,
  });
}
