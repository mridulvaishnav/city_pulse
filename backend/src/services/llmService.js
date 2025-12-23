/**
 * LLM Reasoning Service using Groq API
 * Turns evidence snippets into incident decisions
 */

import Groq from 'groq-sdk';

// Initialize Groq client (only if API key is available)
let groq = null;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
  groq = new Groq({
    apiKey: GROQ_API_KEY
  });
}

// Model configuration
const MODEL = 'llama-3.1-70b-versatile';

/**
 * Generate incident decision from evidence snippets
 * @param {Array} snippets - Evidence snippets from Task 1
 * @returns {Object} Incident decision with strict schema
 */
export async function analyzeIncident(snippets) {
  // Validate input
  if (!snippets || snippets.length === 0) {
    return {
      incident_type: "unknown",
      severity: 0.0,
      location_hint: "Unknown",
      recommended_action: "Insufficient evidence for analysis",
      confidence: 0.0
    };
  }

  // Check if Groq client is available
  if (!groq) {
    console.log("⚠️ GROQ_API_KEY not configured. Using fallback decision generator.");
    return generateFallbackDecision(snippets);
  }

  // Build the prompt
  const prompt = buildPrompt(snippets);

  try {
    console.log("🤖 Sending evidence to Groq LLM for analysis...");
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: getSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.1, // Low temperature for consistent, deterministic output
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("Empty response from LLM");
    }

    console.log("✅ LLM analysis completed");

    // Parse and validate the response
    const decision = parseAndValidateResponse(response, snippets);
    
    return decision;

  } catch (error) {
    console.error("❌ LLM analysis failed:", error.message);
    
    // Return fallback decision based on snippets
    return generateFallbackDecision(snippets);
  }
}

/**
 * System prompt for strict JSON output
 */
function getSystemPrompt() {
  return `You are an emergency incident analyzer. Your task is to analyze evidence from disaster scenes and make incident decisions.

CRITICAL RULES:
1. Output ONLY valid JSON - no explanations, no markdown, no extra text
2. Be conservative with confidence scores - penalize uncertainty heavily
3. If evidence is weak or conflicting, lower the confidence score significantly
4. Base severity on the potential danger to human life and property
5. Extract location hints from OCR text when available

OUTPUT SCHEMA (STRICT - DO NOT DEVIATE):
{
  "incident_type": "flood|fire|smoke|vehicle_accident|person_in_danger|unknown",
  "severity": 0.0-1.0,
  "location_hint": "extracted from OCR or 'Unknown'",
  "recommended_action": "specific emergency response action",
  "confidence": 0.0-1.0
}

CONFIDENCE SCORING RULES:
- Multiple consistent evidence types: +0.2
- High confidence detections (>0.85): +0.15
- OCR text confirming incident: +0.15
- Single evidence source: -0.2
- Conflicting evidence: -0.3
- Low detection confidence (<0.7): -0.2
- No OCR text: -0.1

SEVERITY SCORING RULES:
- Fire detected: base 0.8
- Flood detected: base 0.75
- Person in danger: +0.15
- Vehicle involved: +0.1
- Multiple hazards: +0.1
- Smoke only (no fire): base 0.5

RESPOND WITH JSON ONLY.`;
}

/**
 * Build the user prompt from evidence snippets
 */
function buildPrompt(snippets) {
  const evidenceList = snippets.map((s, i) => {
    return `Evidence ${i + 1}:
- Type: ${s.type}
- Confidence: ${(s.confidence * 100).toFixed(1)}%
- OCR Text: ${s.text || 'None'}
- Frame: ${s.frame}`;
  }).join('\n\n');

  return `Analyze the following evidence snippets from a disaster scene and provide an incident decision.

EVIDENCE:
${evidenceList}

Total evidence items: ${snippets.length}
Types detected: ${[...new Set(snippets.map(s => s.type))].join(', ')}
Average confidence: ${(snippets.reduce((sum, s) => sum + s.confidence, 0) / snippets.length * 100).toFixed(1)}%

Provide your incident decision as JSON only.`;
}

/**
 * Parse and validate LLM response
 */
function parseAndValidateResponse(response, snippets) {
  let parsed;
  
  try {
    parsed = JSON.parse(response);
  } catch (e) {
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Invalid JSON response");
    }
  }

  // Validate and sanitize the response
  const validTypes = ['flood', 'fire', 'smoke', 'vehicle_accident', 'person_in_danger', 'unknown'];
  
  const decision = {
    incident_type: validTypes.includes(parsed.incident_type) 
      ? parsed.incident_type 
      : determineIncidentType(snippets),
    severity: clamp(parseFloat(parsed.severity) || 0, 0, 1),
    location_hint: sanitizeString(parsed.location_hint) || extractLocationFromSnippets(snippets),
    recommended_action: sanitizeString(parsed.recommended_action) || getDefaultAction(parsed.incident_type),
    confidence: clamp(parseFloat(parsed.confidence) || 0, 0, 1)
  };

  // Apply confidence penalties for uncertainty
  decision.confidence = applyConfidencePenalties(decision, snippets);

  return decision;
}

/**
 * Generate fallback decision when LLM fails
 */
