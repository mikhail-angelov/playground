import React from "react";
import { useActiveStore } from "@/lib/stores/useActiveStore";

const ViewProject: React.FC = () => {
  const getPreview = useActiveStore((state) => state.getPreview);
  const preview = getPreview(); // Get the preview HTML from the store

  return (
    <div className="flex-1 p-2">
      <iframe
        title="Project Preview"
        srcDoc={preview}
        className="w-full h-full"
      />
    </div>
  );
};

export default ViewProject;
