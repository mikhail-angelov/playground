import React from "react";
import { useActiveStore } from "../../stores/useActiveStore";

const ViewProject: React.FC = () => {
  const preview = useActiveStore((state) => state.preview);

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
