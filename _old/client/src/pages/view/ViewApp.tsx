import React, { useEffect } from "react";
import ViewProject from "./ViewProject";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useActiveStore } from "@/stores/useActiveStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trans } from "@lingui/react/macro";

const ViewApp: React.FC = () => {
  const name = useActiveStore((state) => state.name);
  const projectId = useActiveStore((state) => state.projectId);
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/edit/${projectId}`);
  };

  useEffect(() => {
    if (!projectId) {
      navigate("/"); // Redirect to home if no projectId is available
    }
  }, [projectId, navigate]);

  return (
    <div className="flex flex-col h-screen">
      {/* Open Graph Meta Tags */}
        <title>{name || "Project Viewer"}</title>
        <meta property="og:title" content={name || "Project Viewer"} />
        <meta
          property="og:description"
          content="Check out this project"
        />
        <meta property="og:image" content={"https://www.drawingforall.net/wp-content/uploads/2018/02/5-How-to-draw-a-pen.jpg"} />
        <meta property="og:url" content={`${window.location.origin}/view/${projectId}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      
      <Header
        center={<h1 className="text-lg">{name}</h1>}
        right={
          <Button variant="outline" onClick={handleEdit}>
            <Trans>Edit</Trans>
          </Button>
        }
      />
      <ViewProject />
      <Footer />
    </div>
  );
};

export default ViewApp;