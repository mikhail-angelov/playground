import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useActiveStore } from "@/stores/useActiveStore";
import { Trans } from "@lingui/react/macro";
import { LoaderIcon, CopyIcon } from "lucide-react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import getCroppedImg from "@/lib/cropImage";
import { toast } from "sonner";

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
  const isLoading = useActiveStore((state) => state.isLoading);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [antsOffset, setAntsOffset] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(
    image
  );

  const drawSelection = useCallback(() => {
    if (canvasRef.current && currentImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate the aspect ratio and position to fit the image on the canvas
        const canvasAspectRatio = canvas.width / canvas.height;
        const imageAspectRatio = currentImage.width / currentImage.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imageAspectRatio > canvasAspectRatio) {
          // Image is wider than the canvas
          drawWidth = canvas.width;
          drawHeight = canvas.width / imageAspectRatio;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2; // Center vertically
        } else {
          // Image is taller than the canvas
          drawWidth = canvas.height * imageAspectRatio;
          drawHeight = canvas.height;
          offsetX = (canvas.width - drawWidth) / 2; // Center horizontally
          offsetY = 0;
        }

        // Draw the image on the canvas
        ctx.drawImage(currentImage, offsetX, offsetY, drawWidth, drawHeight);

        // If there's a selection, draw the selection rectangle
        if (cropStart && cropEnd) {
          const x = Math.min(cropStart.x, cropEnd.x);
          const y = Math.min(cropStart.y, cropEnd.y);
          const width = Math.abs(cropEnd.x - cropStart.x);
          const height = Math.abs(cropEnd.y - cropStart.y);

          ctx.setLineDash([5, 5]); // Dashed line
          ctx.lineDashOffset = -antsOffset; // Animate the dashes
          ctx.strokeStyle = "pink";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
        }
      }
    }
  }, [cropStart, cropEnd, antsOffset, currentImage]);

  // Animate the marching ants
  useEffect(() => {
    let animationFrameId: number;

    // Set the canvas size
    if (canvasRef.current && currentImage) {
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
  }, [currentImage, canvasRef.current, drawSelection]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && canvasRef.current) {
      const scaleX = canvasRef.current.width / rect.width; // Scale factor for X
      const scaleY = canvasRef.current.height / rect.height; // Scale factor for Y

      setCropStart({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
      setCropEnd(null); // Reset cropEnd
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && cropStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && canvasRef.current) {
        const scaleX = canvasRef.current.width / rect.width; // Scale factor for X
        const scaleY = canvasRef.current.height / rect.height; // Scale factor for Y

        setCropEnd({
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePublish = async () => {
    if (!image || !canvasRef.current) return;

    try {
      // Calculate the scale factors to map canvas coordinates to the original image
      const canvas = canvasRef.current;
      const canvasAspectRatio = canvas.width / canvas.height;
      const imageAspectRatio = image.width / image.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imageAspectRatio > canvasAspectRatio) {
        // Image is wider than the canvas
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspectRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2; // Center vertically
      } else {
        // Image is taller than the canvas
        drawWidth = canvas.height * imageAspectRatio;
        drawHeight = canvas.height;
        offsetX = (canvas.width - drawWidth) / 2; // Center horizontally
        offsetY = 0;
      }

      // Map the selection coordinates from the canvas to the original image
      const scaleX = image.width / drawWidth;
      const scaleY = image.height / drawHeight;

      let croppedImage = image.src;
      if (cropStart && cropEnd) {
        const cropX = (Math.min(cropStart.x, cropEnd.x) - offsetX) * scaleX;
        const cropY = (Math.min(cropStart.y, cropEnd.y) - offsetY) * scaleY;
        const cropWidth = Math.abs(cropEnd.x - cropStart.x) * scaleX;
        const cropHeight = Math.abs(cropEnd.y - cropStart.y) * scaleY;

        croppedImage = await getCroppedImg(image, {
          x: Math.max(0, cropX),
          y: Math.max(0, cropY),
          width: Math.min(image.width - cropX, cropWidth),
          height: Math.min(image.height - cropY, cropHeight),
        });
      }

      // Upload the cropped image
      const { success, url = "" } = await uploadFiles(croppedImage);

      if (success) {
        setPublishedUrl(url);

        const newImage = new Image();
        newImage.src = croppedImage;
        newImage.onload = () => {
          setCurrentImage(newImage);
        };

        // Clear the selection
        setCropStart(null);
        setCropEnd(null);
      } else {
        setError("Failed to publish the project. Please try again.");
      }
    } catch (err) {
      console.error("Error during cropping or publishing:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      toast.success("URL copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error("Failed to copy URL. Please try again.");
    }
  };

  const handleView = () => {
    window.open(publishedUrl, "_blank"); // Open the URL in a new tab
  };

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-500">
          <LoaderIcon className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Select part of image to crop for preview</Trans>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center flex-col w-full">
            <div className="my-4">
              <canvas
                width={400}
                height={400}
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
                <Button
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  title="Copy to clipboard"
                >
                  <CopyIcon className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            {!publishedUrl && (
              <Button onClick={handlePublish} disabled={isLoading}>
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
    </>
  );
};

export default PublishedUrlModal;
