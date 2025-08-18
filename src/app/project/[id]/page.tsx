import React from "react";
import { getProject } from "@/lib/actions/project";
import Project from "./Project";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const [project, error] = await getProject(id);

  if (error) {
    return <div className="p-4 bg-red-600 text-white text-center">{error}</div>;
  }

  return <Project project={project}></Project>;
}
