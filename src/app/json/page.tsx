"use client";
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import HomeButton from "@/components/HomeButton";
import AuthButtons from "@/components/AuthButtons";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Link from "next/link";

export default function Page() {
  const [inputJson, setInputJson] = useState<string>(
    '{"name": "John", "age": 30, "city": "New York"}'
  );
  const [formattedJson, setFormattedJson] = useState<string>("");
  const [error, setError] = useState<string>("");

  const formatJson = () => {
    try {
      setError("");
      
      if (!inputJson.trim()) {
        setFormattedJson("");
        return;
      }

      // Parse and format the JSON
      const parsed = JSON.parse(inputJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormattedJson(formatted);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid JSON";
      setError(errorMessage);
      setFormattedJson("");
    }
  };

  const handleInputChange = (value?: string) => {
    setInputJson(value || "");
    setError("");
  };

  const handleFormattedChange = (value?: string) => {
    setFormattedJson(value || "");
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            <Label className="border border-gray-700 p-2 h-[36px] rounded-lg">
              JSON Formatter
            </Label>
          </div>
        }
        right={
          <div className="flex space-x-4">
            <AuthButtons />
          </div>
        }
      />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel>
          <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
            <div className="flex items-center gap-4">
              <Button onClick={formatJson} variant="outline">
                Format JSON
              </Button>
            </div>
            <Label>Input JSON</Label>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={inputJson}
            onChange={handleInputChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
            <Label>Formatted JSON</Label>
            <Link href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON" target="_blank">
              JSON Documentation
            </Link>
          </div>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={formattedJson}
            onChange={handleFormattedChange}
            theme="vs-dark"
            options={{
              readOnly: false,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      {error && (
        <div className="bg-red-900 text-red-100 p-2 border-t border-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      <Footer />
    </div>
  );
}
