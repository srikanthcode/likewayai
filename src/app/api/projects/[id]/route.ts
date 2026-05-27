import { NextRequest, NextResponse } from "next/server";
import { deleteProject } from "@/lib/projects";
import { getHistory } from "@/lib/memory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const userId = req.headers.get("x-user-id") || "anonymous-user";

    
    // In this app, messages are stored in memory/mongodb separately from project metadata
    const history = await getHistory(userId, 100, projectId);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch project history" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await deleteProject(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
