"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Editor from "@monaco-editor/react";
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
import styles from "./markdown.module.css";
import pintora from "@pintora/standalone";

export default function Page() {
  const [markdownInput, setMarkdownInput] = useState<string>(
    "# Markdown Editor\n\nThis is a **bold** text and this is *italic*.\n\n## Features\n- Live preview\n- Syntax highlighting\n- Diagrams support\n\n```javascript\nconsole.log('Hello, Markdown!');\n```\n\n## Diagram Example\n\n```pintora\nsequenceDiagram\n  Alice->>Bob: Hello Bob, how are you?\n  Bob-->>Alice: I'm good thanks!\n```"
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLDivElement>(null);

  // Initialize pintora
  useEffect(() => {
    pintora.initBrowser();
  }, []);

  // Process diagrams whenever markdown input changes
  useEffect(() => {
    if (previewRef.current && offscreenRef.current) {
      // Small delay to ensure ReactMarkdown has rendered
      setTimeout(() => {
        processDiagrams(previewRef.current!);
      }, 100);
    }
  }, [markdownInput]);

  const processDiagrams = (container: HTMLElement) => {
    const codeBlocks = container.querySelectorAll('pre code.language-pintora');
    codeBlocks.forEach(async (codeBlock) => {
      const pre = codeBlock.parentElement;
      if (pre && offscreenRef.current) {
        const diagramCode = codeBlock.textContent || '';
        try {
          await pintora.renderTo(diagramCode, {
            container: offscreenRef.current,
            renderer: 'svg'
          });
          const diagramSvg = offscreenRef.current.innerHTML;
          const diagramContainer = document.createElement('div');
          diagramContainer.className = 'pintora-diagram';
          diagramContainer.innerHTML = diagramSvg;
          pre.parentElement?.replaceChild(diagramContainer, pre);
          offscreenRef.current.innerHTML = '';
        } catch (error) {
          console.error('Error rendering diagram:', error);
        }
      }
    });
  };

  const handleInputChange = (value?: string) => {
    setMarkdownInput(value || "");
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            <Label className="border border-gray-700 p-2 h-[36px] rounded-lg">
              Markdown Editor
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
            <Label>Markdown Input</Label>
          </div>
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={markdownInput}
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
            <Label>HTML Preview</Label>
            <Link href="https://www.markdownguide.org/basic-syntax/" target="_blank">
              Markdown Guide
            </Link>
          </div>
          <div 
            ref={previewRef}
            className="h-full p-4 bg-white text-black overflow-auto"
          >
            <div className={styles.markdown}>
              <ReactMarkdown>{markdownInput || "Preview will appear here..."}</ReactMarkdown>
            </div>
          </div>
          <div ref={offscreenRef} style={{ display: 'none' }} />
        </ResizablePanel>
      </ResizablePanelGroup>
      <Footer />
    </div>
  );
}
