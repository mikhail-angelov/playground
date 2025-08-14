import React from "react";
import { getUser } from "@/services/authService";
import { getMyProjects } from "@/services/projectsService";
import ProjectList from "../top/ProjectList";
import Header from "@/components/Header";
import LinkButton from "@/components/LinkButton";
import AuthButtons from "@/components/AuthButtons";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function MyProjectsPage() {
  // Get current user from cookie/JWT
  const user = await getUser();
  if (!user || user.error || !user.id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#18191a] text-white">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="mb-4">You must be logged in to view your projects.</p>
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
            <LinkButton href="/project/new">New</LinkButton>
            <AuthButtons />
          </div>
        }
      />
      <div className="flex flex-col items-center flex-1 overflow-hidden">
        <h2 className="text-2xl font-bold mt-8 mb-4">My Projects</h2>
        <ProjectList projects={myProjects} />
      </div>
      <Footer />
    </div>
  );
}
