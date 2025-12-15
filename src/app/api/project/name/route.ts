import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 } from "uuid";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { getProject, updateProject } from "@/services/projectsService";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    const user = await getAuthUser(token);
    const body = await req.json();

    if (!body || typeof body !== "object" || !body.projectId || !body.name) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { name, projectId } = body;
    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 400 }
      );
    }
    const project = await getProject(projectId);
    if (project?.userId != userId) {
      return NextResponse.json(
        { error: "Unauthorized: No permissions to modify this project" },
        { status: 400 }
      );
    }

    const result = await updateProject(projectId, { name });

    return NextResponse.json(result);
  } catch (e) {
    console.error("upload error:", e);

    return NextResponse.json(
      { error: "Unauthorized: No token provided" },
      { status: 400 }
    );
  }
}
