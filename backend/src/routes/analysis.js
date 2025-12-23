import express from "express";
import { extractTextFromFrames } from "../services/ocrService.js";
import { analyzeFrames, extractCityInsights } from "../services/visionService.js";
import { preprocessMedia } from "../services/preprocessService.js";
import fs from "fs";

const router = express.Router();

/**
 * Analyze a local file (for testing or re-analysis)
 * POST /api/analysis/local
 * Body: { filePath: "path/to/file", mimeType: "image/jpeg" }
 */
router.post("/local", async (req, res) => {
  try {
    const { filePath, mimeType } = req.body;

    if (!filePath || !mimeType) {
      return res.status(400).json({ 
        error: "Missing required fields: filePath and mimeType" 
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: "File not found at specified path" 
      });
    }

    console.log("🔍 Starting analysis of local file:", filePath);

    // Preprocess the media
    const frames = await preprocessMedia(filePath, mimeType);
    console.log(`🖼️ Frames extracted: ${frames.length}`);

    // Run OCR
    console.log("📝 Running OCR analysis...");
    const ocrResults = await extractTextFromFrames(frames);

    // Run Vision Analysis
    console.log("👁️ Running vision analysis...");
    const visionResults = await analyzeFrames(frames);

    // Extract City Insights
    const cityInsights = extractCityInsights(visionResults);

    res.json({
      status: "analyzed",
      filePath,
      mediaType: mimeType,
      frameCount: frames.length,
      ocr: ocrResults,
      vision: visionResults,
      cityInsights,
      processing: {
        ocrFramesProcessed: ocrResults.filter(r => r.textFound).length,
        visionFramesAnalyzed: visionResults.filter(r => r.totalLabels > 0).length,
        cityRelevanceScore: cityInsights.overallCityScore
      }
    });

  } catch (err) {
    console.error("❌ Analysis error:", err);
    res.status(500).json({
      error: "Analysis failed",
      details: err.message
    });
  }
});

/**
 * Get analysis statistics
 * GET /api/analysis/stats
 */
router.get("/stats", async (req, res) => {
  try {
    // This would typically query a database for historical analysis data
    // For now, return mock statistics
    res.json({
      status: "success",
      stats: {
        totalAnalyses: 0,
        averageCityScore: 0,
        commonCityElements: [
          "Building", "Road", "Vehicle", "Person", "Traffic"
        ],
        supportedFormats: [
          "image/jpeg", "image/png", "image/gif", "image/webp",
          "video/mp4", "video/avi", "video/mov", "video/webm"
        ],
        features: {
          ocr: "Tesseract.js (Free)",
          vision: "AWS Rekognition (Requires subscription)",
          preprocessing: "FFmpeg for video frames",
          storage: "AWS S3"
        }
      }
    });
  } catch (err) {
    console.error("❌ Stats error:", err);
    res.status(500).json({
      error: "Failed to get statistics",
      details: err.message
    });
  }
});

export default router;