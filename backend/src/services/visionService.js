import fs from 'fs';
import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { rekognitionClient } from '../aws/awsConfig.js';

/**
 * Analyze image content using AWS Rekognition
 * Enhanced for hazard detection (fire, smoke, etc.)
 */
export async function analyzeImage(imagePath) {
  try {
    console.log("👁️ Starting enhanced hazard analysis with AWS Rekognition:", imagePath);
    
    const imageBytes = fs.readFileSync(imagePath);

    const command = new DetectLabelsCommand({
      Image: {
        Bytes: imageBytes
      },
      MaxLabels: 50, // Increased to get more labels
      MinConfidence: 50 // Lowered to catch more potential hazards
    });

    const response = await rekognitionClient.send(command);

    // Process the labels with hazard prioritization
    const labels = response.Labels.map(label => ({
      name: label.Name,
      confidence: Math.round(label.Confidence * 100) / 100,
      categories: label.Categories?.map(cat => cat.Name) || [],
      instances: label.Instances?.length || 0
    }));

    // Prioritize hazard-related labels
    const hazardKeywords = [
      'fire', 'flame', 'smoke', 'burning', 'blaze', 'inferno', 'combustion',
      'explosion', 'flood', 'water', 'storm', 'lightning', 'tornado',
      'earthquake', 'debris', 'damage', 'destruction', 'emergency',
      'accident', 'crash', 'collision', 'hazard', 'danger', 'warning'
    ];

    const hazardLabels = labels.filter(label => 
      hazardKeywords.some(keyword => 
        label.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    console.log(`✅ Enhanced analysis completed. Found ${labels.length} total labels, ${hazardLabels.length} hazard-related`);

    return {
      labels,
      hazardLabels,
      totalLabels: labels.length,
      highConfidenceLabels: labels.filter(l => l.confidence > 90),
      categories: [...new Set(labels.flatMap(l => l.categories))]
    };

  } catch (error) {
    console.error("❌ AWS Rekognition analysis failed:", error.message);
    
    if (error.message.includes('subscription') || error.message.includes('Access Key')) {
      console.log("💡 AWS Rekognition requires proper permissions. Vision analysis disabled.");
      return {
        labels: [],
        hazardLabels: [],
        totalLabels: 0,
        highConfidenceLabels: [],
        categories: [],
        error: "AWS Rekognition subscription required"
      };
    }
    
    return {
      labels: [],
      hazardLabels: [],
      totalLabels: 0,
      highConfidenceLabels: [],
      categories: [],
      error: error.message
    };
  }
}

/**
 * Analyze multiple frames for vision content - Enhanced for disaster/hazard detection
 * Returns ALL relevant labels: [{"frame": "frame_01.jpg", "label": "Fire", "confidence": 0.87}, ...]
 */
export async function analyzeFrames(frames) {
  const results = [];

  // Handle empty frames
  if (!frames || frames.length === 0) {
    console.log("⚠️ No frames to analyze");
    return [];
  }

  console.log(`👁️ Starting enhanced disaster/hazard analysis for ${frames.length} frame(s)`);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      console.log(`🖼️ Analyzing frame ${i + 1}/${frames.length}: ${frame.path}`);
      
      // Skip analysis for video files that couldn't be processed into frames
      if (frame.type === "video") {
        console.log("⚠️ Skipping vision analysis for unprocessed video file");
        results.push({
          frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
          label: "Video",
          confidence: 0.0,
          category: "unprocessed"
        });
        continue;
      }

      const analysis = await analyzeImage(frame.path);

      // Prioritize hazard labels first, then other relevant labels
      const relevantLabels = [];
      
      // 1. Add hazard labels first (highest priority)
      if (analysis.hazardLabels && analysis.hazardLabels.length > 0) {
        analysis.hazardLabels.forEach(label => {
          relevantLabels.push({
            frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
            label: label.name,
            confidence: Math.round(label.confidence) / 100,
            category: "hazard",
            priority: "high"
          });
        });
      }

      // 2. Add important object labels (vehicles, people, buildings)
      const importantKeywords = [
        'person', 'people', 'human', 'crowd', 'pedestrian',
        'car', 'vehicle', 'truck', 'bus', 'motorcycle', 'bicycle',
        'building', 'house', 'structure', 'architecture',
        'road', 'street', 'highway', 'bridge'
      ];

      const importantLabels = analysis.labels.filter(label =>
        importantKeywords.some(keyword =>
          label.name.toLowerCase().includes(keyword.toLowerCase())
        ) && !analysis.hazardLabels.some(h => h.name === label.name) // Avoid duplicates
      );

      importantLabels.forEach(label => {
        relevantLabels.push({
          frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
          label: label.name,
          confidence: Math.round(label.confidence) / 100,
          category: "important",
          priority: "medium"
        });
      });

      // 3. Add other high-confidence labels
      const otherLabels = analysis.labels
        .filter(label => 
          label.confidence > 80 && 
          !analysis.hazardLabels.some(h => h.name === label.name) &&
          !importantLabels.some(i => i.name === label.name)
        )
        .slice(0, 5); // Limit to top 5

      otherLabels.forEach(label => {
        relevantLabels.push({
          frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
          label: label.name,
          confidence: Math.round(label.confidence) / 100,
          category: "other",
          priority: "low"
        });
      });

      // If no labels found at all
      if (relevantLabels.length === 0) {
        relevantLabels.push({
          frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
          label: "Unknown",
          confidence: 0.0,
          category: "unknown",
          priority: "none"
        });
      }

      // Add all relevant labels for this frame
      results.push(...relevantLabels);

      console.log(`✅ Frame ${i + 1}: Found ${relevantLabels.length} relevant labels (${analysis.hazardLabels.length} hazards)`);

    } catch (err) {
      console.error("⚠️ Vision analysis failed for frame:", frame.path, err.message);
      results.push({
        frame: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
        label: "Error",
        confidence: 0.0,
        category: "error",
        priority: "none"
      });
    }
  }

  const hazardCount = results.filter(r => r.category === "hazard").length;
  const successfulAnalysis = results.filter(r => r.confidence > 0).length;
  console.log(`✅ Analysis completed. ${successfulAnalysis} labels detected, ${hazardCount} hazards identified`);

  return results;
}


