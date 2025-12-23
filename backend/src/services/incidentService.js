/**
 * Incident Service - Confidence Gate + Final Incident Object + Persistence
 * Demonstrates responsible AI + human-in-the-loop
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Confidence threshold for auto-approval
const CONFIDENCE_THRESHOLD = 0.6;

// Persistence file path
const INCIDENTS_FILE = path.join(process.cwd(), 'incidents.json');

// In-memory cache
let incidentsCache = [];

/**
 * Load incidents from file on startup
 */
function loadIncidents() {
  try {
    if (fs.existsSync(INCIDENTS_FILE)) {
      const data = fs.readFileSync(INCIDENTS_FILE, 'utf8');
      incidentsCache = JSON.parse(data);
      console.log(`📂 Loaded ${incidentsCache.length} incidents from storage`);
    }
  } catch (err) {
    console.log("📂 No existing incidents file, starting fresh");
    incidentsCache = [];
  }
}

/**
 * Save incidents to file
 */
function saveIncidents() {
  try {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidentsCache, null, 2));
  } catch (err) {
    console.error("❌ Failed to save incidents:", err.message);
  }
}

// Load incidents on module initialization
loadIncidents();

/**
 * Create final incident object with confidence gate
 * @param {Object} aiDecision - LLM decision from Task 2
 * @param {Array} evidence - Evidence snippets from Task 1
 * @returns {Object} Final incident object with status
 */
export function createIncident(aiDecision, evidence) {
  // Apply confidence gate (SIMPLE ON PURPOSE)
  let status;
  if (aiDecision.confidence >= CONFIDENCE_THRESHOLD) {
    status = "auto_approved";
  } else {
    status = "needs_human_review";
  }

  // Generate final incident object
  const incident = {
    incident_id: randomUUID(),
    status: status,
    ai_decision: aiDecision,
    evidence: evidence,
    timestamp: new Date().toISOString()
  };

  // Persist incident
  incidentsCache.push(incident);
  saveIncidents();

  // Log the decision
  console.log(`🚦 Confidence Gate: ${(aiDecision.confidence * 100).toFixed(1)}% → ${status}`);
  console.log(`💾 Incident saved. Total: ${incidentsCache.length}`);

  return incident;
}

/**
 * Get all incidents
 * @returns {Array} All stored incidents
 */
export function getAllIncidents() {
  return incidentsCache;
}

/**
 * Get incident by ID
 * @param {string} incidentId - Incident UUID
 * @returns {Object|null} Incident or null if not found
 */
export function getIncidentById(incidentId) {
  return incidentsCache.find(i => i.incident_id === incidentId) || null;
}

/**
 * Get incidents by status
 * @param {string} status - "auto_approved" or "needs_human_review"
 * @returns {Array} Filtered incidents
 */
export function getIncidentsByStatus(status) {
  return incidentsCache.filter(i => i.status === status);
}

/**
 * Get incident count
 * @returns {Object} Count statistics
 */
export function getIncidentStats() {
  return {
    total: incidentsCache.length,
    auto_approved: incidentsCache.filter(i => i.status === "auto_approved").length,
    needs_human_review: incidentsCache.filter(i => i.status === "needs_human_review").length
  };
}

/**
 * Get confidence gate threshold
 * @returns {number} Current threshold value
 */
export function getConfidenceThreshold() {
  return CONFIDENCE_THRESHOLD;
}

/**
 * Check if incident needs human review
 * @param {Object} incident - Final incident object
 * @returns {boolean} True if needs human review
 */
export function needsHumanReview(incident) {
  return incident.status === "needs_human_review";
}

/**
 * Check if incident is auto-approved
 * @param {Object} incident - Final incident object
 * @returns {boolean} True if auto-approved
 */
export function isAutoApproved(incident) {
  return incident.status === "auto_approved";
}
