import React from "react";

const ViewProject = ({ preview }: { preview: string }) => {
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
