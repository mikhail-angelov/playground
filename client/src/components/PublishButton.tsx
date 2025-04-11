import React, { useState } from "react";
import html2canvas from "html2canvas";
import { useActiveStore } from "../stores/useActiveStore";
import { useAuthStore } from "../stores/useAuthStore";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Trans } from "@lingui/react/macro";
import PublishedUrlModal from "@/components/PublishedUrlModal";

const PublishButton: React.FC = () => {
  const setError = useActiveStore((state) => state.setError);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const userEmail = useAuthStore((state) => state.email);

  const handlePublish = async () => {
    if (!userEmail) {
      toast.error("Please login to publish the project.");
      return;
    }
    try {
      const iframe = document.querySelector("iframe");
      if (iframe && iframe.contentDocument) {
        const iframeBody = iframe.contentDocument.body;

        const canvas = await html2canvas(iframeBody, {
          useCORS: true,
          logging: true,
          scale: 1,
          backgroundColor: '#888',
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
        <Trans>Publish</Trans>
      </Button>

      {!!image && <PublishedUrlModal
        onClose={() => setImage(null)}
        image={image}
      />}
    </>
  );
};

export default PublishButton;
