# 🚨 CityPulse Disaster Detection System

## Overview
Enhanced vision analysis system specifically designed to detect disasters, accidents, and emergency situations from images and videos.

## Detected Hazards & Disasters

### 🔥 Fire & Combustion
- Fire, Flames, Smoke, Burning, Blaze, Inferno, Combustion, Ash

### 🌊 Flood & Water Hazards
- Flood, Flooding, Submerged, Inundation, Water Overflow

### 🚗 Accidents & Collisions
- Car Accidents, Crashes, Collisions, Wrecks, Damage, Debris, Destruction

### ⛈️ Weather Hazards
- Storms, Lightning, Tornadoes, Hurricanes, Cyclones, Thunder, High Winds

### 🏚️ Structural Damage
- Building Collapse, Rubble, Destroyed Structures, Ruins, Earthquake Damage

### 👥 Important Objects
- People, Crowds, Pedestrians
- Vehicles (Cars, Trucks, Buses, Motorcycles)
- Buildings, Houses, Structures
- Roads, Streets, Highways, Bridges

## API Endpoints

### 1. Full Analysis (OCR + Vision + Disasters)
```bash
POST /api/upload
Content-Type: multipart/form-data

# Upload image or video file
```

**Response Format:**
```json
{
  "status": "processed",
  "vision": [
    {
      "frame": "frame_01.jpg",
      "label": "Fire",
      "confidence": 0.87,
      "category": "hazard",
      "priority": "high"
    },
    {
      "frame": "frame_01.jpg",
      "label": "Person",
      "confidence": 0.95,
      "category": "important",
      "priority": "medium"
    }
  ],
  "disasters": {
    "disasters": {
      "fire": [...],
      "flood": [...],
      "accident": [...],
      "weather": [...],
      "structural": [...]
    },
    "summary": {
      "totalDisasters": 5,
      "fireDetected": true,
      "floodDetected": false,
      "accidentDetected": false,
      "weatherHazard": false,
      "structuralDamage": false,
      "severityScore": 85,
      "severityLevel": "Critical"
    }
  },
  "emergency": {
    "severity": "Critical",
    "immediateAction": "Evacuate immediately. Call fire department (911).",
    "recommendations": [
      {
        "type": "fire",
        "priority": "critical",
        "action": "Evacuate immediately. Call fire department (911). Do not use elevators.",
        "resources": ["Fire Department", "Emergency Medical Services"]
      }
    ]
  }
}
```

### 2. Vision-Only Analysis
```bash
POST /api/vision/analyze
Content-Type: multipart/form-data

# Upload image or video file
```

**Response:** Same as above but without OCR and S3 data

### 3. Supported Labels Info
```bash
GET /api/vision/labels
```

## Detection Features

### 1. Multi-Label Detection
- Returns **ALL relevant labels**, not just the top one
- Prioritizes hazards and disasters first
- Includes vehicles, people, and infrastructure

### 2. Priority System
- **High Priority**: Hazards (fire, flood, accidents)
- **Medium Priority**: Important objects (people, vehicles, buildings)
- **Low Priority**: Other high-confidence labels

### 3. Severity Scoring
- **Critical** (60-100): Immediate life-threatening situation
- **High** (30-60): Serious hazard requiring urgent response
- **Medium** (10-30): Potential hazard, monitor closely
- **Low** (0-10): No immediate danger detected

### 4. Emergency Recommendations
- Automatic action recommendations based on detected disasters
- Resource allocation suggestions
- Priority-based response guidance

## Configuration

### Adjust Detection Sensitivity
Edit `backend/src/services/visionService.js`:

```javascript
const command = new DetectLabelsCommand({
  Image: { Bytes: imageBytes },
  MaxLabels: 50,        // Increase for more labels
  MinConfidence: 50     // Lower for more detections (50-90)
});
```

### Add Custom Hazard Keywords
Edit the `hazardKeywords` array:

```javascript
const hazardKeywords = [
  'fire', 'flame', 'smoke', 'burning',
  // Add your custom keywords here
  'explosion', 'gas leak', 'chemical spill'
];
```

## Testing

### Test with Your Own Image
```bash
node test-disaster-detection.js path/to/your/image.jpg
```

### Example Output
```
═══════════════════════════════════════════════════════
🔍 VISION ANALYSIS RESULTS
═══════════════════════════════════════════════════════

📊 All Detected Labels:
🚨 1. Fire
   Confidence: 87.5%
   Category: hazard | Priority: high

⚠️ 2. Person
   Confidence: 95.2%
   Category: important | Priority: medium

═══════════════════════════════════════════════════════
🚨 DISASTER ANALYSIS
═══════════════════════════════════════════════════════

📈 Severity: Critical (Score: 85/100)
🔥 Fire Detected: YES
🌊 Flood Detected: NO
🚗 Accident Detected: NO

═══════════════════════════════════════════════════════
🚑 EMERGENCY RECOMMENDATIONS
═══════════════════════════════════════════════════════

⚠️  Severity Level: Critical

🎯 Immediate Action:
   Evacuate immediately. Call fire department (911).
```

## Limitations

1. **AWS Rekognition Limitations**:
   - May not always detect "fire" directly
   - Better at detecting objects (helmets, vehicles) than conditions (flames)
   - Confidence varies based on image quality

2. **Workarounds**:
   - System detects related objects (smoke, flames, burning)
   - Lowered confidence threshold to catch more labels
   - Returns multiple labels to provide context

3. **Recommendations**:
   - Use high-quality, well-lit images
   - Multiple angles improve detection
   - Video frames provide more context

## Future Enhancements

- [ ] Custom ML model for fire/disaster detection
- [ ] Color analysis for fire detection (orange/red hues)
- [ ] Temporal analysis for video sequences
- [ ] Integration with weather APIs
- [ ] Historical disaster pattern analysis
- [ ] Real-time alert system
- [ ] Geographic disaster mapping

## Support

For issues or questions:
1. Check AWS Rekognition permissions
2. Verify image quality and format
3. Review confidence thresholds
4. Test with multiple images

## License

Part of the CityPulse project.
