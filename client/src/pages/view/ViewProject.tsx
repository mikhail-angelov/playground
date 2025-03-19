import React from "react";
import { useMainStore } from "../../stores/useMainStore";

interface ViewProjectProps {
  projectId: string;
}

const ViewProject: React.FC<ViewProjectProps> = ({ projectId }) => {
  const preview = useMainStore((state) => state.preview);

  return (
    <div className="flex-1 bg-gray-100 p-4">
      <iframe
        title="Project Preview"
        srcDoc={preview}
        className="w-full h-full border"
      />
    </div>
  );
};

export default ViewProject;
