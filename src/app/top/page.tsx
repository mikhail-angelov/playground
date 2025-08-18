import React from "react";
import ProjectList from "./ProjectList";
import Header from "@/components/Header";
import LinkButton from "@/components/LinkButton";
import AuthButtons from "@/components/AuthButtons";
import Footer from "@/components/Footer";
import ProjectTabs from "@/components/ProjectTabs";

const fetchTopProjects = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/project/best`, {
    next: { revalidate: 6000 }, // ISR: cache for 60 seconds
  });
  if (!res.ok) return [];
  const projects = await res.json();
  return projects;
};

const Top = async () => {
  const topProjects = await fetchTopProjects();

  return (
    <div className="flex flex-col h-screen">
      <Header
        right={
          <div className="flex items-center space-x-4">
            <LinkButton href="/project/new">New</LinkButton>
            <AuthButtons />
          </div>
        }
      />
      <div className="flex flex-col items-center flex-1 overflow-hidden">
        <ProjectTabs active="top" />
        <ProjectList projects={topProjects} />
      </div>
      <Footer />
    </div>
  );
};

export default Top;
