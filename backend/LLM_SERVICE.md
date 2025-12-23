# 🤖 LLM Reasoning Service (TASK 2)

## Overview
Turns evidence snippets into incident decisions using Groq API with llama-3.1-70b-versatile model.

**This is your WOW moment!** 🎉

## File Location
```
backend/src/services/llmService.js
```

## Setup

### 1. Get Groq API Key (FREE)
1. Go to https://console.groq.com
2. Sign up for free
3. Create an API key
4. Add to `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Model Used
- **Model**: `llama-3.1-70b-versatile`
- **Provider**: Groq (Free tier)
- **Temperature**: 0.1 (deterministic output)

## Input Format
Evidence snippets from Task 1:
```json
[
  {
    "type": "flood",
    "confidence": 0.87,
    "text": "ROAD CLOSED",
    "frame": "frame_01.jpg"
  }
]
```

## Output Format (STRICT - DO NOT CHANGE)
```json
{
  "incident_type": "flood",
  "severity": 0.78,
  "location_hint": "Market Road",
  "recommended_action": "Dispatch rescue team",
  "confidence": 0.74
}
```

## API Endpoints

### 1. Direct LLM Analysis
```bash
POST /api/llm/analyze
Content-Type: application/json

{
  "snippets": [
    {"type": "flood", "confidence": 0.87, "text": "ROAD CLOSED", "frame": "frame_01.jpg"}
  ]
}
```

### 2. Full Upload (includes LLM)
```bash
POST /api/upload
# Response includes "incident" field with LLM decision
```

### 3. Health Check
```bash
GET /api/llm/health
```

### 4. Service Info
```bash
GET /api/llm/info
```

## Confidence Scoring Rules

### Bonuses (+)
| Condition | Bonus |
|-----------|-------|
| Multiple consistent evidence types | +0.2 |
| High confidence detections (>0.85) | +0.15 |
| OCR text confirming incident | +0.15 |

### Penalties (-)
| Condition | Penalty |
|-----------|---------|
| Single evidence source | -0.2 |
| Conflicting evidence | -0.3 |
| Low detection confidence (<0.7) | -0.2 |
| No OCR text | -0.1 |

## Severity Scoring Rules

| Incident Type | Base Severity |
|---------------|---------------|
| Fire | 0.80 |
| Person in danger | 0.85 |
| Flood | 0.75 |
| Vehicle accident | 0.70 |
| Smoke (no fire) | 0.50 |

### Modifiers
- Person detected: +0.15
- Vehicle involved: +0.10
- Multiple hazards: +0.10

## Incident Types

| Type | Description |
|------|-------------|
| `fire` | Active fire detected |
| `flood` | Water/flooding detected |
| `smoke` | Smoke without visible fire |
| `vehicle_accident` | Vehicle collision/accident |
| `person_in_danger` | Person in hazardous situation |
| `unknown` | Insufficient evidence |

## Recommended Actions

| Incident | Default Action |
|----------|----------------|
| Fire | Dispatch fire department immediately. Evacuate area. |
| Flood | Dispatch rescue team. Issue flood warning to residents. |
| Smoke | Investigate source. Alert fire department on standby. |
| Vehicle Accident | Dispatch ambulance and police. Secure accident scene. |
| Person in Danger | Dispatch emergency responders. Prepare medical assistance. |
| Unknown | Send patrol unit to investigate and assess situation. |

## Example Usage

### JavaScript
```javascript
import { analyzeIncident } from './src/services/llmService.js';

const snippets = [
  { type: "fire", confidence: 0.92, text: "DANGER ZONE", frame: "frame_01.jpg" },
  { type: "smoke", confidence: 0.85, text: null, frame: "frame_01.jpg" },
  { type: "person", confidence: 0.88, text: "EVACUATE NOW", frame: "frame_01.jpg" }
];

const decision = await analyzeIncident(snippets);
console.log(decision);
// {
//   "incident_type": "fire",
//   "severity": 0.95,
//   "location_hint": "DANGER ZONE",
//   "recommended_action": "Dispatch fire department immediately. Evacuate area.",
//   "confidence": 0.82
// }
```

### cURL
```bash
curl -X POST http://localhost:8000/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "snippets": [
      {"type": "flood", "confidence": 0.87, "text": "MARKET ROAD", "frame": "frame_01.jpg"},
      {"type": "vehicle", "confidence": 0.78, "text": null, "frame": "frame_01.jpg"}
    ]
  }'
```

## Prompt Engineering

### System Prompt
The LLM is instructed to:
1. Output ONLY valid JSON - no explanations
2. Be conservative with confidence scores
3. Penalize uncertainty heavily
4. Base severity on danger to human life
5. Extract location hints from OCR text

### User Prompt
Includes:
- All evidence snippets with details
- Total evidence count
- Types detected
- Average confidence

## Fallback Behavior

When Groq API is unavailable:
1. Uses rule-based decision generator
2. Applies same confidence penalties
3. Returns valid output format
4. Logs warning message

## Error Handling

### API Key Missing
```json
{
  "incident_type": "fire",
  "severity": 0.85,
  "location_hint": "DANGER ZONE",
  "recommended_action": "Dispatch fire department immediately. Evacuate area.",
  "confidence": 0.62
}
```
(Uses fallback generator)

### Invalid Input
```json
{
  "incident_type": "unknown",
  "severity": 0.0,
  "location_hint": "Unknown",
  "recommended_action": "Insufficient evidence for analysis",
  "confidence": 0.0
}
```

### LLM Error
Falls back to rule-based generator with penalty applied.

## Testing

### Run Test Script
```bash
cd backend
node test-llm.js
```

### Test Scenarios
1. **Fire Emergency** - Multiple hazards with OCR
2. **Flood Scenario** - Water + vehicle
3. **Vehicle Accident** - Vehicle + person
4. **Low Confidence** - Single weak evidence

## Performance

- **Latency**: ~500ms-2s (depends on Groq load)
- **Rate Limit**: 30 requests/minute (free tier)
- **Token Limit**: 500 max tokens per response

## Security

- API key stored in environment variable
- No sensitive data logged
- Input sanitization applied
- Response validation enforced

## Compliance

✅ **TASK 2 REQUIREMENTS**
- ✅ File: `src/services/llmService.js`
- ✅ Tool: Groq API (Free tier)
- ✅ Model: llama-3.1-70b-versatile
- ✅ Input: Evidence snippets from Task 1
- ✅ JSON-only output
- ✅ No explanations
- ✅ Explicit confidence scoring
- ✅ Penalize uncertainty
- ✅ Strict output schema

## License
Part of the CityPulse project.
