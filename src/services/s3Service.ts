import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  PutObjectCommandInput,
  CopyObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import zlib from "zlib";

const getS3 = () => {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT_URL || "https://storage.yandexcloud.net",
    region: "ru-central1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
};

export const uploadFileToS3 = async (
  key: string,
  content: Buffer | string,
  type?: string,
  contentEncoding?: string,
): Promise<string> => {
  const bucket = process.env.S3_BUCKET || "";

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: type,
    ContentEncoding: contentEncoding,
    ACL: "public-read",
  };

  try {
    await getS3().send(new PutObjectCommand(params));
    return key;
  } catch (error) {
    console.error("Error uploading file to S3:", bucket, error);
    throw error;
  }
};

export const getFileFromS3 = async (key: string): Promise<string> => {
  const bucket = process.env.S3_BUCKET || "";

  const params = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const data = await getS3().send(new GetObjectCommand(params));
    const stream = data.Body as Readable;
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Check for gzip magic bytes (0x1f 0x8b)
    if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
      return zlib.gunzipSync(buffer).toString("utf-8");
    }
    
    return buffer.toString("utf-8");
  } catch (error) {
    console.error("Error getting file from S3:", error);
    throw error;
  }
};

