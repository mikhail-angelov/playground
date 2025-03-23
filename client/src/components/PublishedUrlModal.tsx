import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Trans } from "@lingui/react/macro";
import { CopyIcon} from "lucide-react";
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
          <DialogTitle>
            <Trans>Published URL</Trans>
          </DialogTitle>
          <DialogDescription className="flex items-center">
            <div className="flex-1 mr-2">{url}</div>
            <Button onClick={handleCopyToClipboard} variant="outline">
              <CopyIcon className="w-6 h-6" />
            </Button>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleView}>
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
