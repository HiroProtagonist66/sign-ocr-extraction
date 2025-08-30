'use client';

import { useState, useEffect } from 'react';
import extractionResults from '../../../public/extraction/image_extraction_results.json';

interface ExtractionStats {
  detected: number;
  extracted: number;
  accuracy: number;
}

export default function ColorExtractionPage() {
  const [stats, setStats] = useState<ExtractionStats>({
    detected: 0,
    extracted: 0,
    accuracy: 0
  });
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    // Calculate stats
    const detected = 99; // From color detection
    const extracted = extractionResults.total_signs_detected;
    const accuracy = detected > 0 ? (extracted / detected) * 100 : 0;
    
    setStats({ detected, extracted, accuracy });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Color-Based Sign Extraction Results
        </h1>
        
        {/* Status Banner */}
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6">
          <p className="font-bold">Extraction Pipeline Status</p>
          <p>Color detection is working! OCR needs tuning to extract sign numbers from detected boxes.</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">99</div>
            <div className="text-sm text-gray-600">Color Boxes Detected</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.extracted}</div>
            <div className="text-sm text-gray-600">Signs Extracted (OCR)</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Extraction Rate</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-purple-600">400</div>
            <div className="text-sm text-gray-600">DPI Resolution</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {showOriginal ? 'Original Plan' : 'Detection Visualization'}
                </h2>
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {showOriginal ? 'Show Detection' : 'Show Original'}
                </button>
              </div>
              
              <div className="relative overflow-auto max-h-[700px] border rounded">
                <img 
                  src={showOriginal 
                    ? "/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
                    : "/extraction/detected_signs.jpg"
                  }
                  alt={showOriginal ? "Original floor plan" : "Detected signs visualization"}
                  className="max-w-none"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              
              {!showOriginal && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>🟩 Green boxes indicate detected sign locations</p>
                  <p>📝 Labels show extracted sign numbers (when OCR succeeds)</p>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Extraction Details */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">Extraction Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Source:</span>
                  <span className="text-gray-600">COLO 2 Plan</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Image Size:</span>
                  <span className="text-gray-600">6048 x 4320 px</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Processing Time:</span>
                  <span className="text-gray-600">~10 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Method:</span>
                  <span className="text-gray-600">HSV Color Detection</span>
                </div>
              </div>
            </div>

            {/* Color Range Settings */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">HSV Color Range</h2>
              <div className="space-y-2 text-sm font-mono">
                <div className="p-2 bg-gray-100 rounded">
                  <div className="text-green-600">Lower: [8, 80, 80]</div>
                  <div className="text-red-600">Upper: [25, 255, 220]</div>
                </div>
                <p className="text-xs text-gray-500">
                  Targeting orange/brown sign boxes
                </p>
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">Pipeline Status</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">PDF to Image Conversion</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Color Detection (HSV)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Box Filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">OCR Extraction (Needs Tuning)</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h3 className="font-semibold mb-2">Next Steps</h3>
              <ul className="text-sm space-y-1">
                <li>• Tune OCR preprocessing parameters</li>
                <li>• Adjust HSV ranges if needed</li>
                <li>• Test with different PSM modes</li>
                <li>• Consider template matching for numbers</li>
              </ul>
            </div>

            {/* Detected Signs List (when OCR works) */}
            {extractionResults.signs && extractionResults.signs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-3">
                  Extracted Signs ({extractionResults.signs.length})
                </h2>
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    {extractionResults.signs.map((sign: any, index: number) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{sign.sign_number}</span>
                          <span className="text-gray-500">
                            {sign.confidence?.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          ({sign.bbox.x_percentage.toFixed(1)}%, {sign.bbox.y_percentage.toFixed(1)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Technical Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Detection Process:</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Convert image to HSV color space</li>
                <li>Apply HSV range mask for orange/brown colors</li>
                <li>Morphological operations (dilate/erode)</li>
                <li>Find contours and filter by size/aspect ratio</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-1">OCR Process:</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Crop detected box regions</li>
                <li>Preprocess (grayscale, denoise, threshold)</li>
                <li>Apply Tesseract with number whitelist</li>
                <li>Validate and clean extracted text</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}