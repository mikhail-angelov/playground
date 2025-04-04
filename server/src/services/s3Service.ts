import AWS from 'aws-sdk';

export const uploadFileToS3 = async (key: string, content: AWS.S3.Body, type?: string): Promise<string> => {
  const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT_URL || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  });
  const bucket = process.env.S3_BUCKET || "";

  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: type,
    ACL: 'public-read',
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


export const copyAllObjects = async (sourceBucket: string, destinationBucket: string) => {
  try {
    const s3 = new AWS.S3({
      endpoint: process.env.S3_ENDPOINT_URL || "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    });
    // List all objects in the source bucket
    const listParams: AWS.S3.ListObjectsV2Request = {
      Bucket: sourceBucket,
    };

    let continuationToken: string | undefined;
    do {
      const listResponse = await s3.listObjectsV2({ ...listParams, ContinuationToken: continuationToken }).promise();

      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            // Copy each object to the destination bucket
            const copyParams: AWS.S3.CopyObjectRequest = {
              Bucket: destinationBucket,
              CopySource: `/${sourceBucket}/${object.Key}`, // Source bucket and key
              Key: object.Key, // Destination key (same as source key)
              ACL: 'public-read', // Optional: Set ACL for the copied object
            };

            console.log(`Copying ${object.Key} from ${sourceBucket} to ${destinationBucket}`);
            await s3.copyObject(copyParams).promise();
          }
        }
      }

      // Update the continuation token for paginated results
      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    console.log(`All objects copied from ${sourceBucket} to ${destinationBucket}`);
  } catch (error) {
    console.error("Error copying objects:", error);
  }
};