/**
 * Analyze and categorize disasters/emergencies from vision results
 */
export function categorizeDisasters(visionResults) {
  const disasters = {
    fire: [],
    flood: [],
    accident: [],
    weather: [],
    structural: [],
    other: []
  };

  // Handle empty input
  if (!visionResults || visionResults.length === 0) {
    return {
      disasters,
      summary: {
        totalDisasters: 0,
        fireDetected: false,
        floodDetected: false,
        accidentDetected: false,
        weatherHazard: false,
        structuralDamage: false,
        severityScore: 0,
        severityLevel: 'Low'
      }
    };
  }

  const disasterCategories = {
    fire: ['fire', 'flame', 'smoke', 'burning', 'blaze', 'inferno', 'combustion', 'ash'],
    flood: ['flood', 'water', 'flooding', 'submerged', 'inundation', 'overflow'],
    accident: ['accident', 'crash', 'collision', 'wreck', 'damage', 'debris', 'destruction'],
    weather: ['storm', 'lightning', 'tornado', 'hurricane', 'cyclone', 'thunder', 'wind'],
    structural: ['collapse', 'rubble', 'broken', 'destroyed', 'damaged', 'ruins', 'earthquake']
  };

  visionResults.forEach(result => {
    if (!result || !result.label) return;
    
    const labelLower = result.label.toLowerCase();
    let categorized = false;

    // Check each disaster category
    for (const [category, keywords] of Object.entries(disasterCategories)) {
      if (keywords.some(keyword => labelLower.includes(keyword))) {
        disasters[category].push(result);
        categorized = true;
        break;
      }
    }

    // If not categorized but has high priority, add to other
    if (!categorized && result.priority === 'high') {
      disasters.other.push(result);
    }
  });

  // Calculate severity score
  const severityScore = Math.min(100, 
    (disasters.fire.length * 20) +
    (disasters.flood.length * 20) +
    (disasters.accident.length * 15) +
    (disasters.weather.length * 10) +
    (disasters.structural.length * 15)
  );

  return {
    disasters,
    summary: {
      totalDisasters: Object.values(disasters).flat().length,
      fireDetected: disasters.fire.length > 0,
      floodDetected: disasters.flood.length > 0,
      accidentDetected: disasters.accident.length > 0,
      weatherHazard: disasters.weather.length > 0,
      structuralDamage: disasters.structural.length > 0,
      severityScore,
      severityLevel: severityScore > 60 ? 'Critical' : severityScore > 30 ? 'High' : severityScore > 10 ? 'Medium' : 'Low'
    }
  };
}

/**
 * Get emergency response recommendations based on detected disasters
 */
export function getEmergencyRecommendations(disasterAnalysis) {
  const recommendations = [];

  if (disasterAnalysis.summary.fireDetected) {
    recommendations.push({
      type: 'fire',
      priority: 'critical',
      action: 'Evacuate immediately. Call fire department (911). Do not use elevators.',
      resources: ['Fire Department', 'Emergency Medical Services']
    });
  }

  if (disasterAnalysis.summary.floodDetected) {
    recommendations.push({
      type: 'flood',
      priority: 'critical',
      action: 'Move to higher ground immediately. Avoid walking or driving through flood water.',
      resources: ['Emergency Services', 'Rescue Teams', 'Weather Service']
    });
  }

  if (disasterAnalysis.summary.accidentDetected) {
    recommendations.push({
      type: 'accident',
      priority: 'high',
      action: 'Ensure scene safety. Call emergency services. Provide first aid if trained.',
      resources: ['Police', 'Ambulance', 'Fire Department']
    });
  }

  if (disasterAnalysis.summary.weatherHazard) {
    recommendations.push({
      type: 'weather',
      priority: 'high',
      action: 'Seek shelter immediately. Stay away from windows. Monitor weather alerts.',
      resources: ['Weather Service', 'Emergency Management']
    });
  }

  if (disasterAnalysis.summary.structuralDamage) {
    recommendations.push({
      type: 'structural',
      priority: 'high',
      action: 'Evacuate building. Do not enter damaged structures. Call building inspector.',
      resources: ['Building Inspector', 'Emergency Services', 'Structural Engineers']
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'none',
      priority: 'low',
      action: 'No immediate emergency detected. Continue monitoring.',
      resources: []
    });
  }

  return recommendations;
}
