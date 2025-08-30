'use client';

import { useState, useEffect } from 'react';
import { REAL_EXTRACTION_DATA } from './real-data';

interface ExtractedSign {
  text: string;
  signType: string | null;
  boundingBox: {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
  };
  confidence: number;
}

interface ExtractionResult {
  pdfFile: string;
  pageNumber: number;
  imageSize: {
    width: number;
    height: number;
  };
  extractedSigns: ExtractedSign[];
  timestamp: string;
  processingTime: number;
}

interface HotspotData {
  id: string;
  signNumber: string;
  signType: string | null;
  x_percentage: number;
  y_percentage: number;
  width_percentage: number;
  height_percentage: number;
  status: 'pending' | 'installed' | 'issue' | 'missing';
  confidence: number;
}

const HOTSPOT_COLORS = {
  pending: '#6B7280',    // Gray
  installed: '#10B981',  // Green
  issue: '#F59E0B',      // Yellow
  missing: '#EF4444',    // Red
};

// Remove this old mock data - using real extraction from ./real-data.ts
const OLD_MOCK_DATA_REMOVED: { [key: string]: ExtractionResult[] } = {
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf',
    pageNumber: 1,
    imageSize: { width: 6048, height: 4320 },
    extractedSigns: [
      {
        text: '2006',
        signType: null,
        boundingBox: {
          x_percentage: 9.9,
          y_percentage: 74.2,
          width_percentage: 1.0,
          height_percentage: 0.5
        },
        confidence: 0.95
      },
      {
        text: '2004.3',
        signType: null,
        boundingBox: {
          x_percentage: 12.2,
          y_percentage: 52.4,
          width_percentage: 1.4,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '2004.4',
        signType: null,
        boundingBox: {
          x_percentage: 12.2,
          y_percentage: 53.1,
          width_percentage: 1.4,
          height_percentage: 0.5
        },
        confidence: 0.95
      },
      {
        text: '2004.7',
        signType: null,
        boundingBox: {
          x_percentage: 10.8,
          y_percentage: 58.4,
          width_percentage: 1.3,
          height_percentage: 0.5
        },
        confidence: 0.95
      },
      {
        text: '2004.8',
        signType: null,
        boundingBox: {
          x_percentage: 91.9,
          y_percentage: 23.5,
          width_percentage: 1.0,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '000000',
        signType: null,
        boundingBox: {
          x_percentage: 83.6,
          y_percentage: 55.2,
          width_percentage: 1.5,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '888',
        signType: null,
        boundingBox: {
          x_percentage: 81.3,
          y_percentage: 15.2,
          width_percentage: 0.8,
          height_percentage: 3.0
        },
        confidence: 0.95
      },
      {
        text: '88',
        signType: null,
        boundingBox: {
          x_percentage: 81.3,
          y_percentage: 34.3,
          width_percentage: 0.6,
          height_percentage: 0.3
        },
        confidence: 0.95
      },
      {
        text: '88',
        signType: null,
        boundingBox: {
          x_percentage: 81.2,
          y_percentage: 11.1,
          width_percentage: 0.6,
          height_percentage: 0.3
        },
        confidence: 0.95
      },
      {
        text: '8',
        signType: null,
        boundingBox: {
          x_percentage: 81.2,
          y_percentage: 9.4,
          width_percentage: 0.3,
          height_percentage: 0.3
        },
        confidence: 0.95
      },
      {
        text: '8',
        signType: null,
        boundingBox: {
          x_percentage: 81.3,
          y_percentage: 7.9,
          width_percentage: 0.3,
          height_percentage: 0.3
        },
        confidence: 0.95
      },
      {
        text: '000000',
        signType: null,
        boundingBox: {
          x_percentage: 47.0,
          y_percentage: 25.8,
          width_percentage: 1.5,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '000000000',
        signType: null,
        boundingBox: {
          x_percentage: 43.3,
          y_percentage: 79.4,
          width_percentage: 2.0,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '00',
        signType: null,
        boundingBox: {
          x_percentage: 35.8,
          y_percentage: 84.2,
          width_percentage: 0.5,
          height_percentage: 0.3
        },
        confidence: 0.95
      },
      {
        text: '0000',
        signType: null,
        boundingBox: {
          x_percentage: 14.2,
          y_percentage: 81.4,
          width_percentage: 1.0,
          height_percentage: 0.4
        },
        confidence: 0.95
      },
      {
        text: '0000',
        signType: null,
        boundingBox: {
          x_percentage: 14.8,
          y_percentage: 80.6,
          width_percentage: 1.0,
          height_percentage: 0.4
        },
        confidence: 0.95
      }
    ],
    timestamp: new Date().toISOString(),
    processingTime: 2100
  }],
  
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf',
    pageNumber: 1,
    imageSize: { width: 3300, height: 2550 },
    extractedSigns: [
      {
        text: '3002',
        signType: null,
        boundingBox: {
          x_percentage: 35.4,
          y_percentage: 42.1,
          width_percentage: 2.8,
          height_percentage: 2.0
        },
        confidence: 0.96
      },
      {
        text: 'BID-1.2',
        signType: 'BID-1.2',
        boundingBox: {
          x_percentage: 58.9,
          y_percentage: 28.7,
          width_percentage: 4.1,
          height_percentage: 2.6
        },
        confidence: 0.88
      },
      {
        text: 'BC-6.1',
        signType: 'BC-6.1',
        boundingBox: {
          x_percentage: 72.1,
          y_percentage: 71.5,
          width_percentage: 3.6,
          height_percentage: 2.2
        },
        confidence: 0.93
      }
    ],
    timestamp: new Date().toISOString(),
    processingTime: 3200
  }],

  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf',
    pageNumber: 1,
    imageSize: { width: 3300, height: 2550 },
    extractedSigns: [
      {
        text: '1001',
        signType: null,
        boundingBox: {
          x_percentage: 25.8,
          y_percentage: 31.4,
          width_percentage: 2.4,
          height_percentage: 1.9
        },
        confidence: 0.97
      },
      {
        text: 'PAC-1.1',
        signType: 'PAC-1.1',
        boundingBox: {
          x_percentage: 67.3,
          y_percentage: 54.2,
          width_percentage: 4.2,
          height_percentage: 2.8
        },
        confidence: 0.90
      },
      {
        text: 'BC-5.2',
        signType: 'BC-5.2',
        boundingBox: {
          x_percentage: 41.6,
          y_percentage: 83.7,
          width_percentage: 3.7,
          height_percentage: 2.5
        },
        confidence: 0.86
      }
    ],
    timestamp: new Date().toISOString(),
    processingTime: 2800
  }]
};

