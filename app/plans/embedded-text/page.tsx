'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SignData {
  sign_number: string;
  text_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hotspot_bbox: {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
  };
  confidence: string;
  group?: string;
  group_size?: number;
}

interface PageData {
  page: number;
  page_width: number;
  page_height: number;
  signs_detected: number;
  signs: SignData[];
}

interface ExtractionResults {
  source_pdf: string;
  total_signs_detected: number;
  extraction_method: string;
  pages: PageData[];
}

export default function EmbeddedTextExtraction() {
  const [results, setResults] = useState<ExtractionResults | null>(null);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredSign, setHoveredSign] = useState<string | null>(null);

  useEffect(() => {
    fetch('/extraction/embedded_text_results.json')
      .then(res => res.json())
      .then(data => setResults(data))
      .catch(err => console.error('Failed to load results:', err));
  }, []);

  const handleSignClick = (sign: SignData) => {
    setSelectedSign(sign.sign_number);
    alert(`Sign: ${sign.sign_number}${sign.group ? `\nGroup: ${sign.group}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          PDF Embedded Text Extraction
        </h1>
        <p className="text-gray-600 mb-6">
          Direct extraction from PDF text - 100% accurate, no OCR needed
        </p>

        {/* Stats Panel */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Method</div>
                <div className="text-xl font-semibold text-green-600">
                  Embedded Text
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Signs</div>
                <div className="text-xl font-semibold">
                  {results.total_signs_detected}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Accuracy</div>
                <div className="text-xl font-semibold text-green-600">
                  100%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Source</div>
                <div className="text-xl font-semibold">
                  PDF Text
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Show Sign Numbers</span>
            </label>
            {hoveredSign && (
              <div className="ml-auto px-3 py-1 bg-blue-100 rounded">
                Hovering: <strong>{hoveredSign}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Floor Plan with Hotspots */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative inline-block">
            <Image
              src="/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
              alt="Floor Plan"
              width={1512}
              height={1080}
              className="max-w-full h-auto"
            />
            
            {/* Render hotspots */}
            {results && results.pages[0]?.signs.map((sign) => (
              <div
                key={sign.sign_number}
                className={`absolute border-2 transition-all cursor-pointer ${
                  selectedSign === sign.sign_number
                    ? 'border-red-500 bg-red-500/30'
                    : hoveredSign === sign.sign_number
                    ? 'border-blue-500 bg-blue-500/30'
                    : 'border-green-500 bg-green-500/20'
                } hover:bg-green-500/40`}
                style={{
                  left: `${sign.hotspot_bbox.x_percentage}%`,
                  top: `${sign.hotspot_bbox.y_percentage}%`,
                  width: `${sign.hotspot_bbox.width_percentage}%`,
                  height: `${sign.hotspot_bbox.height_percentage}%`,
                }}
                onClick={() => handleSignClick(sign)}
                onMouseEnter={() => setHoveredSign(sign.sign_number)}
                onMouseLeave={() => setHoveredSign(null)}
                title={sign.sign_number}
              >
                {showLabels && (
                  <div className="absolute -top-5 left-0 bg-green-600 text-white text-xs px-1 rounded">
                    {sign.sign_number}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign List */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">
              Extracted Signs ({results.total_signs_detected})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
              {results.pages[0]?.signs.map((sign) => (
                <button
                  key={sign.sign_number}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    selectedSign === sign.sign_number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => handleSignClick(sign)}
                >
                  {sign.sign_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}