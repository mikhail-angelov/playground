import React from "react";
import ViewProject from "./ViewProject";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getProject } from "@/lib/actions/project";
import { composePreview } from "@/lib/actions/preview";

export default async function Page({ params }) {
  const { id } = await params;
  const [project, error] = await getProject(id);
  const preview = composePreview(project?.fileContents, project?.projectId);
  if (error) {
    return <div className="p-4 bg-red-600 text-white text-center">{error}</div>;
  }
  const name = project?.name;

  return (
    <div className="flex flex-col h-screen">
      {/* Open Graph Meta Tags */}
      <title>{name || "Project Viewer"}</title>
      <meta property="og:title" content={name || "Project Viewer"} />
      <meta property="og:description" content="Check out this project" />
      <meta
        property="og:image"
        content={
          "https://www.drawingforall.net/wp-content/uploads/2018/02/5-How-to-draw-a-pen.jpg"
        }
      />
      <meta property="og:url" content={`/view/${project?.projectId}`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />

      <Header
        center={<h1 className="text-lg">{name}</h1>}
        right={
          <Link href={`/project/${project?.projectId}`} passHref>
            <Button variant="outline">Edit</Button>
          </Link>
        }
      />
      <ViewProject preview={preview} />
      <Footer />
    </div>
  );
}
