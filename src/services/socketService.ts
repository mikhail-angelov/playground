import { Server } from "socket.io";

interface RoomData {
  [roomId: string]: string[]; // Tracks room IDs and their connected socket IDs
}

const roomData: RoomData = {};

export const setupSocketIO = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join a room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      if (!roomData[roomId]) {
        roomData[roomId] = [];
      }
      roomData[roomId].push(socket.id);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      io.to(roomId).emit("roomUpdate", roomData[roomId]); // Notify room members
    });

    // Leave a room
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      if (roomData[roomId]) {
        roomData[roomId] = roomData[roomId].filter((id) => id !== socket.id);
        if (roomData[roomId].length === 0) {
          delete roomData[roomId]; // Remove room if empty
        }
      }
      console.log(`Socket ${socket.id} left room ${roomId}`);
      io.to(roomId).emit("roomUpdate", roomData[roomId]); // Notify room members
    });

    // Handle messages
    socket.on("message", ({ roomId, message }) => {
      console.log(`Message from ${socket.id} in room ${roomId}: ${message}`);
      if (!roomId || !roomData[roomId]) {
        console.log(`No room ${roomId} found`);
        return;
      }
      io.to(roomId).emit("message", { sender: socket.id, message });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      // Remove the socket from all rooms it was part of
      for (const roomId in roomData) {
        roomData[roomId] = roomData[roomId].filter((id) => id !== socket.id);
        if (roomData[roomId].length === 0) {
          delete roomData[roomId]; // Remove room if empty
        } else {
          io.to(roomId).emit("roomUpdate", roomData[roomId]); // Notify room members
        }
      }
    });
  });
};
