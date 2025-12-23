import { createWorker } from 'tesseract.js';
import fs from 'fs';

/**
 * Extract text from a single image/frame using Tesseract.js
 */
export async function extractTextFromImage(imagePath) {
  let worker;
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.log("⚠️ Image file not found:", imagePath);
      return [];
    }
    
    console.log("🔍 Starting Tesseract OCR for:", imagePath);
    
    // Create a Tesseract worker
    worker = await createWorker('eng');
    
    // Perform OCR
    const { data: { text } } = await worker.recognize(imagePath);
    
    // Clean up the text and split into lines
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`✅ OCR completed. Found ${lines.length} lines of text`);
    
    return lines;
  } catch (error) {
    console.error("❌ Tesseract OCR failed:", error.message);
    return [];
  } finally {
    // Always terminate the worker to free memory
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // Ignore termination errors
      }
    }
  }
}
/**
 * Run OCR on multiple frames using Tesseract.js
 */
export async function extractTextFromFrames(frames) {
  const results = [];

  // Handle empty frames
  if (!frames || frames.length === 0) {
    console.log("⚠️ No frames to process for OCR");
    return [];
  }

  console.log(`🔍 Starting OCR processing for ${frames.length} frame(s)`);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      console.log(`📄 Processing frame ${i + 1}/${frames.length}: ${frame.path}`);
      
      // Skip OCR for video files that couldn't be processed into frames
      if (frame.type === "video") {
        console.log("⚠️ Skipping OCR for unprocessed video file");
        results.push({
          frame: frame.path,
          text: [],
          frameNumber: i + 1,
          textFound: false
        });
        continue;
      }

      const textLines = await extractTextFromImage(frame.path);

      results.push({
        frame: frame.path,
        text: textLines || [],
        frameNumber: i + 1,
        textFound: textLines && textLines.length > 0
      });

    } catch (err) {
      console.error("⚠️ OCR failed for frame:", frame.path, err.message);
      results.push({
        frame: frame.path,
        text: [],
        frameNumber: i + 1,
        error: err.message,
        textFound: false
      });
    }
  }

  const successfulOCR = results.filter(r => r.textFound).length;
  console.log(`✅ OCR completed. ${successfulOCR}/${results.length} frames had readable text`);

  return results;
}
