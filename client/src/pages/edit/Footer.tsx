import React from "react";
import { useMainStore } from "../../stores/useMainStore";
import { Label } from "@/components/ui/label";

const Footer: React.FC = () => {
  const selectedFile = useMainStore((state) => state.selectedFile);
  const lastPublish = useMainStore((state) => state.lastPublish);

  return (
    <footer className="flex items-center justify-between p-4 border-t border-gray-700">
      <Label>File: {selectedFile}</Label>
      <Label>© 2025 ѣ</Label>
      <Label>
        Last published: {lastPublish ? lastPublish : "Not published yet"}
      </Label>
    </footer>
  );
};

export default Footer;
