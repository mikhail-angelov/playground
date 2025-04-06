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

console.log("S3_BUCKET", process.env.S3_SECRET_ACCESS_KEY);
const getS3 = () => {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT_URL || "https://storage.yandexcloud.net",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
};

export const uploadFileToS3 = async (
  key: string,
  content: Buffer | string,
  type?: string
): Promise<string> => {
  const bucket = process.env.S3_BUCKET || "";

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: type,
    ACL: "public-read",
  };

  try {
    await getS3().send(new PutObjectCommand(params));
    return key;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
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
    return Buffer.concat(chunks).toString("utf-8");
  } catch (error) {
    console.error("Error getting file from S3:", error);
    throw error;
  }
};

export const copyAllObjects = async (
  sourceBucket: string,
  destinationBucket: string
) => {
  try {
    let continuationToken: string | undefined;
    const s3 = getS3();

    do {
      // List objects in the source bucket
      const listResponse = await s3.send(
        new ListObjectsV2Command({
          Bucket: sourceBucket,
          ContinuationToken: continuationToken,
        })
      );

      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            // Copy each object to the destination bucket
            const copyParams: CopyObjectCommandInput = {
              Bucket: destinationBucket,
              CopySource: `/${sourceBucket}/${object.Key}`, // Source bucket and key
              Key: object.Key, // Destination key (same as source key)
              ACL: "public-read", // Optional: Set ACL for the copied object
            };

            console.log(
              `Copying ${object.Key} from ${sourceBucket} to ${destinationBucket}`
            );
            await s3.send(new CopyObjectCommand(copyParams));
          }
        }
      }

      // Update the continuation token for paginated results
      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    console.log(
      `All objects copied from ${sourceBucket} to ${destinationBucket}`
    );
  } catch (error) {
    console.error("Error copying objects:", error);
    throw error;
  }
};
