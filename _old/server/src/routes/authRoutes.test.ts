import request from "supertest";
import express from "express";
import authRoutes from "./authRoutes";
import { User } from "../../models/User";
import { generateToken } from "../../services/jwtUtils";
import nodemailer from "nodemailer";

// Mock dependencies
jest.mock("../../models/User");
jest.mock("../../services/jwtUtils");
jest.mock("nodemailer");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("Auth Routes", () => {
  const mockEmail = "user@example.com";
  const mockUserId = "123";
  const mockAuthToken = "mockAuthToken";
  const mockJwtToken = "mockJwtToken";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /auth", () => {
    it("should generate an auth token and send an email", async () => {
      // Mock User model and generateToken
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        save: jest.fn(),
      });
      (generateToken as jest.Mock).mockReturnValue(mockAuthToken);

      // Mock nodemailer
      const sendMailMock = jest.fn().mockResolvedValue({});
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: sendMailMock,
      });

      const response = await request(app)
        .post("/api/auth")
        .send({ email: mockEmail });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Authentication email sent" });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(User.create).toHaveBeenCalledWith({ email: mockEmail });
      expect(generateToken).toHaveBeenCalledWith({
        userId: mockUserId,
        email: mockEmail,
      });
      expect(sendMailMock).toHaveBeenCalledWith({
        from: process.env.MAILGUN_FROM_EMAIL,
        to: mockEmail,
        subject: "Your Authentication Link",
        text: expect.stringContaining(`/login?token=${mockAuthToken}`),
      });
    });

    it("should return 400 if email is not provided", async () => {
      const response = await request(app).post("/api/auth").send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Email is required" });
    });

    it("should return 500 if email sending fails", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        save: jest.fn(),
      });
      (generateToken as jest.Mock).mockReturnValue(mockAuthToken);

      const sendMailMock = jest.fn().mockRejectedValue(new Error("Mail error"));
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: sendMailMock,
      });

      const response = await request(app)
        .post("/api/auth")
        .send({ email: mockEmail });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Failed to send authentication email",
      });
    });
  });

  describe("GET /login", () => {
    it("should log in a user and set a JWT cookie", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        authToken: mockAuthToken,
      });
      (generateToken as jest.Mock).mockReturnValue(mockJwtToken);

      const response = await request(app).get(
        `/api/auth/login?token=${mockAuthToken}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Logged in successfully" });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { authToken: mockAuthToken },
      });
      expect(generateToken).toHaveBeenCalledWith({
        userId: mockUserId,
        email: mockEmail,
      });
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.headers["set-cookie"][0]).toContain("auth=mockJwtToken");
    });

    it("should return 400 if token is not provided", async () => {
      const response = await request(app).get("/api/auth/login");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Token is required and must be a string",
      });
    });

    it("should return 404 if token is invalid", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get(
        `/api/auth/login?token=${mockAuthToken}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Invalid token" });
    });

    it("should return 500 if login fails", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await request(app).get(
        `/api/auth/login?token=${mockAuthToken}`,
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to log in" });
    });
  });
});
