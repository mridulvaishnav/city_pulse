import express from "express";
import { analyzeIncident } from "../services/llmService.js";

const router = express.Router();

/**
 * LLM Incident Analysis endpoint
 * POST /api/llm/analyze
 * Body: { snippets: [...] }
 * 
 * Returns incident decision in strict format:
 * {
 *   "incident_type": "flood",
 *   "severity": 0.78,
 *   "location_hint": "Market Road",
 *   "recommended_action": "Dispatch rescue team",
 *   "confidence": 0.74
 * }
 */
router.post("/analyze", async (req, res) => {
  try {
    const { snippets } = req.body;

    if (!snippets || !Array.isArray(snippets)) {
      return res.status(400).json({
        error: "Missing or invalid snippets array",
        expected: '[{"type": "flood", "confidence": 0.87, "text": "ROAD CLOSED", "frame": "frame_01.jpg"}]'
      });
    }

    console.log("🤖 LLM analysis request received with", snippets.length, "snippets");

    const decision = await analyzeIncident(snippets);

    // Return ONLY the incident decision (strict format)
    return res.json(decision);

  } catch (err) {
    console.error("❌ LLM analysis error:", err);
    return res.status(500).json({
      error: "LLM analysis failed",
      details: err.message
    });
  }
});

/**
 * Health check for LLM service
 * GET /api/llm/health
 */
router.get("/health", async (req, res) => {
  try {
    // Test with minimal snippet
    const testSnippet = [{
      type: "fire",
      confidence: 0.9,
      text: "TEST",
      frame: "test.jpg"
    }];

    const decision = await analyzeIncident(testSnippet);

    res.json({
      status: "healthy",
      model: "llama-3.1-70b-versatile",
      provider: "Groq",
      testResult: decision.incident_type !== "unknown" ? "pass" : "degraded"
    });

  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      error: err.message,
      hint: "Check GROQ_API_KEY in .env file"
    });
  }
});

/**
 * Get LLM service info
 * GET /api/llm/info
 */
router.get("/info", (req, res) => {
  res.json({
    service: "LLM Incident Analyzer",
    model: "llama-3.1-70b-versatile",
    provider: "Groq (Free tier)",
    inputFormat: {
      snippets: [
        {
          type: "flood|fire|smoke|vehicle|person",
          confidence: "0.0-1.0",
          text: "OCR text or null",
          frame: "frame_XX.jpg"
        }
      ]
    },
    outputFormat: {
      incident_type: "flood|fire|smoke|vehicle_accident|person_in_danger|unknown",
      severity: "0.0-1.0",
      location_hint: "extracted from OCR or 'Unknown'",
      recommended_action: "specific emergency response action",
      confidence: "0.0-1.0"
    },
    confidenceRules: [
      "Multiple consistent evidence: +0.2",
      "High confidence detections (>0.85): +0.15",
      "OCR text confirming incident: +0.15",
      "Single evidence source: -0.2",
      "Conflicting evidence: -0.3",
      "Low detection confidence (<0.7): -0.2",
      "No OCR text: -0.1"
    ]
  });
});

export default router;