import React, { useState } from "react";
import html2canvas from "html2canvas";
import { useActiveStore } from "../stores/useActiveStore";
import { useAuthStore } from "../stores/useAuthStore";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Trans } from "@lingui/react/macro";
import PublishedUrlModal from "@/components/PublishedUrlModal";
import Cropper, { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

const PublishButton: React.FC = () => {
  const uploadFiles = useActiveStore((state) => state.uploadFiles);
  const setError = useActiveStore((state) => state.setError);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // State for crop position
  const [zoom, setZoom] = useState(1); // State for zoom level
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const userEmail = useAuthStore((state) => state.email);

  const handlePublish = async () => {
    if (!userEmail) {
      toast.error("Please login to publish the project.");
      return;
    }
    try {
      // Select the iframe element
      const iframe = document.querySelector("iframe");
      if (iframe && iframe.contentDocument) {
        const iframeBody = iframe.contentDocument.body;

        // Capture the iframe content as an image
        const canvas = await html2canvas(iframeBody, {
          useCORS: true,
          logging: true,
          scale: 1,
        });

        const image = canvas.toDataURL("image/png");
        setImageSrc(image); // Set the captured image for cropping
        setIsCropModalOpen(true); // Open the crop modal
      } else {
        console.warn("Iframe element not found. Proceeding without an image.");
      }
    } catch (err) {
      console.error("Error during publish:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  const handleCropComplete = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      // Crop the selected area
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Upload the cropped image
      const { success, url = "" } = await uploadFiles(croppedImage);

      if (success) {
        setPublishedUrl(url); // Set the published URL
        setIsCropModalOpen(false); // Close the crop modal
        setIsPublishedModalOpen(true); // Open the PublishedUrlModal
      } else {
        setError("Failed to publish the project. Please try again.");
      }
    } catch (err) {
      console.error("Error during cropping or publishing:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handlePublish}>
        <Trans>Publish</Trans>
      </Button>

      {/* Crop Modal */}
      {isCropModalOpen && imageSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative w-3/4 h-3/4 bg-white rounded shadow-lg">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1}
              minZoom={0.5} // Allow zoom levels below 1
              onCropChange={setCrop} // Update crop position dynamically
              onCropComplete={(_, croppedAreaPixels) =>
                setCroppedAreaPixels(croppedAreaPixels)
              }
              onZoomChange={setZoom} // Update zoom level dynamically
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsCropModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCropComplete}>Crop & Publish</Button>
            </div>
          </div>
        </div>
      )}

      {/* Published URL Modal */}
      <PublishedUrlModal
        isOpen={isPublishedModalOpen}
        onClose={() => setIsPublishedModalOpen(false)}
        url={publishedUrl}
      />
    </>
  );
};

export default PublishButton;