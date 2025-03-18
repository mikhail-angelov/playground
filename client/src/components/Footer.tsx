import React from "react";
import { useMainStore } from "../stores/useMainStore";

const Footer: React.FC = () => {
  const selectedFile = useMainStore((state) => state.selectedFile);
  const lastPublish = useMainStore((state) => state.lastPublish);

  return (
    <footer className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <span>File: {selectedFile}</span>
      <p>© 2025 Playground</p>
      <span>
        Last published: {lastPublish ? lastPublish : "Not published yet"}
      </span>
    </footer>
  );
};

export default Footer;
