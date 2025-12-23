import { createWorker } from 'tesseract.js';

/**
 * Extract text from a single image/frame using Tesseract.js
 */
export async function extractTextFromImage(imagePath) {
  let worker;
  try {
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
    return [`[OCR Error: ${error.message}]`];
  } finally {
    // Always terminate the worker to free memory
    if (worker) {
      await worker.terminate();
    }
  }
}
/**
 * Run OCR on multiple frames using Tesseract.js
 */
export async function extractTextFromFrames(frames) {
  const results = [];

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
          text: ["Video file - OCR not available without frame extraction"],
          frameNumber: i + 1
        });
        continue;
      }

      const textLines = await extractTextFromImage(frame.path);

      results.push({
        frame: frame.path,
        text: textLines,
        frameNumber: i + 1,
        textFound: textLines.length > 0 && !textLines[0].startsWith('[OCR Error:')
      });

    } catch (err) {
      console.error("⚠️ OCR failed for frame:", frame.path, err.message);
      results.push({
        frame: frame.path,
        text: [`[OCR Error: ${err.message}]`],
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
