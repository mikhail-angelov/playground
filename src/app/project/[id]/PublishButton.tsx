"use client";
import React, { useState } from "react";
import html2canvas from "html2canvas";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import PublishedUrlModal from "./PublishedUrlModal";

const PublishButton: React.FC = () => {
  const { setError } = useProjectStore((state) => state);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const handlePublish = async () => {
    try {
      const iframe = document.querySelector("iframe");
      if (iframe && iframe.contentDocument) {
        const iframeBody = iframe.contentDocument.body;

        const canvas = await html2canvas(iframeBody, {
          useCORS: true,
          logging: true,
          scale: 1,
          backgroundColor: "#888",
        });

        const imageSrc = canvas.toDataURL("image/png");
        const image = new Image();
        image.src = imageSrc;

        image.onload = () => setImage(image);
      } else {
        console.warn("Iframe element not found. Proceeding without an image.");
      }
    } catch (err) {
      console.error("Error during publish:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handlePublish}>
        Publish
      </Button>

      {!!image && (
        <PublishedUrlModal onClose={() => setImage(null)} image={image} />
      )}
    </>
  );
};

export default PublishButton;