function generateFallbackDecision(snippets) {
  // Handle empty snippets array
  if (!snippets || snippets.length === 0) {
    return {
      incident_type: "unknown",
      severity: 0.4,
      location_hint: "Unknown",
      recommended_action: "Send patrol unit to investigate and assess situation.",
      confidence: 0.3
    };
  }
  
  const incidentType = determineIncidentType(snippets);
  const avgConfidence = snippets.reduce((sum, s) => sum + (s.confidence || 0), 0) / snippets.length;
  
  return {
    incident_type: incidentType,
    severity: calculateSeverity(incidentType, snippets),
    location_hint: extractLocationFromSnippets(snippets),
    recommended_action: getDefaultAction(incidentType),
    confidence: Math.max(0.3, (avgConfidence || 0.5) * 0.7) // Penalize fallback decisions
  };
}

/**
 * Determine incident type from snippets
 */
function determineIncidentType(snippets) {
  if (!snippets || snippets.length === 0) return 'unknown';
  
  const types = snippets.map(s => (s.type || '').toLowerCase());
  
  if (types.includes('fire')) return 'fire';
  if (types.includes('flood')) return 'flood';
  if (types.includes('smoke')) return 'smoke';
  if (types.includes('vehicle')) return 'vehicle_accident';
  if (types.includes('person')) return 'person_in_danger';
  
  return 'unknown';
}

/**
 * Calculate severity based on incident type and evidence
 */
function calculateSeverity(incidentType, snippets) {
  let baseSeverity = 0.5;
  
  switch (incidentType) {
    case 'fire': baseSeverity = 0.8; break;
    case 'flood': baseSeverity = 0.75; break;
    case 'smoke': baseSeverity = 0.5; break;
    case 'vehicle_accident': baseSeverity = 0.7; break;
    case 'person_in_danger': baseSeverity = 0.85; break;
    default: baseSeverity = 0.4;
  }

  // Handle empty snippets
  if (!snippets || snippets.length === 0) {
    return baseSeverity;
  }

  // Adjust based on evidence
  const hasPerson = snippets.some(s => s && s.type === 'person');
  const hasVehicle = snippets.some(s => s && s.type === 'vehicle');
  const multipleHazards = new Set(snippets.filter(s => 
    s && ['fire', 'flood', 'smoke'].includes(s.type)
  ).map(s => s.type)).size > 1;

  if (hasPerson) baseSeverity = Math.min(1, baseSeverity + 0.1);
  if (hasVehicle) baseSeverity = Math.min(1, baseSeverity + 0.05);
  if (multipleHazards) baseSeverity = Math.min(1, baseSeverity + 0.1);

  return Math.round(baseSeverity * 100) / 100;
}

/**
 * Extract location hint from OCR text in snippets
 */
function extractLocationFromSnippets(snippets) {
  for (const snippet of snippets) {
    if (snippet.text && snippet.text.length > 0) {
      // Look for location-like text
      const text = snippet.text.toUpperCase();
      
      // Common location patterns
      const locationPatterns = [
        /(\d+\s+)?[A-Z]+\s+(ROAD|STREET|AVENUE|LANE|DRIVE|BLVD|WAY|HIGHWAY)/i,
        /NEAR\s+[A-Z]+/i,
        /AT\s+[A-Z]+/i,
        /[A-Z]+\s+AREA/i,
        /BLOCK\s+\d+/i
      ];

      for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[0];
        }
      }

      // Return the OCR text as potential location hint
      return snippet.text;
    }
  }
  
  return "Unknown";
}

/**
 * Get default recommended action based on incident type
 */
function getDefaultAction(incidentType) {
  const actions = {
    fire: "Dispatch fire department immediately. Evacuate area.",
    flood: "Dispatch rescue team. Issue flood warning to residents.",
    smoke: "Investigate source. Alert fire department on standby.",
    vehicle_accident: "Dispatch ambulance and police. Secure accident scene.",
    person_in_danger: "Dispatch emergency responders. Prepare medical assistance.",
    unknown: "Send patrol unit to investigate and assess situation."
  };

  return actions[incidentType] || actions.unknown;
}

/**
 * Apply confidence penalties based on evidence quality
 */
function applyConfidencePenalties(decision, snippets) {
  let confidence = decision.confidence;

  // Handle empty snippets
  if (!snippets || snippets.length === 0) {
    return Math.max(0, confidence - 0.3);
  }

  // Penalty for single evidence source
  if (snippets.length === 1) {
    confidence -= 0.15;
  }

  // Penalty for no OCR text
  const hasOcrText = snippets.some(s => s && s.text && s.text.length > 0);
  if (!hasOcrText) {
    confidence -= 0.1;
  }

  // Penalty for low average detection confidence
  const avgDetectionConfidence = snippets.reduce((sum, s) => sum + (s?.confidence || 0), 0) / snippets.length;
  if (avgDetectionConfidence < 0.75) {
    confidence -= 0.15;
  }

  // Bonus for multiple consistent evidence
  const uniqueTypes = new Set(snippets.filter(s => s && s.type).map(s => s.type));
  if (snippets.length >= 3 && uniqueTypes.size <= 2) {
    confidence += 0.1;
  }

  // Bonus for high confidence detections
  const highConfidenceCount = snippets.filter(s => s && s.confidence > 0.85).length;
  if (highConfidenceCount >= 2) {
    confidence += 0.1;
  }

  return clamp(Math.round(confidence * 100) / 100, 0, 1);
}

/**
 * Utility: Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Utility: Sanitize string input
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return null;
  return str.trim().substring(0, 200); // Limit length
}
