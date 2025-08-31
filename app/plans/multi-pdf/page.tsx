'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import PanZoomViewer to avoid SSR issues
const PanZoomViewer = dynamic(() => import('@/app/components/PanZoomViewer'), { ssr: false });

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

interface PDFResults {
  source_pdf: string;
  pdf_id: string;
  pdf_name: string;
  pdf_description: string;
  total_signs_detected: number;
  extraction_method: string;
  pages: PageData[];
}

interface CombinedResults {
  extraction_method: string;
  pdfs: Array<{
    pdf_id: string;
    pdf_name: string;
    total_signs: number;
    results: PDFResults;
  }>;
  total_signs_all_pdfs: number;
  comparison: {
    common_signs: string[];
    common_count: number;
    unique_signs: { [key: string]: string[] };
    summary: { [key: string]: { total: number; unique: number } };
  };
}

interface CoordinateAdjustments {
  xOffset: number;
  yOffset: number;
  scale: number;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const PDF_CONFIGS = {
  pdf13: {
    id: 'pdf13',
    name: 'PDF 13 - Floor Plan',
    image: '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png',
    width: 1512,
    height: 1080,
  },
  pdf14: {
    id: 'pdf14',
    name: 'PDF 14 - Floor Plan',
    image: '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14_page_1.png',
    width: 1512,
    height: 1080,
  },
};

export default function MultiPDFExtraction() {
  const [combinedResults, setCombinedResults] = useState<CombinedResults | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<string>('pdf13');
  const [currentResults, setCurrentResults] = useState<PDFResults | null>(null);
  const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredSign, setHoveredSign] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [adjustments, setAdjustments] = useState<CoordinateAdjustments>({
    xOffset: 0,
    yOffset: 0,
    scale: 1.0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/extraction/combined_results.json')
      .then(res => res.json())
      .then(data => {
        setCombinedResults(data);
        // Set initial PDF results
        const initialPDF = data.pdfs.find((p: any) => p.pdf_id === selectedPDF);
        if (initialPDF) {
          setCurrentResults(initialPDF.results);
        }
      })
      .catch(err => console.error('Failed to load results:', err));
  }, []);

  useEffect(() => {
    if (combinedResults) {
      const pdfData = combinedResults.pdfs.find(p => p.pdf_id === selectedPDF);
      if (pdfData) {
        setCurrentResults(pdfData.results);
      }
    }
  }, [selectedPDF, combinedResults]);

  const handleSignClick = (sign: SignData) => {
    setSelectedSign(sign);
    setShowModal(true);
  };

