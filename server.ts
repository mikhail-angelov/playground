import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("message", (data: { roomId?: string; message: any }) => {
      console.log(`[Message] From: ${socket.id}, Room: ${data.roomId}, Data:`, data.message);
      
      if (!data.roomId) {
        //ignore global messages
        return;
      }
      // Send to everyone in the room except the sender
      socket.to(data.roomId).emit("message", data);
      // Also send back to the sender
      socket.emit("message", data);
      
      // Debug: Log room members
      const clients = io.sockets.adapter.rooms.get(data.roomId);
      console.log(`[Debug] Room ${data.roomId} has ${clients?.size || 0} members`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`,
    );
  });
});
