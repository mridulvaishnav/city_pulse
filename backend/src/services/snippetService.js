/**
 * Evidence Snippet Generator
 * Merges Rekognition labels + OCR text into clean, explainable evidence
 */

/**
 * Generate evidence snippets from vision and OCR results
 * @param {Array} visionResults - Array of vision analysis results
 * @param {Array} ocrResults - Array of OCR results
 * @returns {Array} Array of evidence snippets (max 3-5)
 */
export function generateSnippets(visionResults, ocrResults) {
  const snippets = [];
  
  // Handle empty inputs
  if (!visionResults || visionResults.length === 0) {
    return [];
  }
  
  // Allowed label types (strict filter)
  const allowedTypes = ['flood', 'fire', 'smoke', 'vehicle', 'person'];
  
  // Filter vision results by confidence > 70% and allowed types
  const filteredVision = visionResults.filter(result => {
    if (!result || result.confidence <= 0.70) return false;
    
    const labelLower = (result.label || '').toLowerCase();
    return allowedTypes.some(type => labelLower.includes(type));
  });

  // Create a map of OCR text by frame
  const ocrByFrame = {};
  ocrResults.forEach(ocr => {
    if (ocr.text && ocr.text.length > 0 && ocr.textFound) {
      // Extract frame number from path (e.g., "tmp/abc123" -> use frame number from result)
      const frameKey = ocr.frame || ocr.path;
      ocrByFrame[frameKey] = ocr.text.filter(line => 
        line.length > 0 && 
        !line.startsWith('[OCR') && 
        !line.includes('Video file')
      );
    }
  });

  // Process each filtered vision result
  filteredVision.forEach(vision => {
    // Determine the type based on label
    let type = null;
    const labelLower = vision.label.toLowerCase();
    
    for (const allowedType of allowedTypes) {
      if (labelLower.includes(allowedType)) {
        type = allowedType;
        break;
      }
    }

    if (!type) return; // Skip if no type matched

    // Try to find matching OCR text for this frame
    let ocrText = null;
    
    // Try to match by frame name
    const frameMatch = Object.keys(ocrByFrame).find(key => {
      // Match if the frame names are similar or if frame numbers match
      return key.includes(vision.frame) || vision.frame.includes(key);
    });

    if (frameMatch && ocrByFrame[frameMatch] && ocrByFrame[frameMatch].length > 0) {
      // Take the first meaningful OCR text line
      ocrText = ocrByFrame[frameMatch][0];
    }

    // Create snippet
    const snippet = {
      type: type,
      confidence: Math.round(vision.confidence * 100) / 100, // Ensure decimal format
      text: ocrText || null,
      frame: vision.frame
    };

    snippets.push(snippet);
  });

  // Sort by confidence (highest first) and limit to 3-5 snippets
  snippets.sort((a, b) => b.confidence - a.confidence);
  
  // Return max 5 snippets, but at least 3 if available
  const maxSnippets = Math.min(5, Math.max(3, snippets.length));
  return snippets.slice(0, maxSnippets);
}
