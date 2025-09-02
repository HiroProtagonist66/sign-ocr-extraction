// Sign Type Auto-Detection Library
// Detects sign types from page images using pattern matching

// Common sign type patterns found in drawings
export const SIGN_TYPE_PATTERNS = [
  /BC-\d+\.\d+[A-Z]?/g,     // BC-1.0, BC-1.14A, BC-5.2
  /PAC-\d+\.\d+[A-Z]?/g,     // PAC-1.1, PAC-2.3
  /ID-\d+\.\d+[A-Z]?/g,      // ID-5.2
  /BID-\d+\.\d+[A-Z]?/g,     // BID-1.2
  /MSC-\d+\.\d+[A-Z]?/g,     // MSC-1.0
  /COLO-\d+\.\d+[A-Z]?/g,    // COLO-specific
  /BC-\d+[A-Z]?(?!\.\d)/g,   // BC-1, BC-2 (without decimal)
];

// Title block keywords that indicate sign type
const TITLE_BLOCK_KEYWORDS = [
  'SIGN TYPE',
  'SIGNAGE TYPE',
  'SIGN CODE',
  'TYPE:',
  'SIGN:',
  'EXIT SIGN',
  'FIRE BARRIER',
  'ROOM ID'
];

// Confidence calculation based on context
export function calculateConfidence(
  detectedType: string,
  frequency: number,
  location: 'title_block' | 'body' | 'header'
): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence for title block location
  if (location === 'title_block') {
    confidence += 0.3;
  } else if (location === 'header') {
    confidence += 0.2;
  }
  
  // Higher confidence for more frequent occurrences
  if (frequency > 5) {
    confidence += 0.2;
  } else if (frequency > 2) {
    confidence += 0.1;
  }
  
  // Known patterns get higher confidence
  if (detectedType.match(/^BC-\d+\.\d+$/)) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}

// Get most frequent item from array
export function getMostFrequent(items: string[]): { value: string; count: number } | null {
  if (items.length === 0) return null;
  
  const frequency: Record<string, number> = {};
  items.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  const sorted = Object.entries(frequency)
    .sort(([,a], [,b]) => b - a);
  
  if (sorted.length === 0) return null;
  
  return {
    value: sorted[0][0],
    count: sorted[0][1]
  };
}

// Extract sign types from text
export function extractSignTypesFromText(text: string): {
  types: string[];
  primaryType: string | null;
  confidence: number;
} {
  const allMatches: string[] = [];
  
  // Check each pattern
  for (const pattern of SIGN_TYPE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      allMatches.push(...matches);
    }
  }
  
  // Check for title block mentions
  let titleBlockType: string | null = null;
  for (const keyword of TITLE_BLOCK_KEYWORDS) {
    const regex = new RegExp(`${keyword}[:\\s]*(\\S+)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      // Validate it matches a sign type pattern
      for (const pattern of SIGN_TYPE_PATTERNS) {
        if (match[1].match(pattern)) {
          titleBlockType = match[1];
          break;
        }
      }
    }
  }
  
  // Get most frequent type
  const mostFrequent = getMostFrequent(allMatches);
  const primaryType = titleBlockType || mostFrequent?.value || null;
  
  // Calculate confidence
  let confidence = 0.3; // Base
  if (titleBlockType) {
    confidence = 0.9; // High confidence for title block
  } else if (mostFrequent && mostFrequent.count > 2) {
    confidence = calculateConfidence(
      mostFrequent.value,
      mostFrequent.count,
      'body'
    );
  }
  
  return {
    types: [...new Set(allMatches)], // Unique types found
    primaryType,
    confidence
  };
}

// Mock OCR function (replace with actual OCR API call)
export async function performOCR(pageNumber: number): Promise<string> {
  // This would call your Python extraction or Google Vision API
  // For now, returning mock data based on page patterns
  
  // Simulate API delay (faster for testing)
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // Generate mock data based on page ranges for testing all 119 pages
  let mockText = `Page ${pageNumber} - Floor Plan Drawing\n`;
  
  // Simulate different sign types based on page ranges
  if (pageNumber <= 10) {
    mockText += 'SIGN TYPE: BC-1.0\nEXIT SIGNS PLACEMENT\nBC-1.0 BC-1.0 BC-1.0';
  } else if (pageNumber <= 20) {
    mockText += 'BC-1.1 EXIT ROUTE\nEgress Path Signage\nBC-1.1 appears 4 times';
  } else if (pageNumber <= 30) {
    mockText += 'FIRE BARRIER SIGNAGE\nBC-5.1 1-HOUR RATED\nMultiple BC-5.1 locations';
  } else if (pageNumber <= 40) {
    mockText += 'BC-5.2 2-HOUR FIRE BARRIER\nBC-5.2 BC-5.2 BC-5.2 BC-5.2';
  } else if (pageNumber <= 50) {
    mockText += 'POWER AND COOLING\nPAC-1.1 Distribution\nPAC-1.1 signage required';
  } else if (pageNumber <= 60) {
    mockText += 'ROOM IDENTIFICATION\nID-5.2 Door Signs\nID-5.2 at all entries';
  } else if (pageNumber <= 70) {
    mockText += 'BUILDING IDENTIFICATION\nBID-1.2 Main Entrance\nBID-1.2 signage';
  } else if (pageNumber <= 80) {
    mockText += 'SIGN TYPE: BC-2.0\nFIRE EQUIPMENT LOCATION\nBC-2.0 BC-2.0';
  } else if (pageNumber <= 90) {
    mockText += 'MSC-1.0 MISCELLANEOUS SIGNAGE\nGeneral facility signs';
  } else if (pageNumber <= 100) {
    mockText += 'Multiple sign types on this page:\nBC-1.0, PAC-1.1, ID-5.2';
  } else if (pageNumber <= 110) {
    mockText += 'SIGN TYPE: BC-1.14A\nEMERGENCY EXIT LIGHTING\nBC-1.14A placement';
  } else {
    mockText += 'No specific sign type identified\nGeneral floor plan';
  }
  
  return mockText;
}

// Main detection function
export async function detectSignTypeForPage(
  pageNumber: number
): Promise<{
  type: string | null;
  confidence: number;
  allTypes: string[];
  source: 'title_block' | 'content' | 'none';
}> {
  try {
    // Perform OCR or get text from page
    const pageText = await performOCR(pageNumber);
    
    // Extract sign types
    const { types, primaryType, confidence } = extractSignTypesFromText(pageText);
    
    // Determine source
    let source: 'title_block' | 'content' | 'none' = 'none';
    if (primaryType) {
      if (pageText.toLowerCase().includes('sign type') && 
          pageText.toLowerCase().indexOf('sign type') < 200) {
        source = 'title_block';
      } else {
        source = 'content';
      }
    }
    
    return {
      type: primaryType,
      confidence,
      allTypes: types,
      source
    };
    
  } catch (error) {
    console.error(`Failed to detect sign type for page ${pageNumber}:`, error);
    return {
      type: null,
      confidence: 0,
      allTypes: [],
      source: 'none'
    };
  }
}

// Batch detection for multiple pages
export async function detectSignTypesForPages(
  pageNumbers: number[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, {
  type: string | null;
  confidence: number;
  allTypes: string[];
  source: 'title_block' | 'content' | 'none';
}>> {
  const results = new Map();
  
  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    const result = await detectSignTypeForPage(pageNum);
    results.set(pageNum, result);
    
    if (onProgress) {
      onProgress(i + 1, pageNumbers.length);
    }
  }
  
  return results;
}