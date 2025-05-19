import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketIO } from "./services/socketService"; // Import the socket service
import authRoutes from "./routes/authRoutes";
import sequelize from "./db";
import projectsRoutes from "./routes/projectsRoutes";
import { join } from "node:path";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:5000", "https://app.js2go.ru"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setupSocketIO(io);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  const corsOrigins = ["http://localhost:5174", "http://localhost:5000", "https://app.js2go.ru"];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS: " + origin));
        }
      },
      credentials: true,
    })
  );
}

// Serve static files from the client app
const clientDistPath = join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath, { immutable: true }));

app.use("/api/auth", authRoutes);
app.use("/api/project", projectsRoutes);

app.get("*", (req, res) => {
  if (!req.path.startsWith("/api") && !/\.[^/]+$/.test(req.path)) {
    res.sendFile(join(clientDistPath, "index.html"));
  } else {
    res.status(404).send("Not Found");
  }
});

sequelize.sync().then(() => {
  console.log("Database synced");
});

export { app, httpServer };
