import { NextRequest, NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "anonymous-user";
    const projects = await getProjects(userId);
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "anonymous-user";
    const body = await req.json();
    const { name, description, emoji } = body;

    const newProject = await createProject({
      userId,
      name: name || "New Project",
      description: description || "",
      emoji: emoji || "📁"
    });


    return NextResponse.json(newProject);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
