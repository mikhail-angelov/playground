import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import authRoutes from './routes/authRoutes';
import { authMiddleware } from './routes/authMiddleware';
import sequelize from './db';

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (origin === 'http://localhost:5174' || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true, // Allow cookies to be sent));
}));

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);


// Protected routes
app.use('/api/files', authMiddleware, fileRoutes);

sequelize.sync().then(() => {
  console.log('Database synced');
});

export default app;