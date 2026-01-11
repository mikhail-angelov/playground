

import * as s3Service from "./s3Service";
import { Readable } from "stream";

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(async (command) => {
        if (command instanceof actual.PutObjectCommand) {
          // Simulate successful upload
          return {};
        }
        if (command instanceof actual.GetObjectCommand) {
          // Simulate file retrieval
          return {
            Body: Readable.from([Buffer.from("mocked file content")]),
          };
        }
        throw new Error("Unknown command");
      }),
    })),
  };
});

describe("s3Service", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, S3_BUCKET: "test-bucket" };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("uploadFileToS3 uploads and returns key", async () => {
    const key = await s3Service.uploadFileToS3("test.txt", "hello world");
    expect(key).toBe("test.txt");
  });

  it("getFileFromS3 returns file content", async () => {
    const content = await s3Service.getFileFromS3("test.txt");
    expect(content).toBe("mocked file content");
  });

  it("uploadFileToS3 throws if bucket is missing", async () => {
    process.env.S3_BUCKET = "";
    await expect(
      s3Service.uploadFileToS3("test.txt", "hello world")
    ).rejects.toThrow();
  });
});
