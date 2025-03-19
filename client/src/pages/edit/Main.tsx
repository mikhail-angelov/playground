import React, { useEffect, useState } from "react";
import LeftPanel from "./LeftPanel";
import EditorPanel from "./EditorPanel";
import PreviewPanel from "./PreviewPanel";

const Main: React.FC = () => {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const leftPanelWidth = isLeftPanelCollapsed ? 20 : 300;
  const previewPanelWidth = isPreviewCollapsed ? 20 : 300;
  const editorPanelWidth =
    windowSize.width - leftPanelWidth - previewPanelWidth - 30; // 4px for the gap

  return (
    <main
      className="flex-grow px-2 bg-gray-900 grid grid-rows-1"
      style={{
        gridTemplateColumns: `${leftPanelWidth}px ${editorPanelWidth}px ${previewPanelWidth}px`,
        height: `${windowSize.height - 140}px`,
      }}
    >
      <LeftPanel
        isCollapsed={isLeftPanelCollapsed}
        toggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
      />
      <EditorPanel width={editorPanelWidth} />
      <PreviewPanel
        isCollapsed={isPreviewCollapsed}
        toggleCollapse={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
      />
    </main>
  );
};

export default Main;
