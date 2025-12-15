"use client";
import React, { useEffect, useState } from "react";
import LeftPanel from "./LeftPanel";
import EditorPanel from "./EditorPanel";
import PreviewPanel from "./PreviewPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import AiPanel from "./AiPanel";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, SparklesIcon } from "lucide-react";

export enum UI_STATE {
  PREVIEW = "preview",
  AI = "ai",
}

export default function Main({ project }: any) {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(100);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(100);
  const [windowSize, setWindowSize] = useState({
    width: window?.innerWidth,
    height: window?.innerHeight,
  });
  const [uiState, setUIState] = useState(UI_STATE.PREVIEW);
  const { selectedFile } = useProjectStore((state) => state);

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
    (windowSize.width * (100 - leftPanelWidth - previewPanelWidth)) / 100,
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
        <EditorPanel key={selectedFile} width={editorPanelWidth} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        onResize={(width) => setPreviewPanelWidth(width)}
        defaultSize={36}
        maxSize={isPreviewCollapsed ? 3 : 100}
        minSize={isPreviewCollapsed ? 3 : 30}
      >
        {isPreviewCollapsed ? (
          <div className="bg-gray-900 border-l border-gray-700 flex flex-col">
            <Button
              variant="ghost"
              onClick={() => setIsPreviewCollapsed(false)}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Preview and AI Tabs */}
            <div className="flex items-center bg-gray-800 px-2 py-1">
              <Button
                onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                variant="ghost"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </Button>
              <Button
                onClick={() => setUIState(UI_STATE.PREVIEW)}
                variant={uiState === UI_STATE.PREVIEW ? "default" : "outline"}
              >
                Preview
              </Button>

              {project.hasAi && (
                <Button
                  onClick={() => setUIState(UI_STATE.AI)}
                  variant={uiState === UI_STATE.AI ? "default" : "outline"}
                  className="ml-2"
                >
                  <SparklesIcon />
                  AI
                </Button>
              )}
            </div>
            {uiState === UI_STATE.PREVIEW ? (
              <PreviewPanel project={project} />
            ) : (
              <AiPanel />
            )}
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
