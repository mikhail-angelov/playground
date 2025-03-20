import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import sequelize from "./db";
import projectsRoutes from "./routes/projectsRoutes";
import { join } from "node:path";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  const corsOrigins = ["http://localhost:5174", "http://localhost:5000"];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS: " + origin));
        }
      },
      credentials: true, // Allow cookies to be sent));
    })
  );
}

// Serve static files from the client app
const clientDistPath = join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath,{immutable:true})); // Ensure this is defined before the catch-all route

// Public routes (no authentication required)
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/project", projectsRoutes);

// Catch-all route to serve index.html for non-static routes
app.get("*", (req, res) => {
  // Serve index.html only for non-API and non-static routes
  if (!req.path.startsWith("/api") && !/\.[^/]+$/.test(req.path)) {
    res.sendFile(join(clientDistPath, "index.html"));
  } else {
    res.status(404).send("Not Found");
  }
});

sequelize.sync().then(() => {
  console.log("Database synced");
});

export default app;
