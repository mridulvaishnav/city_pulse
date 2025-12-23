import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { isVideo, isImage } from "../utils/mediaUtils.js";

/**
 * Main preprocess function
 */
export async function preprocessMedia(localFilePath, mimeType) {
  if (isImage(mimeType)) {
    return preprocessImage(localFilePath);
  }

  if (isVideo(mimeType)) {
    return await preprocessVideo(localFilePath);
  }

  throw new Error("Unsupported media type");
}

/**
 * IMAGE: return as single frame
 */
function preprocessImage(filePath) {
  return [
    {
      type: "image",
      path: filePath
    }
  ];
}

/**
 * VIDEO: extract 3 keyframes using ffmpeg
 */
function preprocessVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const outputDir = `tmp/frames-${Date.now()}`;
    fs.mkdirSync(outputDir, { recursive: true });

    // Windows-compatible ffmpeg command - extract 3 frames at different timestamps
    const cmd = `ffmpeg -y -i "${videoPath}" -vf "select=eq(n\\,0)+eq(n\\,30)+eq(n\\,60)" -vsync vfr "${outputDir}/frame_%02d.jpg"`;

    console.log("🎞️ Running ffmpeg:", cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ ffmpeg error:", error);
        // If ffmpeg fails, return the original video as a single "frame"
        console.log("⚠️ ffmpeg failed, treating video as single frame");
        return resolve([{
          type: "video",
          path: videoPath
        }]);
      }

      if (stderr) {
        console.log("ffmpeg stderr:", stderr);
      }

      try {
        const files = fs.readdirSync(outputDir);

        if (files.length === 0) {
          console.log("⚠️ No frames extracted, treating video as single frame");
          return resolve([{
            type: "video",
            path: videoPath
          }]);
        }

        const frames = files.map(file => ({
          type: "frame",
          path: path.join(outputDir, file)
        }));

        console.log(`✅ Extracted ${frames.length} frames`);
        resolve(frames);
      } catch (dirError) {
        console.error("❌ Error reading frames directory:", dirError);
        // Fallback to treating video as single frame
        resolve([{
          type: "video",
          path: videoPath
        }]);
      }
    });
  });
}

