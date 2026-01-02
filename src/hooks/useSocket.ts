"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io();

    socketInstance.on("connect", () => {
      console.log("Connected to server:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("message", (data) => {
      console.log("Message received from server:", data);
      setLastMessage(data);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (roomId: string) => {
    if (socket) {
      if (currentRoom) {
        socket.emit("leave", currentRoom);
      }
      socket.emit("join", roomId);
      setCurrentRoom(roomId);
    }
  };

  const sendMessage = (message: any) => {
    if (socket) {
      socket.emit("message", { roomId: currentRoom, message });
    }
  };

  return { socket, isConnected, lastMessage, currentRoom, joinRoom, sendMessage };
};
