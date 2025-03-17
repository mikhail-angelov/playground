import request from 'supertest';
import express from 'express';
import fileRoutes from './fileRoutes';
import { uploadFileToS3, getFileFromS3 } from '../services/s3Service';
import { UserFile } from '../models/UserFile';
import { authMiddleware } from '../routes/authMiddleware';

// Mock dependencies
jest.mock('../services/s3Service');
jest.mock('../models/UserFile');
jest.mock('../routes/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.userId = '123'; // Mock userId for testing
    next();
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/files', authMiddleware, fileRoutes);

describe('File Routes', () => {
  const mockUserId = '123';
  const mockFileName = 'test.txt';
  const mockFileContent = 'Hello, world!';
  const mockS3Key = `${mockUserId}/${mockFileName}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /upload', () => {
    it('should upload a file and save metadata to the database', async () => {
      (uploadFileToS3 as jest.Mock).mockResolvedValue(mockS3Key);
      (UserFile.create as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        fileName: mockFileName,
        s3Key: mockS3Key,
      });

      const response = await request(app)
        .post('/api/files/upload')
        .send({ fileName: mockFileName, content: mockFileContent });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: mockUserId,
        fileName: mockFileName,
        s3Key: mockS3Key,
      });

      expect(uploadFileToS3).toHaveBeenCalledWith(mockS3Key, mockFileContent);
      expect(UserFile.create).toHaveBeenCalledWith({
        userId: mockUserId,
        fileName: mockFileName,
        s3Key: mockS3Key,
      });
    });

    it('should return 500 if upload fails', async () => {
      (uploadFileToS3 as jest.Mock).mockRejectedValue(new Error('S3 upload failed'));

      const response = await request(app)
        .post('/api/files/upload')
        .send({ fileName: mockFileName, content: mockFileContent });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to upload file' });
    });
  });

  describe('GET /download/:fileName', () => {
    it('should download a file from S3', async () => {
      (UserFile.findOne as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        fileName: mockFileName,
        s3Key: mockS3Key,
      });
      (getFileFromS3 as jest.Mock).mockResolvedValue(mockFileContent);

      const response = await request(app).get(`/api/files/download/${mockFileName}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ content: mockFileContent });

      expect(UserFile.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, fileName: mockFileName },
      });
      expect(getFileFromS3).toHaveBeenCalledWith(mockS3Key);
    });

    it('should return 404 if file is not found', async () => {
      (UserFile.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(`/api/files/download/${mockFileName}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'File not found' });
    });

    it('should return 500 if download fails', async () => {
      (UserFile.findOne as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        fileName: mockFileName,
        s3Key: mockS3Key,
      });
      (getFileFromS3 as jest.Mock).mockRejectedValue(new Error('S3 download failed'));

      const response = await request(app).get(`/api/files/download/${mockFileName}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to download file' });
    });
  });
});