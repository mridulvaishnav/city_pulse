/**
 * Demo-safe logging utilities
 * Ensures clear console output for demonstrations
 */

export function logHeader(message) {
  console.log("\n" + "═".repeat(60));
  console.log(message);
  console.log("═".repeat(60));
}

export function logStep(stepNumber, message) {
  console.log("\n" + "─".repeat(60));
  console.log(`🔄 STEP ${stepNumber}: ${message}`);
}

export function logSuccess(message) {
  console.log(`✅ ${message}`);
}

export function logError(message) {
  console.error(`❌ ${message}`);
}

export function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

export function logSummary(incident, aiDecision) {
  console.log("\n" + "═".repeat(60));
  console.log("✅ PROCESSING COMPLETE");
  console.log("═".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   - Incident ID: ${incident.incident_id}`);
  console.log(`   - Status: ${incident.status}`);
  console.log(`   - Type: ${aiDecision.incident_type}`);
  console.log(`   - Severity: ${(aiDecision.severity * 100).toFixed(0)}%`);
  console.log(`   - Confidence: ${(aiDecision.confidence * 100).toFixed(1)}%`);
  if (incident.status === "needs_human_review") {
    console.log(`   - 👤 Human review triggered`);
  }
  console.log("═".repeat(60) + "\n");
}
