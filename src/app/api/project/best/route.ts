import { NextResponse } from "next/server";
import { getTopProjects } from "@/services/projectService";

export async function GET() {
  // getTopProjects is a synchronous function, but you can make it async if needed
  const projects = await getTopProjects(9);
  return NextResponse.json(projects);
}
