import express from "express";
import multer from "multer";
import { preprocessMedia } from "../services/preprocessService.js";
import { analyzeFrames, categorizeDisasters, getEmergencyRecommendations } from "../services/visionService.js";
import { deleteLocalFile } from "../utils/fileUtils.js";
import { generateSnippets } from "../services/snippetService.js";

const router = express.Router();

// Multer temp storage
const upload = multer({ dest: "tmp/" });

/**
 * Vision-only analysis endpoint
 * POST /api/vision/analyze
 * Returns: [{"frame": "frame_01.jpg", "label": "Car", "confidence": 0.92}]
 */
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    console.log("👁️ Vision-only analysis request received");

    if (!req.file) {
      console.log("❌ No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path, originalname, mimetype } = req.file;

    console.log("📄 File details:", {
      name: originalname,
      type: mimetype,
      path
    });

    // Preprocess media to extract frames
    console.log("🧠 Preprocessing media...");
    const frames = await preprocessMedia(path, mimetype);
    console.log(`🖼️ Frames extracted: ${frames.length}`);

    // Run vision analysis only
    console.log("👁️ Running enhanced disaster/hazard analysis...");
    const visionResults = await analyzeFrames(frames);
    console.log("✅ Vision analysis completed");

    // Categorize disasters
    const disasterAnalysis = categorizeDisasters(visionResults);
    const emergencyRecommendations = getEmergencyRecommendations(disasterAnalysis);

    // Generate snippets (without OCR since this is vision-only)
    const snippets = generateSnippets(visionResults, []);

    // Cleanup local temp file
    deleteLocalFile(path);

    // Return comprehensive disaster analysis
    return res.json({
      snippets: snippets,
      vision: visionResults,
      disasters: disasterAnalysis,
      emergency: {
        recommendations: emergencyRecommendations,
        severity: disasterAnalysis.summary.severityLevel,
        immediateAction: emergencyRecommendations[0]?.action || "No immediate action required"
      }
    });

  } catch (err) {
    console.error("❌ Vision analysis error:", err);
    return res.status(500).json({
      error: "Vision analysis failed",
      details: err.message
    });
  }
});

/**
 * Get supported vision labels/categories
 * GET /api/vision/labels
 */
router.get("/labels", (req, res) => {
  res.json({
    status: "success",
    supportedCategories: [
      "Vehicles", "People", "Animals", "Objects", "Nature", "Buildings", 
      "Activities", "Food", "Technology", "Weather", "Transportation"
    ],
    commonLabels: [
      "Car", "Person", "Building", "Tree", "Road", "Water", "Sky", 
      "Animal", "Food", "Vehicle", "Architecture", "Nature", "Urban"
    ],
    confidenceRange: {
      min: 0.0,
      max: 1.0,
      description: "Higher values indicate more confident predictions"
    },
    frameNaming: "frame_XX.jpg (where XX is zero-padded frame number)"
  });
});

export default router;