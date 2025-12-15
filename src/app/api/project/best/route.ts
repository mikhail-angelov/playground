import { NextResponse } from "next/server";
import { getTopProjects } from "@/services/projectService";

export async function GET() {
  const projects = await getTopProjects(9);
  return NextResponse.json(projects);
}
