import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import React from "react";

interface PublishedUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

const PublishedUrlModal: React.FC<PublishedUrlModalProps> = ({
  isOpen,
  onClose,
  url,
}) => {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(url);
  };

  const handleView = () => {
    window.open(url, "_blank"); // Open the URL in a new tab
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Published URL</DialogTitle>
          <DialogDescription>{url}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleCopyToClipboard} variant="outline">
            Copy to Clipboard
          </Button>
          <Button onClick={handleView}>View</Button>
          <Button onClick={onClose} variant="destructive">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishedUrlModal;
