# 📋 Evidence Snippet Generator

## Overview
Merges AWS Rekognition labels with OCR text to create clean, explainable evidence snippets for disaster detection.

## File Location
```
backend/src/services/snippetService.js
```

## Function Signature
```javascript
generateSnippets(visionResults, ocrResults)
```

## Input Parameters

### visionResults (Array)
Array of vision analysis results from AWS Rekognition:
```javascript
[
  {
    frame: "frame_01.jpg",
    label: "Fire",
    confidence: 0.92,
    category: "hazard",
    priority: "high"
  },
  // ... more results
]
```

### ocrResults (Array)
Array of OCR results from Tesseract.js:
```javascript
[
  {
    frame: "frame_01.jpg",
    text: ["ROAD CLOSED", "DANGER AHEAD"],
    textFound: true
  },
  // ... more results
]
```

## Output Format (STRICT - DO NOT CHANGE)
```json
[
  {
    "type": "flood",
    "confidence": 0.87,
    "text": "ROAD CLOSED",
    "frame": "frame_01.jpg"
  },
  {
    "type": "fire",
    "confidence": 0.92,
    "text": "DANGER AHEAD",
    "frame": "frame_01.jpg"
  },
  {
    "type": "person",
    "confidence": 0.95,
    "text": null,
    "frame": "frame_02.jpg"
  }
]
```

## Filtering Rules (STRICT)

### 1. Confidence Threshold
- **Only labels with confidence > 70%** are included
- Labels with 70% or below are filtered out

### 2. Allowed Types (STRICT)
Only these 5 types are allowed:
- `flood`
- `fire`
- `smoke`
- `vehicle`
- `person`

Any other label types (e.g., "helmet", "building", "tree") are **filtered out**.

### 3. OCR Text Attachment
- If OCR text is available for the same frame, it's attached
- If no OCR text is found, `text` field is `null`
- Only the first meaningful OCR line is used per snippet

### 4. Output Limit
- **Maximum 5 snippets**
- **Minimum 3 snippets** (if available)
- Sorted by confidence (highest first)

## Implementation Details

### Type Matching Logic
```javascript
const labelLower = vision.label.toLowerCase();

// Matches if label contains the type keyword
if (labelLower.includes('fire')) type = 'fire';
if (labelLower.includes('flood')) type = 'flood';
if (labelLower.includes('smoke')) type = 'smoke';
if (labelLower.includes('vehicle')) type = 'vehicle';
if (labelLower.includes('person')) type = 'person';
```

### OCR Matching Logic
- Matches OCR text to vision results by frame name
- Takes the first non-empty OCR line
- Filters out error messages and system text

### Sorting Logic
- Snippets are sorted by confidence in descending order
- Highest confidence snippets appear first
- Ensures most reliable evidence is prioritized

## Usage Examples

### Example 1: Fire Scene with OCR
**Input:**
- Vision: Fire (92%), Smoke (78%), Person (95%), Helmet (100%)
- OCR: "DANGER", "EVACUATE NOW"

**Output:**
```json
[
  {
    "type": "person",
    "confidence": 0.95,
    "text": "DANGER",
    "frame": "frame_01.jpg"
  },
  {
    "type": "fire",
    "confidence": 0.92,
    "text": "DANGER",
    "frame": "frame_01.jpg"
  },
  {
    "type": "smoke",
    "confidence": 0.78,
    "text": "DANGER",
    "frame": "frame_01.jpg"
  }
]
```

**Filtered Out:**
- Helmet (not in allowed types)

### Example 2: Flood Scene without OCR
**Input:**
- Vision: Flood (87%), Vehicle (88%), Person (92%)
- OCR: None

**Output:**
```json
[
  {
    "type": "person",
    "confidence": 0.92,
    "text": null,
    "frame": "frame_01.jpg"
  },
  {
    "type": "vehicle",
    "confidence": 0.88,
    "text": null,
    "frame": "frame_01.jpg"
  },
  {
    "type": "flood",
    "confidence": 0.87,
    "text": null,
    "frame": "frame_01.jpg"
  }
]
```

### Example 3: Low Confidence Filtering
**Input:**
- Vision: Fire (92%), Smoke (65%), Person (68%)
- OCR: "FIRE ALERT"

**Output:**
```json
[
  {
    "type": "fire",
    "confidence": 0.92,
    "text": "FIRE ALERT",
    "frame": "frame_01.jpg"
  }
]
```

**Filtered Out:**
- Smoke (65% < 70%)
- Person (68% < 70%)

## API Integration

### Full Upload Endpoint
```bash
POST /api/upload
```

**Response includes:**
```json
{
  "snippets": [...],  // Evidence snippets
  "vision": [...],    // Full vision results
  "ocr": [...],       // Full OCR results
  "disasters": {...}, // Disaster analysis
  "emergency": {...}  // Emergency recommendations
}
```

### Vision-Only Endpoint
```bash
POST /api/vision/analyze
```

**Response includes:**
```json
{
  "snippets": [...],  // Evidence snippets (without OCR)
  "vision": [...],    // Full vision results
  "disasters": {...}, // Disaster analysis
  "emergency": {...}  // Emergency recommendations
}
```

## Testing

### Unit Test
```javascript
import { generateSnippets } from './src/services/snippetService.js';

const visionResults = [
  { frame: "frame_01.jpg", label: "Fire", confidence: 0.92, category: "hazard" },
  { frame: "frame_01.jpg", label: "Person", confidence: 0.95, category: "important" }
];

const ocrResults = [
  { frame: "frame_01.jpg", text: ["DANGER"], textFound: true }
];

const snippets = generateSnippets(visionResults, ocrResults);
console.log(JSON.stringify(snippets, null, 2));
```

### API Test
```bash
# Upload a fire/flood/accident image
curl -X POST http://localhost:8000/api/upload \
  -F "file=@fire-scene.jpg"

# Check the "snippets" field in the response
```

## Performance Considerations

### Time Complexity
- O(n * m) where n = vision results, m = OCR results
- Typically very fast (< 10ms) for normal use cases

### Memory Usage
- Minimal - only stores filtered results
- Max 5 snippets regardless of input size

## Error Handling

### No Matching Labels
If no labels match the criteria:
```json
[]  // Empty array
```

### No OCR Text
If OCR fails or finds no text:
```json
[
  {
    "type": "fire",
    "confidence": 0.92,
    "text": null,  // null instead of empty string
    "frame": "frame_01.jpg"
  }
]
```

## Limitations

1. **Type Restriction**: Only 5 types allowed (flood, fire, smoke, vehicle, person)
2. **Confidence Threshold**: Fixed at 70% (not configurable)
3. **OCR Matching**: Simple frame name matching (may miss some matches)
4. **Single OCR Line**: Only first OCR line per snippet (not all text)

## Future Enhancements

- [ ] Configurable confidence threshold
- [ ] Additional allowed types
- [ ] Multiple OCR lines per snippet
- [ ] Better frame-to-OCR matching algorithm
- [ ] Snippet deduplication
- [ ] Temporal analysis for video sequences

## Compliance

✅ **STRICT SCOPE COMPLIANCE**
- ✅ One file: `services/snippetService.js`
- ✅ One function: `generateSnippets()`
- ✅ Exact output format maintained
- ✅ Filtering rules strictly enforced
- ✅ 3-5 snippets max
- ✅ Confidence > 70%
- ✅ Only 5 allowed types

## License
Part of the CityPulse project.
