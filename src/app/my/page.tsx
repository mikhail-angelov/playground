import React from "react";
import { getUser } from "@/services/authService";
import { getMyProjects } from "@/services/projectsService";
import ProjectList from "../top/ProjectList";
import Header from "@/components/Header";
import LinkButton from "@/components/LinkButton";
import AuthButtons from "@/components/AuthButtons";
import Footer from "@/components/Footer";
import ProjectTabs from "@/components/ProjectTabs";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Get current user from cookie/JWT
  const user = await getUser();
  if (!user || user.error || !user.id) {
    return (
      <div className="flex flex-col h-screen bg-[#18191a] text-white">
        <Header
          right={
            <div className="flex items-center space-x-4">
              <LinkButton id="new-project" href="/project/new" aria-label="New project">New</LinkButton>
              <AuthButtons />
            </div>
          }
        />
        <main className="flex flex-col items-center justify-center h-screen bg-[#18191a] text-white" aria-labelledby="projects-unauthorized">
          <h1 id="projects-unauthorized" className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="mb-4">You must be logged in to view your projects.</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Get user's projects
  const myProjects = getMyProjects(user.id);

  return (
    <div className="flex flex-col h-screen bg-[#18191a] text-white">
      <Header
        right={
          <div className="flex items-center space-x-4">
            <LinkButton id="new-project" href="/project/new" aria-label="New project">New</LinkButton>
            <AuthButtons />
          </div>
        }
        center={<ProjectTabs active="my" />}
      />
      <main aria-label="My projects" className="flex flex-col items-center flex-1 overflow-hidden">
        <ProjectList projects={myProjects} label="My projects" />
      </main>
      <Footer />
    </div>
  );
}
