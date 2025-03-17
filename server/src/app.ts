import express, { NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import authRoutes from './routes/authRoutes';
import { authMiddleware } from './routes/authMiddleware';
import { sequelize } from './models/UserFile';



const app = express();

app.use(cors());
app.use(bodyParser.json());

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);


// Protected routes
app.use('/api/files', authMiddleware, fileRoutes);

sequelize.sync().then(() => {
  console.log('Database synced');
});

export default app;