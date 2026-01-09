"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import HomeButton from "@/components/HomeButton";
import AuthButtons from "@/components/AuthButtons";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import * as fabric from "fabric";
import {
  Square,
  Type,
  ArrowUpRight,
  Image as ImageIcon,
  Download,
  Trash2,
  MousePointer2,
  Layers,
  Crop,
  Undo2,
  Redo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [isCropActive, setIsCropActive] = useState(false);
  const cropRectRef = useRef<fabric.Rect | null>(null);

  // History State
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isHistoryLoading = useRef(false);
  const maxHistory = 50;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on("selection:updated", (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on("selection:cleared", () => setSelectedObject(null));

    canvas.on("object:added", () => {
      const cropRect = canvas.getObjects().find((obj: any) => obj.isCropRect);
      if (cropRect) {
        canvas.bringObjectToFront(cropRect);
      }
      saveHistory();
    });

    canvas.on("object:modified", () => saveHistory());
    canvas.on("object:removed", () => saveHistory());

    const handleResize = () => {
      if (containerRef.current && fabricRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        fabricRef.current.setDimensions({ width: clientWidth, height: clientHeight });
        fabricRef.current.renderAll();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Initial state save
    saveHistory();

    return () => {
      canvas.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, []); // Run only ONCE

  // Separate useEffect for keyboard shortcuts to avoid re-initializing canvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or IText is editing
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (fabricRef.current?.getActiveObject()?.type === 'i-text' && (fabricRef.current?.getActiveObject() as any).isEditing)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isZ = e.key.toLowerCase() === 'z';
      const isUndo = isZ && (isMac ? e.metaKey : e.ctrlKey);
      const isRedo = isUndo && e.shiftKey;

      if (isRedo) {
        redo();
        e.preventDefault();
      } else if (isUndo) {
        undo();
        e.preventDefault();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        deleteSelected();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack]); // Re-bind shortcuts when history changes

  const saveHistory = () => {
    if (!fabricRef.current || isHistoryLoading.current) return;
    // We store the canvas state as a JSON string
    // We include custom properties like isCropRect
    const json = JSON.stringify(fabricRef.current.toJSON());

    setUndoStack(prev => {
      const last = prev[prev.length - 1];
      if (last === json) return prev; // Don't save if no change
      const newStack = [...prev, json].slice(-maxHistory);
      return newStack;
    });
    setRedoStack([]);
  };

  const undo = async () => {
    if (!fabricRef.current || undoStack.length <= 1) return;

    isHistoryLoading.current = true;
    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, current]);
    setUndoStack(prev => prev.slice(0, -1));

    await fabricRef.current.loadFromJSON(JSON.parse(previous));

    // Restore cropRectRef if it exists in the loaded state
    const cropRect = fabricRef.current.getObjects().find((obj: any) => obj.isCropRect) as fabric.Rect;
    if (cropRect) {
      cropRectRef.current = cropRect;
      setIsCropActive(true);
    } else {
      cropRectRef.current = null;
      setIsCropActive(false);
    }

    fabricRef.current.renderAll();
    isHistoryLoading.current = false;
  };

  const redo = async () => {
    if (!fabricRef.current || redoStack.length === 0) return;

    isHistoryLoading.current = true;
    const next = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));

    await fabricRef.current.loadFromJSON(JSON.parse(next));

    // Restore cropRectRef if it exists in the loaded state
    const cropRect = fabricRef.current.getObjects().find((obj: any) => obj.isCropRect) as fabric.Rect;
    if (cropRect) {
      cropRectRef.current = cropRect;
      setIsCropActive(true);
    } else {
      cropRectRef.current = null;
      setIsCropActive(false);
    }

    fabricRef.current.renderAll();
    isHistoryLoading.current = false;
  };

  const toggleCrop = () => {
    if (!fabricRef.current) return;

    if (isCropActive) {
      if (cropRectRef.current) {
        fabricRef.current.remove(cropRectRef.current);
        cropRectRef.current = null;
      }
      setIsCropActive(false);
    } else {
      const cropRect = new fabric.Rect({
        left: 50,
        top: 50,
        width: 300,
        height: 300,
        fill: "transparent",
        stroke: "#22c55e",
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        cornerColor: "#22c55e",
        cornerSize: 8,
        transparentCorners: false,
        hasRotatingPoint: false,
        selectable: true,
      });
      (cropRect as any).isCropRect = true;
      cropRect.set({ originX: 'left', originY: 'top' });
      fabricRef.current.add(cropRect);
      fabricRef.current.bringObjectToFront(cropRect);
      fabricRef.current.setActiveObject(cropRect);
      cropRectRef.current = cropRect;
      setIsCropActive(true);
    }
  };

  const clearCanvas = () => {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects().forEach(obj => {
      if (!(obj as any).isCropRect) {
        fabricRef.current?.remove(obj);
      }
    });
    fabricRef.current.renderAll();
  };

  const addRect = () => {
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: "rgba(59, 130, 246, 0.5)",
      width: 100,
      height: 100,
      stroke: "#2563eb",
      strokeWidth: 2,
    });
    fabricRef.current?.add(rect);
    fabricRef.current?.setActiveObject(rect);
  };

  const addText = () => {
    const text = new fabric.IText("Double click to edit", {
      left: 100,
      top: 100,
      fontSize: 20,
      fill: "#000000",
    });
    fabricRef.current?.add(text);
    fabricRef.current?.setActiveObject(text);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result as string;
      const img = await fabric.FabricImage.fromURL(data);
      img.scaleToWidth(200);
      fabricRef.current?.add(img);
      fabricRef.current?.centerObject(img);
      fabricRef.current?.setActiveObject(img);
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const activeObjects = fabricRef.current?.getActiveObjects();
    if (activeObjects) {
      const objectsToRemove = activeObjects.filter(obj => !(obj as any).isCropRect);
      if (objectsToRemove.length > 0) {
        fabricRef.current?.remove(...objectsToRemove);
        fabricRef.current?.discardActiveObject();
        fabricRef.current?.renderAll();
      }
    }
  };

  const updateProperty = (prop: string, value: any) => {
    if (selectedObject) {
      selectedObject.set(prop as keyof fabric.Object, value);
      fabricRef.current?.renderAll();
    }
  };

  const exportCanvas = async () => {
    if (!fabricRef.current) return;

    // Determine export options (full canvas or crop area)
    let exportOptions: any = {
      format: "png",
      multiplier: 2,
    };

    const isCropVisible = isCropActive && cropRectRef.current;

    if (isCropVisible && cropRectRef.current) {
      const rect = cropRectRef.current;
      // Hide crop rect for export
      const originalVisible = rect.visible;
      rect.set("visible", false);
      fabricRef.current.discardActiveObject(); // Deselect everything to avoid selection boxes in export
      fabricRef.current.renderAll();

      // Use getBoundingRect to get accurate absolute coordinates and dimensions
      const boundingRect = rect.getBoundingRect();
      exportOptions = {
        ...exportOptions,
        left: boundingRect.left,
        top: boundingRect.top,
        width: boundingRect.width,
        height: boundingRect.height,
      };

      const dataURL = fabricRef.current.toDataURL(exportOptions);

      // Restore visibility
      rect.set("visible", originalVisible);
      fabricRef.current.renderAll();

      await triggerDownload(dataURL);
    } else {
      const dataURL = fabricRef.current.toDataURL(exportOptions);
      await triggerDownload(dataURL);
    }
  };

  const triggerDownload = async (dataURL: string) => {
    // Try to use File System Access API for "Save As" experience
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'image-editor-export.png',
          types: [{
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] },
          }],
        });

        const writable = await handle.createWritable();
        const response = await fetch(dataURL);
        const blob = await response.blob();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Save File Picker failed, falling back", err);
      }
    }

    // Fallback: Standard download
    const link = document.createElement("a");
    link.download = "image-editor-export.png";
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Image Editor</span>
            </div>
          </div>
        }
        right={
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={undo}
                disabled={undoStack.length <= 1}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={redo}
                disabled={redoStack.length === 0}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportCanvas} className="bg-blue-600 hover:bg-blue-700 border-none text-white">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <AuthButtons />
          </div>
        }
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Sidebar - Tools */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={20} className="border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <div className="p-4 flex flex-col space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={() => fabricRef.current?.setViewportTransform([1, 0, 0, 1, 0, 0])}>
                <MousePointer2 className="w-6 h-6" />
                <span className="text-[10px]">Select</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={addText}>
                <Type className="w-6 h-6" />
                <span className="text-[10px]">Text</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={addRect}>
                <Square className="w-6 h-6" />
                <span className="text-[10px]">Rect</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={() => {/* Arrow logic */ }}>
                <ArrowUpRight className="w-6 h-6" />
                <span className="text-[10px]">Arrow</span>
              </Button>
              <Button variant="ghost" className={`flex flex-col h-20 space-y-2 hover:bg-zinc-800 ${isCropActive ? 'bg-zinc-800 text-green-400' : ''}`} onClick={toggleCrop}>
                <Crop className="w-6 h-6" />
                <span className="text-[10px]">Crop</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={deleteSelected}>
                <Trash2 className="w-6 h-6 text-red-400" />
                <span className="text-[10px]">Delete</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-20 space-y-2 hover:bg-zinc-800" onClick={clearCanvas}>
                <Layers className="w-6 h-6 text-zinc-400" />
                <span className="text-[10px]">Clear</span>
              </Button>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer transition-all group">
                <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 mb-2" />
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-medium">Upload Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />

        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={65} className="bg-zinc-950 flex flex-col">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8" ref={containerRef}>
            <div className="shadow-2xl border border-zinc-800 rounded-sm bg-white overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />

        {/* Properties Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-l border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <div className="p-4 flex flex-col space-y-6">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center">
              <Layers className="w-3 h-3 mr-2" /> Properties
            </h3>

            {selectedObject ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-zinc-400 uppercase">Position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500">X</span>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.left || 0)}
                        className="h-8 bg-zinc-800 border-zinc-700"
                        onChange={(e) => updateProperty("left", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500">Y</span>
                      <Input
                        type="number"
                        value={Math.round(selectedObject.top || 0)}
                        className="h-8 bg-zinc-800 border-zinc-700"
                        onChange={(e) => updateProperty("top", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-zinc-400 uppercase">Size</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500">Scale X</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={parseFloat((selectedObject.scaleX || 1).toFixed(2))}
                        className="h-8 bg-zinc-800 border-zinc-700"
                        onChange={(e) => updateProperty("scaleX", parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500">Scale Y</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={parseFloat((selectedObject.scaleY || 1).toFixed(2))}
                        className="h-8 bg-zinc-800 border-zinc-700"
                        onChange={(e) => updateProperty("scaleY", parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-zinc-400 uppercase">Rotation</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.angle || 0)}
                    className="h-8 bg-zinc-800 border-zinc-700"
                    onChange={(e) => updateProperty("angle", parseInt(e.target.value))}
                  />
                </div>

                {selectedObject.type === "i-text" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] text-zinc-400 uppercase">Text Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        value={typeof selectedObject.fill === "string" ? selectedObject.fill : "#000000"}
                        className="h-8 w-12 p-0 bg-transparent border-none"
                        onChange={(e) => updateProperty("fill", e.target.value)}
                      />
                      <span className="text-xs font-mono">{typeof selectedObject.fill === "string" ? selectedObject.fill : "Complex"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-20 text-center space-y-2">
                <MousePointer2 className="w-10 h-10 text-zinc-800" />
                <p className="text-sm text-zinc-600">Select an element to<br />view its properties</p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