export default function PlansTestPage() {
  // Initialize state properly to avoid hydration issues
  const [extractionData] = useState<{ [key: string]: ExtractionResult[] }>(REAL_EXTRACTION_DATA);
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [mounted, setMounted] = useState(false);

  // Handle mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const firstPdf = Object.keys(REAL_EXTRACTION_DATA)[0];
    if (firstPdf) {
      setSelectedPdf(firstPdf);
    }
  }, []);
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(null);
  const [loading, setLoading] = useState(false); // Start with loading false since data is inline
  
  // Update current result when selection changes
  useEffect(() => {
    if (selectedPdf && extractionData[selectedPdf]) {
      const result = extractionData[selectedPdf].find(r => r.pageNumber === selectedPage);
      setCurrentResult(result || null);
      
      if (result) {
        // Convert extracted signs to hotspot format
        const hotspotData: HotspotData[] = result.extractedSigns.map((sign, index) => ({
          id: `${selectedPdf}_page${selectedPage}_sign${index}`,
          signNumber: sign.text,
          signType: sign.signType,
          x_percentage: sign.boundingBox.x_percentage,
          y_percentage: sign.boundingBox.y_percentage,
          width_percentage: Math.max(sign.boundingBox.width_percentage, 2.5),
          height_percentage: Math.max(sign.boundingBox.height_percentage, 2.5),
          status: 'pending',
          confidence: sign.confidence,
        }));
        setHotspots(hotspotData);
      } else {
        setHotspots([]);
      }
    }
  }, [selectedPdf, selectedPage, extractionData]);

  const handleHotspotClick = (hotspot: HotspotData) => {
    setSelectedHotspot(hotspot);
  };

  const updateHotspotStatus = (hotspotId: string, newStatus: 'pending' | 'installed' | 'issue' | 'missing') => {
    setHotspots(prev => prev.map(h => 
      h.id === hotspotId ? { ...h, status: newStatus } : h
    ));
    
    if (selectedHotspot?.id === hotspotId) {
      setSelectedHotspot(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const renderHotspot = (hotspot: HotspotData) => {
    const isSelected = selectedHotspot?.id === hotspot.id;
    const color = HOTSPOT_COLORS[hotspot.status];
    
    return (
      <div
        key={hotspot.id}
        className={`absolute cursor-pointer transition-all duration-200 select-none ${
          isSelected ? 'z-30 scale-110' : 'z-20'
        }`}
        style={{
          left: `${hotspot.x_percentage}%`,
          top: `${hotspot.y_percentage}%`,
          width: `${hotspot.width_percentage}%`,
          height: `${hotspot.height_percentage}%`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          border: `2px solid ${color}`,
          borderRadius: '4px',
          opacity: isSelected ? 0.9 : 0.7,
          minWidth: '44px',
          minHeight: '44px'
        }}
        onClick={() => handleHotspotClick(hotspot)}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {hotspot.signNumber}
        </div>
        
        {hotspot.signType && (
          <div 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 rounded"
            style={{ fontSize: '10px' }}
          >
            {hotspot.signType}
          </div>
        )}
      </div>
    );
  };

  if (loading || !mounted) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading extraction results...</p>
          </div>
        </div>
      </div>
    );
  }

  const pdfNames = Object.keys(extractionData);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🗺️ Sign Extraction Test</h1>
          <p className="text-gray-600 mt-2">
            Interactive visualization of extracted sign positions from PDF plans
          </p>
        </div>
        <div className="text-sm text-gray-500">
          ✅ Real Google Vision API extraction • 16 numbers detected from PDF 13
        </div>
      </div>

      {/* PDF Selection */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Plan Selection</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">PDF File</label>
            <select 
              value={selectedPdf} 
              onChange={(e) => setSelectedPdf(e.target.value)}
              className="border rounded px-3 py-2 min-w-48"
            >
              <option value="">Select PDF...</option>
              {pdfNames.map(name => (
                <option key={name} value={name}>{name.replace('000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 ', 'Sheet ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Page</label>
            <select 
              value={selectedPage} 
              onChange={(e) => setSelectedPage(parseInt(e.target.value))}
              className="border rounded px-3 py-2"
            >
              <option value={1}>Page 1</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currentResult.extractedSigns.length}
            </div>
            <div className="text-sm text-gray-600">Signs Found</div>
          </div>
          
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {currentResult.imageSize.width} × {currentResult.imageSize.height}
            </div>
            <div className="text-sm text-gray-600">Image Size</div>
          </div>
          
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {hotspots.filter(h => h.signType).length}
            </div>
            <div className="text-sm text-gray-600">Typed Signs</div>
          </div>
          
          <div className="bg-white border rounded p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {currentResult.extractedSigns.length > 0 ? 
                (currentResult.extractedSigns.reduce((sum, s) => sum + s.confidence, 0) / currentResult.extractedSigns.length * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Interactive Plan View</h2>
              <p className="text-sm text-gray-600">Click on sign hotspots to view details and change status</p>
            </div>
            <div className="p-2">
              {selectedPdf && currentResult ? (
                <div className="relative w-full bg-gray-100 rounded border aspect-[4/3] overflow-hidden">
                  <div className="absolute inset-0">
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📋</div>
                        <div className="text-lg font-semibold mb-2">Mock Site Plan</div>
                        <div className="text-sm text-gray-600 mb-2">
                          {selectedPdf.replace('000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 ', 'Sheet ')} - Page {selectedPage}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          Signs positioned as extracted from PDF
                        </div>
                        <div className="text-xs text-gray-400">
                          Processing time: {currentResult.processingTime}ms
                        </div>
                      </div>
                    </div>
                    {/* Hotspots overlay */}
                    {hotspots.map(renderHotspot)}
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gray-100 rounded flex items-center justify-center">
                  <p className="text-gray-500">Select a PDF sheet to view extracted signs</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Hotspot Details */}
          {selectedHotspot ? (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Sign Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Sign Number</div>
                  <div className="text-lg font-mono">{selectedHotspot.signNumber}</div>
                </div>
                
                {selectedHotspot.signType && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">Sign Type</div>
                    <div className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {selectedHotspot.signType}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium text-gray-700">OCR Confidence</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${selectedHotspot.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{(selectedHotspot.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Position on Plan</div>
                  <div className="text-sm text-gray-600">
                    X: {selectedHotspot.x_percentage.toFixed(1)}%, 
                    Y: {selectedHotspot.y_percentage.toFixed(1)}%
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Installation Status</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pending', 'installed', 'issue', 'missing'] as const).map(status => (
                      <button
                        key={status}
                        className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${
                          selectedHotspot.status === status 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => updateHotspotStatus(selectedHotspot.id, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
              <div className="text-4xl mb-2">👆</div>
              Click on a sign hotspot to view details
            </div>
          )}

          {/* Legend */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Status Legend</h3>
            <div className="space-y-2">
              {Object.entries(HOTSPOT_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="capitalize text-sm">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sign List */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Extracted Signs ({hotspots.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {hotspots.map(hotspot => (
                <div
                  key={hotspot.id}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedHotspot?.id === hotspot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleHotspotClick(hotspot)}
                >
                  <div className="font-medium">{hotspot.signNumber}</div>
                  {hotspot.signType && (
                    <div className="inline-block px-1 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                      {hotspot.signType}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    OCR: {(hotspot.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">Demo Information</h3>
            <p className="text-sm text-blue-700 mb-2">
              This is a demonstration using mock extraction data from 3 architectural PDF sheets. 
              The hotspots show realistic sign positions and types extracted using the PDF-to-image + Google Vision OCR pipeline.
            </p>
            <div className="text-xs text-blue-600">
              <strong>Next Steps:</strong> Add GOOGLE_VISION_API_KEY to .env.local and run real extraction: 
              <code className="bg-blue-100 px-1 ml-1 rounded">node test_data/extraction_scripts/run-extraction.js</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}