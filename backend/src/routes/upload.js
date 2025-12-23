import express from "express";
import multer from "multer";

import { uploadToS3 } from "../services/s3Service.js";
import { preprocessMedia } from "../services/preprocessService.js";
import { deleteLocalFile } from "../utils/fileUtils.js";
import { extractTextFromFrames } from "../services/ocrService.js";
import { analyzeFrames, categorizeDisasters, getEmergencyRecommendations } from "../services/visionService.js";
import { generateSnippets } from "../services/snippetService.js";
import { analyzeIncident } from "../services/llmService.js";
import { createIncident } from "../services/incidentService.js";
import { logHeader, logStep, logSuccess, logSummary } from "../utils/logger.js";

const router = express.Router();

// Multer temp storage
const upload = multer({ dest: "tmp/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    logHeader("🚀 NEW UPLOAD REQUEST");
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
    logStep(1, "Preprocessing media");
    const frames = await preprocessMedia(path, mimetype);
    logSuccess(`Frames extracted: ${frames.length}`);

    // STEP 3 — OCR (Tesseract.js)
    logStep(2, "Running OCR on frames");
    const ocrResults = await extractTextFromFrames(frames);
    logSuccess(`OCR completed: ${ocrResults.filter(r => r.textFound).length}/${ocrResults.length} frames with text`);

    // STEP 4 — Vision Analysis (AWS Rekognition) - Enhanced for disasters
    logStep(3, "Running vision analysis");
    const visionResults = await analyzeFrames(frames);
    logSuccess(`Vision analysis: ${visionResults.length} labels detected`);
    logSuccess(`Vision analysis: ${visionResults.length} labels detected`);

    // STEP 5 — Categorize Disasters and Generate Recommendations
    logStep(4, "Categorizing disasters");
    const disasterAnalysis = categorizeDisasters(visionResults);
    const emergencyRecommendations = getEmergencyRecommendations(disasterAnalysis);
    logSuccess(`Severity level: ${disasterAnalysis.summary.severityLevel}`);

    // STEP 6 — Generate Evidence Snippets
    logStep(5, "Generating evidence snippets");
    const snippets = generateSnippets(visionResults, ocrResults);
    logSuccess(`Evidence generated: ${snippets.length} snippets`);

    // STEP 7 — LLM Incident Analysis (Groq API)
    logStep(6, "Running LLM incident analysis");
    const aiDecision = await analyzeIncident(snippets);
    logSuccess(`LLM reasoning complete: ${aiDecision.incident_type} (confidence: ${(aiDecision.confidence * 100).toFixed(1)}%)`);

    // STEP 8 — Confidence Gate + Final Incident Object (TASK 3)
    logStep(7, "Applying confidence gate");
    const finalIncident = createIncident(aiDecision, snippets);
    logSuccess(`Confidence gate applied: ${finalIncident.status}`);
    
    if (finalIncident.status === "needs_human_review") {
      console.log("👤 Human review triggered (confidence < 60%)");
    }

    // STEP 9 — Upload original file to S3 (optional - may fail if AWS not configured)
    logStep(8, "Uploading to S3");
    let s3Result = { bucket: "local", key: `local/${originalname}` };
    try {
      s3Result = await uploadToS3(
        path,
        originalname,
        mimetype
      );
      logSuccess(`S3 upload: ${s3Result.key}`);
    } catch (s3Error) {
      console.log("⚠️ S3 upload skipped:", s3Error.message);
      logSuccess("S3 upload skipped (using local storage)");
    }

    // STEP 10 — Cleanup local temp file
    deleteLocalFile(path);

    // Log summary
    logSummary(finalIncident, aiDecision);

    // STEP 11 — Response (Final Incident Object + Full Analysis)
    return res.json({
      // FINAL INCIDENT OBJECT (TASK 3 - Primary Response)
      incident: finalIncident,
      
      // Additional context
      status: "processed",
      mediaType: mimetype,
      frameCount: frames.length,
      
      // Vision analysis
      vision: visionResults,
      
      // Disaster categorization
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
        snippetsGenerated: snippets.length,
        llmAnalysisCompleted: aiDecision.confidence > 0,
        confidenceGatePassed: finalIncident.status === "auto_approved"
      }
    });


  } catch (err) {
    logHeader("❌ PROCESSING ERROR");
    console.error("Error:", err.message);
    console.log("═".repeat(60) + "\n");
    
    return res.status(500).json({
      error: "Upload or processing failed",
      details: err.message
    });
  }
});

export default router;
