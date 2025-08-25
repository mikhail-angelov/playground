"use client";
import React, { useState, useEffect, useRef } from "react";
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
  const [content, setContent] = useState<string>(
    "// You can use lodash here!\n\nconst result = _.times(3).map((r,i)=>i); \n\nconsole.log(result);",
  );
  const [preview, setPreview] = useState<string>("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const setIframeContent = (value?: string) => {
    setPreview(`    <html>
      <head>
        <script src="https://unpkg.com/lodash@4.17.21/lodash.min.js"></script>
      </head>
      <body><script>
      (function() {
        // Override console.log to post messages to the parent window
        const originalLog = console.log;
        console.log = function(...args) {
            window.parent.postMessage({ type: 'console', message: args.join(' ') }, '*');
            originalLog.apply(console, args);
        };
        //wrap mouse events and propagate to parent window
        document.addEventListener('mousemove', (event) => {
          window.parent.postMessage({ type: 'mousemove', event: { clientX: event.clientX, clientY: event.clientY } }, '*');
        });
        document.addEventListener('mouseup', (event) => {
          window.parent.postMessage({ type: 'mouseup', event: { clientX: event.clientX, clientY: event.clientY } }, '*');
        });
        ${value || content}
      })();
    </script>      </body>
  </html>`);
  };
  const handleConsoleMessage = (event: MessageEvent) => {
    if (event.data.type === "console") {
      setConsoleOutput((prevOutput) => [...prevOutput, event.data.message]);
    }
  };
  const onChange = (value?: string) => {
    setConsoleOutput([]);
    setContent(value || "");
    setIframeContent(value);
  };

  useEffect(() => {
    setIframeContent();
    window.addEventListener("message", handleConsoleMessage);

    return () => {
      window.removeEventListener("message", handleConsoleMessage);
    };
  }, []);

  function handleEditorMount(editor: any, monaco: any) {
    fetch("/types/lodash.d.ts")
      .then((response) => response.text())
      .then((lodashTypes) => {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          lodashTypes,
          "file:///node_modules/@types/lodash/index.d.ts",
        );
      })
      .catch((e) => {
        console.error(e);
      });
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />

            <Label className="border border-gray-700 p-2 h-[36px] rounded-lg">
              Lodash
            </Label>
          </div>
        }
        right={
          <div className="flex space-x-4">
            <AuthButtons />
          </div>
        }
      />
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>
          <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
            <Button onClick={() => setIframeContent(content)} variant="outline">
              Run ▶
            </Button>
            <Link href="https://lodash.com/docs" target="_blank">
              Lodash documentation
            </Link>
          </div>
          <Editor
            height="100%"
            defaultLanguage="typescript"
            value={content}
            onChange={onChange}
            theme="vs-dark"
            onMount={handleEditorMount}
          />
          <iframe
            id="iframe"
            ref={iframeRef}
            srcDoc={preview}
            title="Preview"
            className="w-0 h-0"
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div className="w-full h-full overflow-y-auto">
            <h3 className="mx-2">Console Output</h3>
            <div className="mx-2 ">
              {consoleOutput.map((message, index) => (
                <div key={index} className="text-sm">
                  {message}
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Footer />
    </div>
  );
}
