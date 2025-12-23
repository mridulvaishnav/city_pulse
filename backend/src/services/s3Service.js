import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../aws/awsConfig.js";
import fs from "fs";

export async function uploadToS3(filePath, fileName, mimeType) {
  console.log("🔧 S3 upload params:", {
    filePath,
    fileName,
    mimeType,
    bucket: process.env.S3_BUCKET_NAME
  });

  const fileStream = fs.createReadStream(filePath);
  const key = `raw/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: mimeType
  });

  console.log("📤 Sending to S3...");
  const response = await s3Client.send(command);
  console.log("✅ S3 response:", response);

  return {
    bucket: process.env.S3_BUCKET_NAME,
    key: key
  };
}
