"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";

import { LoaderIcon, CopyIcon, UploadIcon, XIcon, UndoIcon } from "lucide-react";
import React, { useRef, useState, useEffect, useCallback } from "react";
import getCroppedImg from "@/lib/cropImage";
import { optimizeImage, dataUrlToImage } from "@/lib/optimizeImage";
import { toast } from "sonner";

interface PublishedUrlModalProps {
  onClose: () => void;
  image: HTMLImageElement | null;
  projectId: string;
}

const PublishedUrlModal: React.FC<PublishedUrlModalProps> = ({
  onClose,
  image,
  projectId,
}) => {
  const { uploadFiles, setError, isLoading } = useProjectStore(
    (state) => state,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [antsOffset, setAntsOffset] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(
    image,
  );
  const [previousImage, setPreviousImage] = useState<HTMLImageElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
  }, [currentImage, drawSelection]);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      // Store current image as previous for revert functionality
      if (currentImage) {
        setPreviousImage(currentImage);
      }

      // Optimize the image (resize and compress)
      const optimizedDataUrl = await optimizeImage(file);
      const optimizedImage = await dataUrlToImage(optimizedDataUrl);
      
      setCurrentImage(optimizedImage);
      toast.success('Image uploaded and optimized successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload and optimize image');
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (currentImage) {
      setPreviousImage(currentImage);
      setCurrentImage(null);
      setCropStart(null);
      setCropEnd(null);
      toast.info('Image removed. You can revert or upload a new one.');
    }
  };

  const handleRevertToPrevious = () => {
    if (previousImage) {
      setCurrentImage(previousImage);
      setPreviousImage(null);
      toast.success('Reverted to previous image');
    }
  };

  const handlePublish = async () => {
    const imageToUse = currentImage || image;
    if (!imageToUse || !canvasRef.current) return;

    try {
      // Calculate the scale factors to map canvas coordinates to the original image
      const canvas = canvasRef.current;
      const canvasAspectRatio = canvas.width / canvas.height;
      const imageAspectRatio = imageToUse.width / imageToUse.height;

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
      const scaleX = imageToUse.width / drawWidth;
      const scaleY = imageToUse.height / drawHeight;

      let croppedImage = imageToUse.src;
      if (cropStart && cropEnd) {
        const cropX = (Math.min(cropStart.x, cropEnd.x) - offsetX) * scaleX;
        const cropY = (Math.min(cropStart.y, cropEnd.y) - offsetY) * scaleY;
        const cropWidth = Math.abs(cropEnd.x - cropStart.x) * scaleX;
        const cropHeight = Math.abs(cropEnd.y - cropStart.y) * scaleY;

        croppedImage = await getCroppedImg(imageToUse, {
          x: Math.max(0, cropX),
          y: Math.max(0, cropY),
          width: Math.min(imageToUse.width - cropX, cropWidth),
          height: Math.min(imageToUse.height - cropY, cropHeight),
        });
      }

      // Upload the cropped image
      const { success, url = "" } = await uploadFiles(projectId, croppedImage);

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
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-semibold text-zinc-100">Publish Preview</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_280px] min-h-0">
            {/* Left Column: Image Area */}
            <div className="flex-1 bg-black/40 p-4 flex flex-col items-center justify-center overflow-y-auto min-h-0">
              <div className="w-full max-w-full flex items-center justify-center">
                {currentImage ? (
                  <canvas
                    width={800}
                    height={800}
                    ref={canvasRef}
                    className="border border-zinc-800 shadow-2xl w-full h-auto max-h-[60vh] object-contain cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  />
                ) : (
                  <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center w-full max-w-md h-64 flex flex-col items-center justify-center bg-zinc-900/50">
                    <UploadIcon className="w-12 h-12 text-zinc-600 mb-4" />
                    <p className="text-zinc-400 font-medium mb-1">No preview image</p>
                    <p className="text-zinc-500 text-sm mb-6">
                      Upload an image or use the auto-generated one
                    </p>
                    <Button
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={isUploading || isLoading}
                      variant="outline"
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="border-l border-zinc-800 bg-zinc-900/30 p-6 flex flex-col h-full overflow-y-auto">
              {/* Top Section: Image Actions */}
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Preview Image</h3>
                
                <Button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isUploading || isLoading}
                  variant="outline"
                  className="w-full justify-start border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                >
                  <UploadIcon className="w-4 h-4 mr-3" />
                  {isUploading ? 'Uploading...' : 'Change Image'}
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading || isLoading}
                />

                {currentImage && (
                  <Button
                    onClick={handleRemoveImage}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full justify-start border-zinc-800 hover:bg-red-950/20 hover:text-red-400 text-zinc-300"
                  >
                    <XIcon className="w-4 h-4 mr-3" />
                    Remove Image
                  </Button>
                )}

                {previousImage && (
                  <Button
                    onClick={handleRevertToPrevious}
                    disabled={isLoading}
                    variant="ghost"
                    className="w-full justify-start text-zinc-500 hover:text-zinc-300"
                  >
                    <UndoIcon className="w-4 h-4 mr-3" />
                    Revert Change
                  </Button>
                )}

                <div className="mt-4 p-4 border border-zinc-800 bg-zinc-950/50 rounded-lg">
                  <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                    Tip: Drag on the image to crop. The crop will be used as the social share preview.
                  </p>
                </div>
              </div>

              {/* Bottom Section: Publish Actions */}
              <div className="mt-auto pt-6 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Actions</h3>
                
                {publishedUrl && (
                  <div className="mb-2 flex flex-col gap-2 w-full bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Published URL</div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 text-[11px] text-zinc-400 font-mono truncate bg-black/50 p-1.5 rounded border border-zinc-900" title={publishedUrl}>
                        {publishedUrl}
                      </div>
                      <Button
                        onClick={handleCopyToClipboard}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-white"
                        title="Copy to clipboard"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {!publishedUrl ? (
                  <Button 
                    onClick={handlePublish} 
                    disabled={isLoading || (!currentImage && !image)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
                  >
                    {isLoading ? 'Publishing...' : 'Publish Project'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleView} 
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-semibold h-11"
                  >
                    View Live Site
                  </Button>
                )}
                
                <Button 
                  onClick={onClose} 
                  variant="ghost"
                  className="w-full text-zinc-400 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PublishedUrlModal;
