"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import HomeButton from "@/components/HomeButton";
import AuthButtons from "@/components/AuthButtons";
import Header from "@/components/Header";
import {
  Image as ImageIcon,
  Download,
  Upload,
  Box,
  Cylinder,
  Circle,
  Square,
  RotateCw,
  Move,
  ZoomIn,
  Undo2,
  Redo2,
  Settings,
  Trash2,
  Copy,
  Minus,
  Plus,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Three.js and React Three Fiber imports
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  TransformControls,
  Text,
  Grid,
} from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import { OBJLoader } from "three-stdlib";
import * as THREE from "three";

// Define types for 3D objects
type CadObject = {
  id: string;
  name: string;
  type: "cube" | "sphere" | "cylinder" | "imported";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  geometry?: THREE.BufferGeometry;
  color: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  selectedFaceIndex?: number | null;
  vertices?: THREE.Vector3[];
  faces?: number[];
};

// Individual 3D object component with ref management
const Object3DWithRef = React.forwardRef<
  THREE.Mesh,
  {
    object: CadObject;
    isSelected: boolean;
    onSelect: () => void;
    onFaceSelect?: (faceIndex: number) => void;
  }
>(({ object, isSelected, onSelect, onFaceSelect }, ref) => {
  let geometry: THREE.BufferGeometry;

  if (object.type === "imported" && object.geometry) {
    geometry = object.geometry;
  } else {
    switch (object.type) {
      case "cube":
        geometry = new THREE.BoxGeometry(
          object.dimensions.width,
          object.dimensions.height,
          object.dimensions.depth
        );
        break;
      case "sphere":
        geometry = new THREE.SphereGeometry(
          object.dimensions.width / 2,
          32,
          32
        );
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(
          object.dimensions.width / 2,
          object.dimensions.width / 2,
          object.dimensions.height,
          32
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(100, 100, 100);
    }
  }

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={(e) => {
        e.stopPropagation();

        // Check if we're clicking on a face and onFaceSelect is provided
        if (onFaceSelect && e.faceIndex !== undefined && e.faceIndex !== null) {
          console.log(
            `Face click detected! faceIndex: ${e.faceIndex}, object: ${object.name}, type: ${object.type}`
          );

          // Calculate face index from triangle index
          // For cube: 12 triangles (2 per face) => 6 faces (0-5)
          let faceIndex = Math.floor(e.faceIndex / 2);

          // Handle different geometry types
          if (object.type === "sphere") {
            // Spheres have many faces, just use a simplified approach
            faceIndex = e.faceIndex % 32; // Group by longitudinal segments
          } else if (object.type === "cylinder") {
            // Cylinders: side faces + top/bottom caps
            faceIndex = e.faceIndex % 32; // Simplified
          }

          // Ensure faceIndex is within reasonable bounds for display
          if (object.type === "cube") {
            faceIndex = Math.min(5, Math.max(0, faceIndex)); // 0-5 for cube faces
          }

          console.log(`Calculated face index: ${faceIndex}`);
          onFaceSelect(faceIndex);
        } else {
          console.log(`Object click detected (no face index): ${object.name}`);
          onSelect();
        }
      }}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={isSelected ? "#fbbf24" : object.color}
        metalness={0.2}
        roughness={0.8}
      />

      {/* Highlight selected face if this object has one */}
      {object.selectedFaceIndex !== null &&
        object.selectedFaceIndex !== undefined && (
          <mesh
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            raycast={undefined} // This prevents the highlight from blocking clicks
          >
            <boxGeometry
              args={[
                object.dimensions.width + 2,
                object.dimensions.height + 2,
                object.dimensions.depth + 2,
              ]}
            />
            <meshBasicMaterial
              color="#00ff00"
              wireframe={true}
              transparent={true}
              opacity={0.5}
            />
          </mesh>
        )}
      {isSelected && (
        <Text
          position={[0, object.dimensions.height / 2 + 20, 0]}
          fontSize={20}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {object.name}
        </Text>
      )}
    </mesh>
  );
});

Object3DWithRef.displayName = "Object3DWithRef";

