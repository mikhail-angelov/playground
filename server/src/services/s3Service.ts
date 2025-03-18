import AWS from 'aws-sdk';

export const uploadFileToS3 = async (key: string, content: string): Promise<string> => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT_URL || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  });
  const bucket = process.env.S3_BUCKET || "";

  const params = {
    Bucket: bucket,
    Key: key,
    Body: content,
  };

  await s3.upload(params).promise();
  return key;
};

export const getFileFromS3 = async (key: string): Promise<string> => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT_URL || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  });
  const bucket = process.env.S3_BUCKET || "";

  const params = {
    Bucket: bucket,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  return data.Body?.toString('utf-8') || '';
};