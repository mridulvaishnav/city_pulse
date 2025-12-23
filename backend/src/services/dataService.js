/**
 * Data processing and management utilities for CityPulse
 * This service handles data aggregation, filtering, and insights
 */

/**
 * Aggregate OCR results into meaningful text blocks
 */
export function aggregateOCRResults(ocrResults) {
  const allText = [];
  const textByFrame = {};
  
  ocrResults.forEach(result => {
    if (result.text && result.text.length > 0) {
      const frameText = result.text.filter(line => 
        line.length > 0 && 
        !line.startsWith('[OCR Error:') &&
        !line.includes('Video file -')
      );
      
      if (frameText.length > 0) {
        allText.push(...frameText);
        textByFrame[`frame_${result.frameNumber || 1}`] = frameText;
      }
    }
  });

  return {
    allText,
    textByFrame,
    totalLines: allText.length,
    uniqueLines: [...new Set(allText)],
    averageLineLength: allText.length > 0 ? 
      Math.round(allText.reduce((sum, line) => sum + line.length, 0) / allText.length) : 0
  };
}

/**
 * Aggregate vision analysis results
 */
export function aggregateVisionResults(visionResults) {
  const allLabels = [];
  const labelCounts = {};
  const categoryCounts = {};
  
  visionResults.forEach(result => {
    if (result.labels && result.labels.length > 0) {
      result.labels.forEach(label => {
        allLabels.push(label);
        
        // Count label occurrences
        labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
        
        // Count category occurrences
        if (label.categories) {
          label.categories.forEach(category => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }
      });
    }
  });

  // Sort by frequency
  const topLabels = Object.entries(labelCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalLabels: allLabels.length,
    uniqueLabels: Object.keys(labelCounts).length,
    topLabels,
    topCategories,
    averageConfidence: allLabels.length > 0 ? 
      Math.round(allLabels.reduce((sum, label) => sum + label.confidence, 0) / allLabels.length) : 0
  };
}

/**
 * Generate comprehensive insights from all analysis results
 */
export function generateInsights(ocrResults, visionResults, cityInsights) {
  const ocrAggregated = aggregateOCRResults(ocrResults);
  const visionAggregated = aggregateVisionResults(visionResults);
  
  // Detect potential city-related text
  const cityKeywords = [
    'street', 'avenue', 'road', 'boulevard', 'lane', 'drive',
    'city', 'town', 'downtown', 'metro', 'urban',
    'parking', 'stop', 'station', 'transit', 'bus',
    'restaurant', 'hotel', 'shop', 'store', 'mall',
    'hospital', 'school', 'university', 'library',
    'park', 'plaza', 'square', 'center', 'building'
  ];

  const cityRelatedText = ocrAggregated.allText.filter(line =>
    cityKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  // Calculate content richness score
  const contentRichness = Math.min(100, Math.round(
    (ocrAggregated.totalLines * 2 + 
     visionAggregated.uniqueLabels * 3 + 
     cityInsights.overallCityScore) / 3
  ));

  return {
    summary: {
      contentRichness,
      hasText: ocrAggregated.totalLines > 0,
      hasVisionData: visionAggregated.totalLabels > 0,
      cityRelevance: cityInsights.overallCityScore,
      processingQuality: contentRichness > 50 ? 'High' : contentRichness > 20 ? 'Medium' : 'Low'
    },
    textInsights: {
      ...ocrAggregated,
      cityRelatedText,
      hasCityContent: cityRelatedText.length > 0
    },
    visionInsights: visionAggregated,
    cityInsights,
    recommendations: generateRecommendations(ocrAggregated, visionAggregated, cityInsights)
  };
}

/**
 * Generate actionable recommendations based on analysis results
 */
function generateRecommendations(ocrData, visionData, cityData) {
  const recommendations = [];

  // OCR recommendations
  if (ocrData.totalLines === 0) {
    recommendations.push({
      type: 'ocr',
      priority: 'medium',
      message: 'No text detected. Consider using higher resolution images or ensuring text is clearly visible.'
    });
  } else if (ocrData.averageLineLength < 5) {
    recommendations.push({
      type: 'ocr',
      priority: 'low',
      message: 'Short text lines detected. Image may contain fragmented text or symbols.'
    });
  }

  // Vision recommendations
  if (visionData.totalLabels === 0) {
    recommendations.push({
      type: 'vision',
      priority: 'high',
      message: 'No visual elements detected. Check AWS Rekognition permissions or image quality.'
    });
  } else if (visionData.averageConfidence < 70) {
    recommendations.push({
      type: 'vision',
      priority: 'medium',
      message: 'Low confidence in visual detection. Consider using higher quality images.'
    });
  }

  // City relevance recommendations
  if (cityData.overallCityScore < 20) {
    recommendations.push({
      type: 'city',
      priority: 'low',
      message: 'Low city relevance detected. This content may not be urban-focused.'
    });
  } else if (cityData.overallCityScore > 80) {
    recommendations.push({
      type: 'city',
      priority: 'high',
      message: 'High city relevance! This content is excellent for urban analysis.'
    });
  }

  // Processing recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      priority: 'high',
      message: 'Excellent processing results! All analysis components worked well.'
    });
  }

  return recommendations;
}