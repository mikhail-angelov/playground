"use client";
import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Three.js and React Three Fiber imports
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, Text, Grid } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import { OBJLoader } from "three-stdlib";
import * as THREE from "three";

// Define types for 3D objects
type CadObject = {
  id: string;
  name: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'imported';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  color: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
};

// Individual 3D object component with ref management
const Object3DWithRef = React.forwardRef<THREE.Mesh, { 
  object: CadObject, 
  isSelected: boolean, 
  onSelect: () => void 
}>(({ object, isSelected, onSelect }, ref) => {
  let geometry: THREE.BufferGeometry;
  
  if (object.type === 'imported' && object.geometry) {
    geometry = object.geometry;
  } else {
    switch (object.type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(
          object.dimensions.width,
          object.dimensions.height,
          object.dimensions.depth
        );
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(object.dimensions.width / 2, 32, 32);
        break;
      case 'cylinder':
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
        onSelect();
      }}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial 
        color={isSelected ? '#fbbf24' : object.color} 
        metalness={0.2}
        roughness={0.8}
      />
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

Object3DWithRef.displayName = 'Object3DWithRef';

// Scene component
const Scene = ({ 
  objects, 
  selectedId, 
  onObjectSelect,
  transformMode 
}: { 
  objects: CadObject[], 
  selectedId: string | null,
  onObjectSelect: (id: string) => void,
  transformMode: 'translate' | 'rotate' | 'scale'
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

Scene.displayName = 'Scene';

export default function Page() {
  // State for 3D objects
  const [objects, setObjects] = useState<CadObject[]>([
    {
      id: '1',
      name: 'Cube 1',
      type: 'cube',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#3b82f6',
      dimensions: { width: 100, height: 100, depth: 100 },
    },
    {
      id: '2',
      name: 'Sphere 1',
      type: 'sphere',
      position: [150, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#10b981',
      dimensions: { width: 80, height: 80, depth: 80 },
    },
  ]);
  
  // Selected object state
  const [selectedId, setSelectedId] = useState<string | null>('1');
  
  // Transformation mode
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<CadObject[][]>([objects]);
  const [redoStack, setRedoStack] = useState<CadObject[][]>([]);
  
  // File input ref for importing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected object
  const selectedObject = objects.find(obj => obj.id === selectedId) || null;

  // Function to update objects and push to undo stack
  const updateObjects = (newObjects: CadObject[]) => {
    setUndoStack(prev => [...prev, objects]);
    setRedoStack([]);
    setObjects(newObjects);
  };

  // Undo function
  const undo = () => {
    if (undoStack.length <= 1) return;
    const prevState = undoStack[undoStack.length - 2];
    const currentState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    setObjects(prevState);
  };

  // Redo function
  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, objects]);
    setRedoStack(prev => prev.slice(0, -1));
    setObjects(nextState);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const objectId = `imported_${Date.now()}`;
    const fileName = file.name.split('.')[0];

    if (file.name.endsWith('.stl')) {
      reader.onload = (e) => {
        const contents = e.target?.result;
        if (contents) {
          const loader = new STLLoader();
          const geometry = loader.parse(contents as ArrayBuffer);
          geometry.computeVertexNormals();
          
          const newObject: CadObject = {
            id: objectId,
            name: fileName,
            type: 'imported',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            geometry,
            color: '#8b5cf6',
            dimensions: { width: 100, height: 100, depth: 100 },
          };
          
          updateObjects([...objects, newObject]);
          setSelectedId(objectId);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.obj')) {
      reader.onload = (e) => {
        const contents = e.target?.result;
        if (contents) {
          const loader = new OBJLoader();
          const group = loader.parse(contents as string);
          // For simplicity, take the first child's geometry
          const geometry = (group.children[0] as THREE.Mesh).geometry;
          
          const newObject: CadObject = {
            id: objectId,
            name: fileName,
            type: 'imported',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            geometry,
            color: '#8b5cf6',
            dimensions: { width: 100, height: 100, depth: 100 },
          };
          
          updateObjects([...objects, newObject]);
          setSelectedId(objectId);
        }
      };
      reader.readAsText(file);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add primitive object
  const addPrimitive = (type: 'cube' | 'sphere' | 'cylinder') => {
    const newId = `${type}_${Date.now()}`;
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const newObject: CadObject = {
      id: newId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.filter(o => o.type === type).length + 1}`,
      type,
      position: [Math.random() * 200 - 100, Math.random() * 200 - 100, Math.random() * 200 - 100],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color,
      dimensions: { 
        width: 50 + Math.random() * 100, 
        height: 50 + Math.random() * 100, 
        depth: 50 + Math.random() * 100 
      },
    };
    
    updateObjects([...objects, newObject]);
    setSelectedId(newId);
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!selectedId) return;
    const newObjects = objects.filter(obj => obj.id !== selectedId);
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
        selectedObject.position[2]
      ],
    };
    
    updateObjects([...objects, newObject]);
    setSelectedId(newId);
  };

  // Update selected object properties
  const updateSelectedProperty = (property: keyof CadObject, value: any) => {
    if (!selectedObject) return;
    
    const updatedObject = { ...selectedObject, [property]: value };
    const newObjects = objects.map(obj => 
      obj.id === selectedId ? updatedObject : obj
    );
    
    updateObjects(newObjects);
  };

  // Update selected object dimension
  const updateDimension = (dimension: 'width' | 'height' | 'depth', value: number) => {
    if (!selectedObject) return;
    
    const updatedObject = {
      ...selectedObject,
      dimensions: {
        ...selectedObject.dimensions,
        [dimension]: value
      }
    };
    
    const newObjects = objects.map(obj => 
      obj.id === selectedId ? updatedObject : obj
    );
    
    updateObjects(newObjects);
  };

  // Export canvas as STL (simplified - in real app would export all objects)
  const exportCanvas = () => {
    if (!selectedObject) {
      alert('Please select an object to export');
      return;
    }
    
    // In a real implementation, you would generate and download an STL file
    alert(`Exporting ${selectedObject.name} as STL (simulated)`);
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
            <Button variant="outline" size="sm" onClick={exportCanvas} className="bg-blue-600 hover:bg-blue-700 border-none text-white">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <AuthButtons />
          </div>
        }
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Sidebar - Tools */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={20} className="border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-4">
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
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">PRIMITIVES</h3>
              <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addPrimitive('cube')}
                  >
                    <Square className="w-5 h-5 mb-1" />
                    <span className="text-xs">Cube</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    onClick={() => addPrimitive('sphere')}
                  >
                    <Circle className="w-5 h-5 mb-1" />
                    <span className="text-xs">Sphere</span>
                  </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive('cylinder')}
                >
                  <Cylinder className="w-5 h-5 mb-1" />
                  <span className="text-xs">Cylinder</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  onClick={() => addPrimitive('cube')}
                >
                  <Box className="w-5 h-5 mb-1" />
                  <span className="text-xs">Box</span>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">TRANSFORM</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={transformMode === 'translate' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 ${transformMode === 'translate' ? 'bg-blue-600' : 'bg-zinc-800 border-zinc-700'}`}
                  onClick={() => setTransformMode('translate')}
                >
                  <Move className="w-4 h-4" />
                </Button>
                <Button
                  variant={transformMode === 'rotate' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 ${transformMode === 'rotate' ? 'bg-blue-600' : 'bg-zinc-800 border-zinc-700'}`}
                  onClick={() => setTransformMode('rotate')}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  variant={transformMode === 'scale' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 ${transformMode === 'scale' ? 'bg-blue-600' : 'bg-zinc-800 border-zinc-700'}`}
                  onClick={() => setTransformMode('scale')}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">MODIFY</h3>
              <div className="grid grid-cols-2 gap-2">
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
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">OBJECTS</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {objects.map((obj) => (
                  <div
                    key={obj.id}
                    className={`p-2 rounded cursor-pointer text-sm ${selectedId === obj.id ? 'bg-blue-600/20 border border-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
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
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-zinc-500">Loading 3D scene...</div>
              </div>
            }>
              <Canvas 
                shadows 
                camera={{ position: [200, 200, 200], fov: 50 }}
                onCreated={({ gl }) => {
                  // Set up WebGL context lost/restored handlers
                  gl.domElement.addEventListener('webglcontextlost', (event) => {
                    console.log('WebGL context lost');
                    event.preventDefault();
                  }, false);
                  
                  gl.domElement.addEventListener('webglcontextrestored', () => {
                    console.log('WebGL context restored');
                  }, false);
                }}
              >
                <Scene 
                  objects={objects} 
                  selectedId={selectedId}
                  onObjectSelect={setSelectedId}
                  transformMode={transformMode}
                />
              </Canvas>
            </Suspense>
            
            {/* Canvas Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-4">
                <div className="text-xs text-zinc-400">
                  Selected: <span className="text-white">{selectedObject?.name || 'None'}</span>
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="text-xs text-zinc-400">
                  Objects: <span className="text-white">{objects.length}</span>
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="text-xs text-zinc-400">
                  Mode: <span className="text-white capitalize">{transformMode}</span>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-zinc-800 hover:bg-blue-600 transition-colors" />

        {/* Properties Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-l border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {selectedObject ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">PROPERTIES</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="object-name" className="text-xs text-zinc-400">Name</Label>
                    <Input
                      id="object-name"
                      value={selectedObject.name}
                      onChange={(e) => updateSelectedProperty('name', e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-zinc-400">Color</Label>
                    <div className="flex space-x-2 mt-1">
                      {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ffffff'].map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded-full border-2 ${selectedObject.color === color ? 'border-white' : 'border-zinc-700'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateSelectedProperty('color', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">DIMENSIONS (mm)</h3>
                <div className="space-y-4">
                  {(['width', 'height', 'depth'] as const).map((dim) => (
                    <div key={dim}>
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                        <span>{dim.charAt(0).toUpperCase() + dim.slice(1)}</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={selectedObject.dimensions[dim]}
                            min={10}
                            max={500}
                            step={1}
                            onChange={(e) => updateDimension(dim, parseFloat(e.target.value) || 10)}
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
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">ROTATION (degrees)</h3>
                <div className="space-y-4">
                  {['X', 'Y', 'Z'].map((axis, idx) => (
                    <div key={axis}>
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                        <span>{axis} Axis</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={(selectedObject.rotation[idx] * (180 / Math.PI)).toFixed(1)}
                            min={-180}
                            max={180}
                            step={1}
                            onChange={(e) => {
                              const newRotation = [...selectedObject.rotation] as [number, number, number];
                              newRotation[idx] = (parseFloat(e.target.value) || 0) * (Math.PI / 180);
                              updateSelectedProperty('rotation', newRotation);
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
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">POSITION (mm)</h3>
                <div className="space-y-4">
                  {['X', 'Y', 'Z'].map((axis, idx) => (
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
                              const newPosition = [...selectedObject.position] as [number, number, number];
                              newPosition[idx] = parseFloat(e.target.value) || 0;
                              updateSelectedProperty('position', newPosition);
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
