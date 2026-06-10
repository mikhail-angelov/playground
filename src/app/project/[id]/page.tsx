import React from "react";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/project";
import Project from "./Project";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const [project, error] = await getProject(id);

  if (error || !project) {
    notFound();
  }

  return <Project project={project}></Project>;
}
