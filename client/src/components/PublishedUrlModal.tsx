import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useActiveStore } from "@/stores/useActiveStore";
import { Trans } from "@lingui/react/macro";
import { CopyIcon } from "lucide-react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import getCroppedImg from "@/lib/cropImage";

interface PublishedUrlModalProps {
  onClose: () => void;
  image: HTMLImageElement | null;
}

const PublishedUrlModal: React.FC<PublishedUrlModalProps> = ({
  onClose,
  image,
}) => {
  const uploadFiles = useActiveStore((state) => state.uploadFiles);
  const setError = useActiveStore((state) => state.setError);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [antsOffset, setAntsOffset] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState("");

  const drawSelection = useCallback(() => {
    if (canvasRef.current && cropStart && cropEnd) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear only the selection rectangle area
        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        image && ctx.drawImage(image, 0, 0);

        ctx.setLineDash([5, 5]); // Dashed line
        ctx.lineDashOffset = -antsOffset; // Animate the dashes
        ctx.strokeStyle = "pink";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      }
    } else if (canvasRef.current && image) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        ctx.drawImage(image, 0, 0);
      }
    }
  }, [cropStart, cropEnd, antsOffset]);

  // Animate the marching ants
  useEffect(() => {
    let animationFrameId: number;

    // Set the canvas size
    if (canvasRef.current && image) {
      canvasRef.current.width = image.width;
      canvasRef.current.height = image.height;
      drawSelection();
    }

    const animate = () => {
      setAntsOffset((prev) => (prev + 1) % 35); // Update the offset for marching ants
      drawSelection(); // Redraw the selection
      animationFrameId = requestAnimationFrame(animate); // Schedule the next frame
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId); // Cancel the animation when the component unmounts or modal closes
    };
  }, [image, canvasRef.current, drawSelection]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCropStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setCropEnd(null); // Reset cropEnd
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && cropStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setCropEnd({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePublish = async () => {
    if (!image || !cropStart || !cropEnd) return;

    try {
      // Crop the selected area
      const croppedImage = await getCroppedImg(image, {
        x: Math.min(cropStart.x, cropEnd.x),
        y: Math.min(cropStart.y, cropEnd.y),
        width: Math.abs(cropEnd.x - cropStart.x),
        height: Math.abs(cropEnd.y - cropStart.y),
      });

      // Upload the cropped image
      const { success, url = "" } = await uploadFiles(croppedImage);

      if (success) {
        setPublishedUrl(url); // Set the published URL
      } else {
        setError("Failed to publish the project. Please try again.");
      }
    } catch (err) {
      console.error("Error during cropping or publishing:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(publishedUrl);
  };

  const handleView = () => {
    window.open(publishedUrl, "_blank"); // Open the URL in a new tab
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Trans>Published URL</Trans>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center flex-col w-full">
          <div className="my-4">
            <canvas
              ref={canvasRef}
              className="border shadow w-full h-auto"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
          {publishedUrl && (
            <div className="flex items-center flex-wrap w-full">
              <div
                className="flex-1 mr-2 text-ellipsis overflow-hidden whitespace-nowrap"
                title={publishedUrl}
              >
                {publishedUrl}
              </div>
              <Button onClick={handleCopyToClipboard} variant="outline" title="Copy to clipboard">
                <CopyIcon className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          {!publishedUrl && (
            <Button onClick={handlePublish}>
              <Trans>Publish</Trans>
            </Button>
          )}
          <Button onClick={handleView} title="Open in new tab">
            <Trans>View</Trans>
          </Button>
          <Button onClick={onClose} variant="destructive">
            <Trans>Close</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishedUrlModal;