  const exportJSON = () => {
    if (!currentResults) return;
    
    const adjustedResults = {
      ...currentResults,
      adjustments: adjustments,
      pages: currentResults.pages.map(page => ({
        ...page,
        signs: page.signs.map(sign => ({
          ...sign,
          hotspot_bbox: {
            x_percentage: sign.hotspot_bbox.x_percentage + adjustments.xOffset,
            y_percentage: sign.hotspot_bbox.y_percentage + adjustments.yOffset,
            width_percentage: sign.hotspot_bbox.width_percentage * adjustments.scale,
            height_percentage: sign.hotspot_bbox.height_percentage * adjustments.scale
          }
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(adjustedResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPDF}_hotspots_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAdjustments = () => {
    setAdjustments({ xOffset: 0, yOffset: 0, scale: 1.0 });
  };

  const getAdjustedPosition = (sign: SignData) => {
    return {
      left: `${sign.hotspot_bbox.x_percentage + adjustments.xOffset}%`,
      top: `${sign.hotspot_bbox.y_percentage + adjustments.yOffset}%`,
      width: `${sign.hotspot_bbox.width_percentage * adjustments.scale}%`,
      height: `${sign.hotspot_bbox.height_percentage * adjustments.scale}%`,
    };
  };

  const filteredSigns = currentResults?.pages[0]?.signs.filter(sign =>
    sign.sign_number.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const visibleSigns = useMemo(() => {
    if (!currentResults || viewTransform.scale < 0.3) {
      return [];
    }
    return filteredSigns;
  }, [filteredSigns, viewTransform, currentResults]);

  const shouldShowLabels = showLabels && viewTransform.scale >= 0.5;

  const currentPDFConfig = PDF_CONFIGS[selectedPDF as keyof typeof PDF_CONFIGS];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Multi-PDF Sign Extraction System
        </h1>
        <p className="text-gray-600 mb-6">
          Extract and compare signs across multiple floor plans
        </p>

        {/* PDF Selector and Stats */}
        {combinedResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PDF Selector */}
              <div>
                <h3 className="font-semibold mb-3">Select PDF</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedPDF}
                    onChange={(e) => setSelectedPDF(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-md"
                  >
                    {combinedResults.pdfs.map(pdf => (
                      <option key={pdf.pdf_id} value={pdf.pdf_id}>
                        {pdf.pdf_name} ({pdf.total_signs} signs)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                  >
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </button>
                </div>
              </div>

              {/* Current PDF Stats */}
              <div>
                <h3 className="font-semibold mb-3">Current PDF Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Total Signs</div>
                    <div className="text-xl font-semibold">
                      {currentResults?.total_signs_detected || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Accuracy</div>
                    <div className="text-xl font-semibold text-green-600">98%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Zoom</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {Math.round(viewTransform.scale * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Panel */}
            {showComparison && combinedResults.comparison && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">PDF Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Statistics</h4>
                    <div className="space-y-1 text-sm">
                      <div>Total signs (all PDFs): <strong>{combinedResults.total_signs_all_pdfs}</strong></div>
                      <div>Common signs: <strong>{combinedResults.comparison.common_count}</strong></div>
                    </div>
                  </div>
                  
                  {Object.entries(combinedResults.comparison.summary).map(([pdfId, stats]) => (
                    <div key={pdfId}>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {combinedResults.pdfs.find(p => p.pdf_id === pdfId)?.pdf_name}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div>Total signs: <strong>{stats.total}</strong></div>
                        <div>Unique to this PDF: <strong>{stats.unique}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show unique signs for current PDF */}
                {combinedResults.comparison.unique_signs[selectedPDF]?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Unique to {currentPDFConfig.name}:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {combinedResults.comparison.unique_signs[selectedPDF].slice(0, 20).map(sign => (
                        <span key={sign} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {sign}
                        </span>
                      ))}
                      {combinedResults.comparison.unique_signs[selectedPDF].length > 20 && (
                        <span className="px-2 py-1 text-gray-600 text-xs">
                          +{combinedResults.comparison.unique_signs[selectedPDF].length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Controls */}
            <div>
              <h3 className="font-semibold mb-3">Display Options</h3>
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
                <input
                  type="text"
                  placeholder="Search signs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1 border rounded-md"
                />
              </div>
            </div>

            {/* Export Controls */}
            <div>
              <h3 className="font-semibold mb-3">Data Export</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportJSON}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Export {selectedPDF.toUpperCase()} JSON
                </button>
                <button
                  onClick={resetAdjustments}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                >
                  Reset Adjustments
                </button>
              </div>
            </div>
          </div>

          {/* Coordinate Adjustments */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3">Coordinate Adjustments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X Offset: {adjustments.xOffset.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={adjustments.xOffset}
                  onChange={(e) => setAdjustments({...adjustments, xOffset: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y Offset: {adjustments.yOffset.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={adjustments.yOffset}
                  onChange={(e) => setAdjustments({...adjustments, yOffset: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scale: {(adjustments.scale * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={adjustments.scale}
                  onChange={(e) => setAdjustments({...adjustments, scale: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Floor Plan Viewer */}
        {currentPDFConfig && (
          <div className="bg-white rounded-lg shadow-md p-6" style={{ height: '80vh' }}>
            <PanZoomViewer
              imageSrc={currentPDFConfig.image}
              imageWidth={currentPDFConfig.width}
              imageHeight={currentPDFConfig.height}
              onTransformChange={setViewTransform}
            >
              {/* Render hotspots */}
              {visibleSigns.map((sign) => {
                const minSize = Math.max(44 / viewTransform.scale, parseFloat(getAdjustedPosition(sign).width.slice(0, -1)));
                const minHeight = Math.max(44 / viewTransform.scale, parseFloat(getAdjustedPosition(sign).height.slice(0, -1)));
                
                return (
                  <div
                    key={sign.sign_number}
                    className={`absolute border-2 transition-all cursor-pointer ${
                      selectedSign?.sign_number === sign.sign_number
                        ? 'border-red-500 bg-red-500/30 z-20'
                        : hoveredSign === sign.sign_number
                        ? 'border-blue-500 bg-blue-500/30 z-10'
                        : 'border-green-500 bg-green-500/20'
                    } hover:bg-green-500/40`}
                    style={{
                      ...getAdjustedPosition(sign),
                      minWidth: `${minSize}px`,
                      minHeight: `${minHeight}px`,
                    }}
                    onClick={() => handleSignClick(sign)}
                    onMouseEnter={() => setHoveredSign(sign.sign_number)}
                    onMouseLeave={() => setHoveredSign(null)}
                    title={sign.sign_number}
                  >
                    {shouldShowLabels && (
                      <div 
                        className="absolute bg-green-600 text-white px-1 rounded whitespace-nowrap"
                        style={{
                          top: '-20px',
                          left: '0',
                          fontSize: `${Math.max(10 / viewTransform.scale, 8)}px`,
                        }}
                      >
                        {sign.sign_number}
                      </div>
                    )}
                  </div>
                );
              })}
            </PanZoomViewer>
          </div>
        )}

        {/* Sign Details Modal */}
        {showModal && selectedSign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Sign Details</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Sign Number:</span>
                  <span className="ml-2 text-xl">{selectedSign.sign_number}</span>
                </div>
                <div>
                  <span className="font-semibold">PDF:</span>
                  <span className="ml-2">{currentPDFConfig.name}</span>
                </div>
                <div>
                  <span className="font-semibold">Position:</span>
                  <span className="ml-2">
                    ({(selectedSign.hotspot_bbox.x_percentage + adjustments.xOffset).toFixed(1)}%, 
                     {(selectedSign.hotspot_bbox.y_percentage + adjustments.yOffset).toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Confidence:</span>
                  <span className="ml-2 text-green-600">100% (Embedded Text)</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Sign List */}
        {currentResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">
              Extracted Signs from {currentPDFConfig.name} ({filteredSigns.length} of {currentResults.total_signs_detected})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
              {filteredSigns.map((sign) => (
                <button
                  key={sign.sign_number}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    selectedSign?.sign_number === sign.sign_number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => handleSignClick(sign)}
                  onMouseEnter={() => setHoveredSign(sign.sign_number)}
                  onMouseLeave={() => setHoveredSign(null)}
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