import React, { useEffect, useState } from "react";
import LeftPanel from "./LeftPanel";
import EditorPanel from "./EditorPanel";
import PreviewPanel from "./PreviewPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const Main: React.FC = () => {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(100);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(100);
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

  const editorPanelWidth = Math.round(
    (windowSize.width * (100 - leftPanelWidth - previewPanelWidth)) / 100
  );

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        onResize={(width) => setLeftPanelWidth(width)}
        defaultSize={16}
        maxSize={isLeftPanelCollapsed ? 3 : 100}
        minSize={isLeftPanelCollapsed ? 3 : 16}
      >
        <LeftPanel
          isCollapsed={isLeftPanelCollapsed}
          toggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <EditorPanel width={editorPanelWidth} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        onResize={(width) => setPreviewPanelWidth(width)}
        defaultSize={36}
        maxSize={isPreviewCollapsed ? 3 : 100}
        minSize={isPreviewCollapsed ? 3 : 30}
      >
        <PreviewPanel
          isCollapsed={isPreviewCollapsed}
          toggleCollapse={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Main;
