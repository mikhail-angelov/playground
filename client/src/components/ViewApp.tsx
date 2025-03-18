import React, { useEffect } from "react";
import {
  useParams,
} from "react-router-dom";

import ViewHeader from "./ViewHeader";
import ViewProject from "./ViewProject";
import ViewFooter from "./ViewFooter";
import { useMainStore } from "../stores/useMainStore";

const ViewApp: React.FC = () => {
  const loadFileContents = useMainStore((state) => state.loadFileContents);
  const triggerPreview = useMainStore((state) => state.triggerPreview);

  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      console.log(`Viewing project with ID: ${id}`);
      loadFileContents(id).then(triggerPreview);
    }
  }, [id]);

  return (
    <div className="flex flex-col h-screen">
      <ViewHeader />
      <ViewProject projectId={id || ""} />
      <ViewFooter />
    </div>
  );
};

export default ViewApp;
