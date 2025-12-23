import express from "express";
import { 
  createIncident, 
  getConfidenceThreshold, 
  needsHumanReview, 
  isAutoApproved,
  getAllIncidents,
  getIncidentById,
  getIncidentsByStatus,
  getIncidentStats
} from "../services/incidentService.js";

const router = express.Router();

/**
 * Get all incidents
 * GET /api/incident/all
 */
router.get("/all", (req, res) => {
  const incidents = getAllIncidents();
  res.json({
    count: incidents.length,
    incidents: incidents
  });
});

/**
 * Get incident statistics
 * GET /api/incident/stats
 */
router.get("/stats", (req, res) => {
  res.json(getIncidentStats());
});

/**
 * Get incident by ID
 * GET /api/incident/:id
 */
router.get("/:id", (req, res) => {
  const incident = getIncidentById(req.params.id);
  
  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }
  
  res.json(incident);
});

/**
 * Get incidents needing human review
 * GET /api/incident/status/review
 */
router.get("/status/review", (req, res) => {
  const incidents = getIncidentsByStatus("needs_human_review");
  res.json({
    count: incidents.length,
    incidents: incidents
  });
});

/**
 * Get auto-approved incidents
 * GET /api/incident/status/approved
 */
router.get("/status/approved", (req, res) => {
  const incidents = getIncidentsByStatus("auto_approved");
  res.json({
    count: incidents.length,
    incidents: incidents
  });
});

/**
 * Create incident from AI decision and evidence
 * POST /api/incident/create
 * 
 * Body: {
 *   ai_decision: { incident_type, severity, location_hint, recommended_action, confidence },
 *   evidence: [{ type, confidence, text, frame }]
 * }
 * 
 * Returns Final Incident Object:
 * {
 *   "incident_id": "uuid",
 *   "status": "needs_human_review",
 *   "ai_decision": { ... },
 *   "evidence": [ ... ],
 *   "timestamp": "ISO-8601"
 * }
 */
router.post("/create", (req, res) => {
  try {
    const { ai_decision, evidence } = req.body;

    if (!ai_decision || !evidence) {
      return res.status(400).json({
        error: "Missing required fields: ai_decision and evidence"
      });
    }

    // Validate ai_decision has confidence
    if (typeof ai_decision.confidence !== 'number') {
      return res.status(400).json({
        error: "ai_decision must include confidence score (0.0-1.0)"
      });
    }

    console.log("📋 Creating incident from AI decision...");
    
    const incident = createIncident(ai_decision, evidence);

    // Return the final incident object
    return res.json(incident);

  } catch (err) {
    console.error("❌ Incident creation error:", err);
    return res.status(500).json({
      error: "Failed to create incident",
      details: err.message
    });
  }
});

/**
 * Get confidence gate info
 * GET /api/incident/gate
 */
router.get("/gate", (req, res) => {
  const threshold = getConfidenceThreshold();
  
  res.json({
    threshold: threshold,
    description: "Confidence gate for responsible AI decision making",
    logic: {
      auto_approved: `confidence >= ${threshold}`,
      needs_human_review: `confidence < ${threshold}`
    },
    purpose: "Human-in-the-loop for low confidence decisions"
  });
});

/**
 * Check incident status
 * POST /api/incident/check
 * Body: { incident: { ... } }
 */
router.post("/check", (req, res) => {
  try {
    const { incident } = req.body;

    if (!incident) {
      return res.status(400).json({
        error: "Missing incident object"
      });
    }

    res.json({
      incident_id: incident.incident_id,
      status: incident.status,
      needs_human_review: needsHumanReview(incident),
      is_auto_approved: isAutoApproved(incident),
      confidence: incident.ai_decision?.confidence || 0,
      threshold: getConfidenceThreshold()
    });

  } catch (err) {
    console.error("❌ Status check error:", err);
    return res.status(500).json({
      error: "Failed to check incident status",
      details: err.message
    });
  }
});

export default router;