import React from "react";
import { getTopProjects } from "@/services/projectService";
import ProjectList from "./ProjectList";
import Header from "@/components/Header";
import LinkButton from "@/components/LinkButton";
import AuthButtons from "@/components/AuthButtons";
import Footer from "@/components/Footer";
import ProjectTabs from "./ProjectTabs";

const Top: React.FC = () => {
  const topProjects = getTopProjects(9);
  // const [activeTab, setActiveTab] = useState<"trends" | "myProjects">("trends");

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
        <ProjectTabs />
        <ProjectList projects={topProjects} />
      </div>
      <Footer />
    </div>
  );
};

export default Top;
