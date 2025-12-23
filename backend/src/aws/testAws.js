import { s3Client } from "./awsConfig.js";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

async function testAWS() {
  try {
    const data = await s3Client.send(new ListBucketsCommand({}));
    console.log("✅ AWS Connected. Buckets:");
    data.Buckets.forEach(b => console.log("-", b.Name));
  } catch (err) {
    console.error("❌ AWS ERROR:", err.message);
  }
}

testAWS();
