import express from "express";
import multer from "multer";

import { uploadToS3 } from "../services/s3Service.js";
import { preprocessMedia } from "../services/preprocessService.js";
import { deleteLocalFile } from "../utils/fileUtils.js";
import { extractTextFromFrames } from "../services/ocrService.js";
import { analyzeFrames, categorizeDisasters, getEmergencyRecommendations } from "../services/visionService.js";
import { generateSnippets } from "../services/snippetService.js";

const router = express.Router();

// Multer temp storage
const upload = multer({ dest: "tmp/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("📁 Upload request received");

    // 1. Validate file
    if (!req.file) {
      console.log("❌ No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path, originalname, mimetype, size } = req.file;

    console.log("📄 File details:", {
      name: originalname,
      type: mimetype,
      size,
      path
    });

    // 2. STEP 2 — Preprocess (image vs video → frames)
    console.log("🧠 Preprocessing media...");
    const frames = await preprocessMedia(path, mimetype);

    console.log(`🖼️ Frames extracted: ${frames.length}`);
    
    // STEP 3 — OCR (Tesseract.js)
    console.log("🔍 Running OCR on frames...");
    const ocrResults = await extractTextFromFrames(frames);
    console.log("📝 OCR results:", ocrResults.length, "frames processed");

    // STEP 4 — Vision Analysis (AWS Rekognition) - Enhanced for disasters
    console.log("👁️ Running enhanced disaster/hazard analysis on frames...");
    const visionResults = await analyzeFrames(frames);
    console.log("🖼️ Vision analysis results:", visionResults.length, "labels detected");

    // STEP 5 — Categorize Disasters and Generate Recommendations
    console.log("🚨 Categorizing disasters and hazards...");
    const disasterAnalysis = categorizeDisasters(visionResults);
    const emergencyRecommendations = getEmergencyRecommendations(disasterAnalysis);
    console.log("🚨 Severity level:", disasterAnalysis.summary.severityLevel);

    // STEP 6 — Generate Evidence Snippets
    console.log("📋 Generating evidence snippets...");
    const snippets = generateSnippets(visionResults, ocrResults);
    console.log("📋 Generated", snippets.length, "evidence snippets");

    // STEP 7 — Upload original file to S3
    console.log("☁️ Uploading original media to S3...");
    const s3Result = await uploadToS3(
      path,
      originalname,
      mimetype
    );

    console.log("✅ S3 upload successful:", s3Result);

    // STEP 8 — Cleanup local temp file
    deleteLocalFile(path);

    // STEP 9 — Response (comprehensive disaster analysis)
    return res.json({
      status: "processed",
      mediaType: mimetype,
      frameCount: frames.length,
      
      // Evidence snippets (clean, explainable format)
      snippets: snippets,
      
      // Vision analysis with ALL detected labels
      vision: visionResults,
      
      // Disaster categorization and severity
      disasters: disasterAnalysis,
      
      // Emergency recommendations
      emergency: {
        recommendations: emergencyRecommendations,
        severity: disasterAnalysis.summary.severityLevel,
        immediateAction: emergencyRecommendations[0]?.action || "No immediate action required"
      },
      
      // OCR results
      ocr: ocrResults,
      
      // S3 storage info
      s3: s3Result,
      
      // Processing summary
      processing: {
        ocrFramesProcessed: ocrResults.filter(r => r.textFound).length,
        visionLabelsDetected: visionResults.length,
        hazardsDetected: visionResults.filter(r => r.category === "hazard").length,
        disastersIdentified: disasterAnalysis.summary.totalDisasters,
        snippetsGenerated: snippets.length
      }
    });


  } catch (err) {
    console.error("❌ Upload / Processing error:", err);
    return res.status(500).json({
      error: "Upload or processing failed",
      details: err.message
    });
  }
});

export default router;
