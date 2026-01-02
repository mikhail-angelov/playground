"use client";

import { useSocket } from "@/hooks/useSocket";
import { useState } from "react";

export default function SocketTestPage() {
  const { isConnected, lastMessage, sendMessage, joinRoom, currentRoom } = useSocket();
  const [input, setInput] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  const handleJoin = () => {
    if (roomIdInput) {
      joinRoom(roomIdInput);
    }
  };

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">WebSocket Room Test</h1>
      
      <div className="flex gap-4 mb-4 items-center">
        <span className={`px-2 py-1 rounded text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {currentRoom && (
          <span className="bg-purple-500 text-white px-2 py-1 rounded">
            Room: {currentRoom}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={roomIdInput} 
          onChange={(e) => setRoomIdInput(e.target.value)}
          className="border p-2 rounded w-32 dark:bg-zinc-800"
          placeholder="Room ID"
        />
        <button 
          onClick={handleJoin}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
        >
          Join Room
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          className="border p-2 rounded flex-1 dark:bg-zinc-800"
          placeholder="Type a message..."
        />
        <button 
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Send to Room
        </button>
      </div>

      <div className="border p-4 rounded bg-zinc-50 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold mb-2">Last Message from Server:</h2>
        <pre className="whitespace-pre-wrap">
          {lastMessage ? JSON.stringify(lastMessage, null, 2) : "No messages yet"}
        </pre>
      </div>
    </div>
  );
}
