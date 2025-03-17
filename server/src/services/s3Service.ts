import AWS from 'aws-sdk';
import { Readable } from 'stream';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

export const uploadFileToS3 = async (key: string, content: string): Promise<string> => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: content,
  };

  await s3.upload(params).promise();
  return key;
};

export const getFileFromS3 = async (key: string): Promise<string> => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  return data.Body?.toString('utf-8') || '';
};