// Scene component
const Scene = ({
  objects,
  selectedId,
  onObjectSelect,
  onFaceSelect,
  transformMode,
}: {
  objects: CadObject[];
  selectedId: string | null;
  onObjectSelect: (id: string) => void;
  onFaceSelect: (objectId: string, faceIndex: number) => void;
  transformMode: "translate" | "rotate" | "scale";
}) => {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);

  // Get the selected mesh
  useEffect(() => {
    if (selectedId) {
      selectedMeshRef.current = meshRefs.current.get(selectedId) || null;
    } else {
      selectedMeshRef.current = null;
    }
  }, [selectedId]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Grid args={[500, 50]} />
      <axesHelper args={[100]} />

      {objects.map((obj) => (
        <Object3DWithRef
          key={obj.id}
          ref={(mesh) => {
            if (mesh) {
              meshRefs.current.set(obj.id, mesh);
            } else {
              meshRefs.current.delete(obj.id);
            }
          }}
          object={obj}
          isSelected={obj.id === selectedId}
          onSelect={() => onObjectSelect(obj.id)}
          onFaceSelect={(faceIndex) => onFaceSelect(obj.id, faceIndex)}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        maxDistance={1000}
        minDistance={10}
      />

      {selectedMeshRef.current && (
        <TransformControls
          object={selectedMeshRef.current}
          mode={transformMode}
        />
      )}
    </>
  );
};

Scene.displayName = "Scene";

export default function Page() {
  // State for 3D objects
  const [objects, setObjects] = useState<CadObject[]>([
    {
      id: "1",
      name: "Cube 1",
      type: "cube",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#3b82f6",
      dimensions: { width: 100, height: 100, depth: 100 },
      selectedFaceIndex: null,
    },
    {
      id: "2",
      name: "Sphere 1",
      type: "sphere",
      position: [150, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#10b981",
      dimensions: { width: 80, height: 80, depth: 80 },
      selectedFaceIndex: null,
    },
  ]);

  // Selected object state
  const [selectedId, setSelectedId] = useState<string | null>("1");

  // Transformation mode
  const [transformMode, setTransformMode] = useState<
    "translate" | "rotate" | "scale"
  >("translate");

  // Vertex editing mode
  const [vertexEditMode, setVertexEditMode] = useState(false);

  // Import status
  const [importStatus, setImportStatus] = useState<string>("");

  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<CadObject[][]>([objects]);
  const [redoStack, setRedoStack] = useState<CadObject[][]>([]);

  // File input ref for importing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected object
  const selectedObject = objects.find((obj) => obj.id === selectedId) || null;

  // Function to update objects and push to undo stack
  const updateObjects = (newObjects: CadObject[]) => {
    setUndoStack((prev) => [...prev, objects]);
    setRedoStack([]);
    setObjects(newObjects);
  };

  // Undo function
  const undo = () => {
    if (undoStack.length <= 1) return;
    const prevState = undoStack[undoStack.length - 2];
    const currentState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, currentState]);
    setUndoStack((prev) => prev.slice(0, -1));
    setObjects(prevState);
  };

  // Redo function
  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, objects]);
    setRedoStack((prev) => prev.slice(0, -1));
    setObjects(nextState);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus(
      `Reading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
    );
    console.log(
      "File selected:",
      file.name,
      "size:",
      file.size,
      "type:",
      file.type
    );

    const reader = new FileReader();
    const objectId = `imported_${Date.now()}`;
    const fileName = file.name.split(".")[0];

    if (file.name.endsWith(".stl")) {
      setImportStatus(`Loading STL: ${file.name}...`);
      reader.onloadstart = () => {
        setImportStatus(`Reading STL file: ${file.name}...`);
      };
      reader.onload = (e) => {
        try {
          const contents = e.target?.result;
          if (!contents) {
            setImportStatus("Error: File content is empty");
            alert("File content is empty");
            return;
          }
          setImportStatus("Parsing STL geometry...");
          const loader = new STLLoader();
          const geometry = loader.parse(contents as ArrayBuffer);
          geometry.computeVertexNormals();

          // Compute bounding box to get dimensions
          geometry.computeBoundingBox();
          const bbox = geometry.boundingBox;
          const width = bbox ? bbox.max.x - bbox.min.x : 100;
          const height = bbox ? bbox.max.y - bbox.min.y : 100;
          const depth = bbox ? bbox.max.z - bbox.min.z : 100;

          // Center the geometry
          if (bbox) {
            const centerX = (bbox.min.x + bbox.max.x) / 2;
            const centerY = (bbox.min.y + bbox.max.y) / 2;
            const centerZ = (bbox.min.z + bbox.max.z) / 2;
            geometry.translate(-centerX, -centerY, -centerZ);
          }

          console.log(
            `STL loaded: ${fileName}, dimensions: ${width}x${height}x${depth}`
          );
          setImportStatus(
            `STL loaded: ${fileName} (${width.toFixed(1)}x${height.toFixed(
              1
            )}x${depth.toFixed(1)} mm)`
          );

          const newObject: CadObject = {
            id: objectId,
            name: fileName,
            type: "imported",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            geometry,
            color: "#8b5cf6",
            dimensions: { width, height, depth },
          };

          updateObjects([...objects, newObject]);
          setSelectedId(objectId);
          alert(`Successfully imported ${fileName}.stl`);
          setImportStatus(`Successfully imported ${fileName}.stl`);
        } catch (error: any) {
          console.error("Error loading STL file:", error);
          const errorMsg = `Error loading STL file: ${error.message || error}`;
          setImportStatus(errorMsg);
          alert(errorMsg);
        }
      };
      reader.onerror = () => {
        const errorMsg = "FileReader error: failed to read file";
        console.error(errorMsg);
        setImportStatus(errorMsg);
        alert(errorMsg);
      };
      reader.onloadend = () => {
        // setImportStatus('File reading completed');
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".obj")) {
      setImportStatus(`Loading OBJ: ${file.name}...`);
      reader.onloadstart = () => {
        setImportStatus(`Reading OBJ file: ${file.name}...`);
      };
      reader.onload = (e) => {
        try {
          const contents = e.target?.result;
          if (!contents) {
            setImportStatus("Error: File content is empty");
            alert("File content is empty");
            return;
          }
          setImportStatus("Parsing OBJ geometry...");
          const loader = new OBJLoader();
          const group = loader.parse(contents as string);
          // For simplicity, take the first child's geometry
          if (group.children.length === 0) {
            throw new Error("No objects found in OBJ file");
          }
          const firstChild = group.children[0] as THREE.Mesh;
          if (!firstChild.geometry) {
            throw new Error("First object has no geometry");
          }
          const geometry = firstChild.geometry.clone();
          geometry.computeVertexNormals();

          // Compute bounding box to get dimensions
          geometry.computeBoundingBox();
          const bbox = geometry.boundingBox;
          const width = bbox ? bbox.max.x - bbox.min.x : 100;
          const height = bbox ? bbox.max.y - bbox.min.y : 100;
          const depth = bbox ? bbox.max.z - bbox.min.z : 100;

          // Center the geometry
          if (bbox) {
            const centerX = (bbox.min.x + bbox.max.x) / 2;
            const centerY = (bbox.min.y + bbox.max.y) / 2;
            const centerZ = (bbox.min.z + bbox.max.z) / 2;
            geometry.translate(-centerX, -centerY, -centerZ);
          }

          console.log(
            `OBJ loaded: ${fileName}, dimensions: ${width}x${height}x${depth}`
          );
          setImportStatus(
            `OBJ loaded: ${fileName} (${width.toFixed(1)}x${height.toFixed(
              1
            )}x${depth.toFixed(1)} mm)`
          );

          const newObject: CadObject = {
            id: objectId,
            name: fileName,
            type: "imported",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            geometry,
            color: "#8b5cf6",
            dimensions: { width, height, depth },
          };

          updateObjects([...objects, newObject]);
          setSelectedId(objectId);
          alert(`Successfully imported ${fileName}.obj`);
          setImportStatus(`Successfully imported ${fileName}.obj`);
        } catch (error: any) {
          console.error("Error loading OBJ file:", error);
          const errorMsg = `Error loading OBJ file: ${error.message || error}`;
          setImportStatus(errorMsg);
          alert(errorMsg);
        }
      };
      reader.onerror = () => {
        const errorMsg = "FileReader error: failed to read file";
        console.error(errorMsg);
        setImportStatus(errorMsg);
        alert(errorMsg);
      };
      reader.onloadend = () => {
        // setImportStatus('File reading completed');
      };
      reader.readAsText(file);
    } else {
      const errorMsg =
        "Unsupported file format. Please upload .obj or .stl files.";
      setImportStatus(errorMsg);
      alert(errorMsg);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Add primitive object
  const addPrimitive = (type: "cube" | "sphere" | "cylinder") => {
    const newId = `${type}_${Date.now()}`;
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newObject: CadObject = {
      id: newId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${
        objects.filter((o) => o.type === type).length + 1
      }`,
      type,
      position: [
        Math.random() * 200 - 100,
        Math.random() * 200 - 100,
        Math.random() * 200 - 100,
      ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color,
      dimensions: {
        width: 50 + Math.random() * 100,
        height: 50 + Math.random() * 100,
        depth: 50 + Math.random() * 100,
      },
    };

    updateObjects([...objects, newObject]);
    setSelectedId(newId);
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!selectedId) return;
    const newObjects = objects.filter((obj) => obj.id !== selectedId);
    updateObjects(newObjects);
    setSelectedId(newObjects.length > 0 ? newObjects[0].id : null);
  };

  // Duplicate selected object
  const duplicateSelected = () => {
    if (!selectedObject) return;
    const newId = `${selectedObject.type}_copy_${Date.now()}`;
    const newObject: CadObject = {
      ...selectedObject,
      id: newId,
      name: `${selectedObject.name} Copy`,
      position: [
        selectedObject.position[0] + 30,
        selectedObject.position[1] + 30,
        selectedObject.position[2],
      ],
    };

    updateObjects([...objects, newObject]);
    setSelectedId(newId);
  };

  // Update selected object properties
  const updateSelectedProperty = (property: keyof CadObject, value: any) => {
    if (!selectedObject) return;

    const updatedObject = { ...selectedObject, [property]: value };
    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Update selected object dimension
  const updateDimension = (
    dimension: "width" | "height" | "depth",
    value: number
  ) => {
    if (!selectedObject) return;

    const updatedObject = {
      ...selectedObject,
      dimensions: {
        ...selectedObject.dimensions,
        [dimension]: value,
      },
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Export canvas as STL (simplified - in real app would export all objects)
  const exportCanvas = () => {
    if (!selectedObject) {
      alert("Please select an object to export");
      return;
    }

    // In a real implementation, you would generate and download an STL file
    alert(`Exporting ${selectedObject.name} as STL (simulated)`);
  };

  // Face selection function (now handled inline in onFaceSelect callback)
  const selectFace = (faceIndex: number) => {
    if (!selectedObject) return;

    const updatedObject = {
      ...selectedObject,
      selectedFaceIndex:
        selectedObject.selectedFaceIndex === faceIndex ? null : faceIndex,
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Add bump (extrusion) to selected face
  const addBump = (shapeType: "circle" | "square" | "triangle") => {
    if (
      !selectedObject ||
      selectedObject.selectedFaceIndex === null ||
      selectedObject.selectedFaceIndex === undefined
    ) {
      alert("Please select a face first");
      return;
    }

    alert(
      `Adding ${shapeType} bump to face ${selectedObject.selectedFaceIndex}`
    );
    // In a real implementation, you would modify the geometry here
    // This would involve extruding the selected face with the specified shape

    // Simulate geometry update
    const updatedObject = {
      ...selectedObject,
      dimensions: {
        ...selectedObject.dimensions,
        depth: selectedObject.dimensions.depth + 20,
      },
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Add hole to selected face
  const addHole = () => {
    if (
      !selectedObject ||
      selectedObject.selectedFaceIndex === null ||
      selectedObject.selectedFaceIndex === undefined
    ) {
      alert("Please select a face first");
      return;
    }

    alert(`Adding hole to face ${selectedObject.selectedFaceIndex}`);
    // In a real implementation, you would subtract geometry from the selected face

    // Simulate geometry update
    const updatedObject = {
      ...selectedObject,
      dimensions: {
        ...selectedObject.dimensions,
        width: Math.max(10, selectedObject.dimensions.width - 10),
      },
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Extrude selected face
  const extrudeFace = () => {
    if (
      !selectedObject ||
      selectedObject.selectedFaceIndex === null ||
      selectedObject.selectedFaceIndex === undefined
    ) {
      alert("Please select a face first");
      return;
    }

    alert(`Extruding face ${selectedObject.selectedFaceIndex} by 20mm`);
    // In a real implementation, you would extrude the selected face

    // Simulate geometry update
    const updatedObject = {
      ...selectedObject,
      dimensions: {
        ...selectedObject.dimensions,
        height: selectedObject.dimensions.height + 20,
      },
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  // Move vertex function (simplified)
  const moveVertex = (
    vertexIndex: number,
    newPosition: [number, number, number]
  ) => {
    if (!selectedObject) return;

    alert(
      `Moving vertex ${vertexIndex} to position (${newPosition.join(", ")})`
    );
    // In a real implementation, you would update the vertex position in the geometry

    const updatedObject = {
      ...selectedObject,
      position: [
        selectedObject.position[0] + 5,
        selectedObject.position[1] + 5,
        selectedObject.position[2],
      ] as [number, number, number],
    };

    const newObjects = objects.map((obj) =>
      obj.id === selectedId ? updatedObject : obj
    );

    updateObjects(newObjects);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">3D CAD</span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={exportCanvas}
              className="bg-blue-600 hover:bg-blue-700 border-none text-white"
            >
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <AuthButtons />
          </div>
        }
      />

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
      >
        {/* Sidebar - Tools */}
        <ResizablePanel
          defaultSize={15}
          minSize={10}
          maxSize={20}
          className="border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-4"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">FILE</h3>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".obj,.stl"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import OBJ/STL
                </Button>
                {importStatus && (
                  <div className="mt-2 p-2 bg-zinc-800 rounded text-xs">
                    <div className="text-zinc-400 mb-1">Import Status:</div>
                    <div className="text-green-400 truncate">
                      {importStatus}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 h-6 text-xs"
                      onClick={() => setImportStatus("")}
                    >
                      Clear Status
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                PRIMITIVES
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive("cube")}
                >
                  <Square className="w-5 h-5 mb-1" />
                  <span className="text-xs">Cube</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive("sphere")}
                >
                  <Circle className="w-5 h-5 mb-1" />
                  <span className="text-xs">Sphere</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive("cylinder")}
                >
                  <Cylinder className="w-5 h-5 mb-1" />
                  <span className="text-xs">Cylinder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive("cube")}
                >
                  <Box className="w-5 h-5 mb-1" />
                  <span className="text-xs">Box</span>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                TRANSFORM
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={
                    transformMode === "translate" ? "default" : "outline"
                  }
                  size="sm"
                  className={`h-10 ${
                    transformMode === "translate"
                      ? "bg-blue-600"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                  onClick={() => setTransformMode("translate")}
                >
                  <Move className="w-4 h-4" />
                </Button>
                <Button
                  variant={transformMode === "rotate" ? "default" : "outline"}
                  size="sm"
                  className={`h-10 ${
                    transformMode === "rotate"
                      ? "bg-blue-600"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                  onClick={() => setTransformMode("rotate")}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  variant={transformMode === "scale" ? "default" : "outline"}
                  size="sm"
                  className={`h-10 ${
                    transformMode === "scale"
                      ? "bg-blue-600"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                  onClick={() => setTransformMode("scale")}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                FACE MODIFICATION
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() =>
                    alert(
                      "To select a face:\n1. Click directly on any face of the 3D object.\n2. The selected face will be highlighted with a green wireframe.\n3. Use the face manipulation tools below to modify the selected face."
                    )
                  }
                  disabled={!selectedObject}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Select Face (Instructions)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addBump("circle")}
                    disabled={!selectedObject}
                  >
                    <Circle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addBump("square")}
                    disabled={!selectedObject}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addBump("triangle")}
                    disabled={!selectedObject}
                  >
                    <Triangle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addHole()}
                    disabled={!selectedObject}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                VERTEX EDITING
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => setVertexEditMode(true)}
                  disabled={!selectedObject}
                >
                  <Move className="w-4 h-4 mr-2" />
                  Move Vertex
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={duplicateSelected}
                  disabled={!selectedObject}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={deleteSelected}
                  disabled={!selectedObject}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => extrudeFace()}
                  disabled={!selectedObject}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Extrude
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                OBJECTS
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {objects.map((obj) => (
                  <div
                    key={obj.id}
                    className={`p-2 rounded cursor-pointer text-sm ${
                      selectedId === obj.id
                        ? "bg-blue-600/20 border border-blue-500"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                    onClick={() => setSelectedId(obj.id)}
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: obj.color }}
                      />
                      {obj.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />

        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={65} className="bg-zinc-950 flex flex-col">
          <div className="flex-1 relative">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-zinc-500">Loading 3D scene...</div>
                </div>
              }
            >
              <Canvas
                shadows
                camera={{ position: [200, 200, 200], fov: 50 }}
                onCreated={({ gl }) => {
                  // Set up WebGL context lost/restored handlers
                  gl.domElement.addEventListener(
                    "webglcontextlost",
                    (event) => {
                      console.log("WebGL context lost");
                      event.preventDefault();
                    },
                    false
                  );

                  gl.domElement.addEventListener(
                    "webglcontextrestored",
                    () => {
                      console.log("WebGL context restored");
                    },
                    false
                  );
                }}
              >
                <Scene
                  objects={objects}
                  selectedId={selectedId}
                  onObjectSelect={(id) => {
                    setSelectedId(id);
                    // Clear face selection when selecting a different object
                    const obj = objects.find((o) => o.id === id);
                    if (
                      obj &&
                      obj.selectedFaceIndex !== null &&
                      obj.selectedFaceIndex !== undefined
                    ) {
                      const updatedObject = {
                        ...obj,
                        selectedFaceIndex: null,
                      };
                      const newObjects = objects.map((o) =>
                        o.id === id ? updatedObject : o
                      );
                      updateObjects(newObjects);
                    }
                  }}
                  onFaceSelect={(objectId, faceIndex) => {
                    console.log(
                      `Face selected: object ${objectId}, face ${faceIndex}`
                    );

                    // Select the object first if not already selected
                    if (objectId !== selectedId) {
                      setSelectedId(objectId);
                    }

                    // Update the face selection for this object
                    const obj = objects.find((o) => o.id === objectId);
                    if (obj) {
                      const updatedObject = {
                        ...obj,
                        selectedFaceIndex:
                          obj.selectedFaceIndex === faceIndex
                            ? null
                            : faceIndex,
                      };
                      const newObjects = objects.map((o) =>
                        o.id === objectId ? updatedObject : o
                      );
                      updateObjects(newObjects);
                      console.log(
                        `Updated object ${objectId} with selected face: ${updatedObject.selectedFaceIndex}`
                      );
                    }
                  }}
                  transformMode={transformMode}
                />
              </Canvas>
            </Suspense>

            {/* Canvas Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-4">
                <div className="text-xs text-zinc-400">
                  Selected:{" "}
                  <span className="text-white">
                    {selectedObject?.name || "None"}
                  </span>
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="text-xs text-zinc-400">
                  Objects: <span className="text-white">{objects.length}</span>
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="text-xs text-zinc-400">
                  Mode:{" "}
                  <span className="text-white capitalize">{transformMode}</span>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />

        {/* Properties Panel */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="border-l border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {selectedObject ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  SELECTED OBJECT
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {selectedObject.name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedObject.color }}
                      />
                      <span className="text-xs text-zinc-400">
                        {selectedObject.type}
                      </span>
                    </div>
                  </div>

                  {selectedObject.selectedFaceIndex !== null &&
                    selectedObject.selectedFaceIndex !== undefined && (
                      <div className="p-2 bg-blue-900/20 border border-blue-700 rounded">
                        <div className="text-xs text-blue-300">
                          Selected Face: #{selectedObject.selectedFaceIndex}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs bg-zinc-800 border-zinc-700 mt-1 w-full"
                          onClick={() =>
                            updateSelectedProperty("selectedFaceIndex", null)
                          }
                        >
                          Clear Face Selection
                        </Button>
                      </div>
                    )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  DIMENSIONS (mm)
                </h3>
                <div className="space-y-4">
                  {(["width", "height", "depth"] as const).map((dim) => (
                    <div key={dim}>
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                        <span>
                          {dim.charAt(0).toUpperCase() + dim.slice(1)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={selectedObject.dimensions[dim]}
                            min={10}
                            max={500}
                            step={1}
                            onChange={(e) =>
                              updateDimension(
                                dim,
                                parseFloat(e.target.value) || 10
                              )
                            }
                            className="w-20 h-7 bg-zinc-800 border-zinc-700 text-white text-right"
                          />
                          <span className="text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  FACE MANIPULATION
                </h3>
                <div className="space-y-3">
                  <div className="text-xs text-zinc-400">
                    Current Mode:{" "}
                    <span className="text-white">
                      {vertexEditMode ? "Vertex Editing" : "Object Editing"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={vertexEditMode ? "default" : "outline"}
                      size="sm"
                      className={`h-9 ${
                        vertexEditMode
                          ? "bg-blue-600"
                          : "bg-zinc-800 border-zinc-700"
                      }`}
                      onClick={() => setVertexEditMode(!vertexEditMode)}
                    >
                      <Move className="w-3 h-3 mr-2" />
                      {vertexEditMode ? "Exit Vertex" : "Edit Vertices"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 bg-zinc-800 border-zinc-700"
                      onClick={() => {
                        if (
                          selectedObject.selectedFaceIndex !== null &&
                          selectedObject.selectedFaceIndex !== undefined
                        ) {
                          extrudeFace();
                        } else {
                          alert("Select a face first");
                        }
                      }}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Extrude Face
                    </Button>
                  </div>
                  {selectedObject.selectedFaceIndex !== null &&
                    selectedObject.selectedFaceIndex !== undefined && (
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-400">
                          Selected Face:{" "}
                          <span className="text-white">
                            #{selectedObject.selectedFaceIndex}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                            onClick={() => addBump("circle")}
                          >
                            <Circle className="w-3 h-3 mr-1" /> Circle Bump
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                            onClick={() => addBump("square")}
                          >
                            <Square className="w-3 h-3 mr-1" /> Square Bump
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                            onClick={() => addBump("triangle")}
                          >
                            <Triangle className="w-3 h-3 mr-1" /> Triangle Bump
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                            onClick={addHole}
                          >
                            <Minus className="w-3 h-3 mr-1" /> Add Hole
                          </Button>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  VERTEX EDITING
                </h3>
                <div className="space-y-3">
                  <div className="text-xs text-zinc-400">
                    {vertexEditMode
                      ? "Click and drag vertices to move them. Use inputs below for precise control."
                      : "Enable vertex editing mode to manipulate individual vertices."}
                  </div>
                  {vertexEditMode && (
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-400">
                        Move Vertex (example):
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((vertexIdx) => (
                          <Button
                            key={vertexIdx}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                            onClick={() =>
                              moveVertex(vertexIdx, [
                                selectedObject.position[0] + vertexIdx * 5,
                                selectedObject.position[1] + vertexIdx * 5,
                                selectedObject.position[2],
                              ])
                            }
                          >
                            V{vertexIdx}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  ROTATION (degrees)
                </h3>
                <div className="space-y-4">
                  {["X", "Y", "Z"].map((axis, idx) => (
                    <div key={axis}>
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                        <span>{axis} Axis</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={(
                              selectedObject.rotation[idx] *
                              (180 / Math.PI)
                            ).toFixed(1)}
                            min={-180}
                            max={180}
                            step={1}
                            onChange={(e) => {
                              const newRotation = [
                                ...selectedObject.rotation,
                              ] as [number, number, number];
                              newRotation[idx] =
                                (parseFloat(e.target.value) || 0) *
                                (Math.PI / 180);
                              updateSelectedProperty("rotation", newRotation);
                            }}
                            className="w-20 h-7 bg-zinc-800 border-zinc-700 text-white text-right"
                          />
                          <span className="text-xs">°</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  POSITION (mm)
                </h3>
                <div className="space-y-4">
                  {["X", "Y", "Z"].map((axis, idx) => (
                    <div key={axis}>
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                        <span>{axis} Position</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={selectedObject.position[idx].toFixed(1)}
                            min={-250}
                            max={250}
                            step={1}
                            onChange={(e) => {
                              const newPosition = [
                                ...selectedObject.position,
                              ] as [number, number, number];
                              newPosition[idx] =
                                parseFloat(e.target.value) || 0;
                              updateSelectedProperty("position", newPosition);
                            }}
                            className="w-20 h-7 bg-zinc-800 border-zinc-700 text-white text-right"
                          />
                          <span className="text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Settings className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Select an object to edit properties</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
