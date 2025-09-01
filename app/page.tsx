import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Sign OCR Extraction System</h1>
          <p className="text-xl text-gray-600">Extract and visualize sign numbers from architectural PDFs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/plans/demo" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                Demo View
              </h2>
              <p className="text-gray-600">
                Interactive demo with sample sign data
              </p>
            </div>
          </Link>

          <Link href="/plans/test" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                Test View
              </h2>
              <p className="text-gray-600">
                Testing environment for sign detection
              </p>
            </div>
          </Link>

          <Link href="/plans/zoom" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                Zoom View
              </h2>
              <p className="text-gray-600">
                Advanced zoom and pan controls
              </p>
            </div>
          </Link>

          <Link href="/plans/calibrated" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
              <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                Calibrated View
              </h2>
              <p className="text-gray-600">
                Precision calibrated sign positions
              </p>
            </div>
          </Link>

          <Link href="/plans/color-extraction" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold group-hover:text-blue-600">
                  Color Extraction
                </h2>
              </div>
              <p className="text-gray-600">
                Color-based detection with 30 filled boxes
              </p>
              <div className="mt-2 text-sm text-orange-600 font-medium">
                ✓ Detection Working • OCR In Progress
              </div>
            </div>
          </Link>

          <Link href="/plans/embedded-text" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-2 border-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold group-hover:text-blue-600">
                  PDF Embedded Text
                </h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">BEST</span>
              </div>
              <p className="text-gray-600">
                Direct PDF text extraction - 100% accurate
              </p>
              <div className="mt-2 text-sm text-emerald-600 font-medium">
                ✓ 156 Signs Extracted • No OCR Needed
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Production Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/validation" className="group">
              <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-2 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold group-hover:text-blue-600">
                    ✏️ Sign Validation Interface
                  </h2>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold">NEW</span>
                </div>
                <p className="text-gray-600">
                  Review and correct extracted sign data with professional validation tools
                </p>
                <div className="mt-2 text-sm text-purple-600 font-medium">
                  • Three-panel editor • Bulk operations • Export to SQL/CSV
                </div>
              </div>
            </Link>

            <Link href="/plans/multi-pdf" className="group">
              <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
                <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600">
                  📑 Multi-PDF Viewer
                </h2>
                <p className="text-gray-600">
                  Compare signs across multiple floor plans
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  • COLO 2 Admin • BC East Level 1
                </div>
              </div>
            </Link>

            <Link href="/field" className="group">
              <div className="bg-green-600 text-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 hover:bg-green-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    📱 Field Tracker
                  </h2>
                  <span className="text-xs bg-white text-green-600 px-2 py-1 rounded font-bold">MOBILE</span>
                </div>
                <p className="text-green-100">
                  Mobile-first interface for installers to mark sign installation status
                </p>
                <div className="mt-2 text-sm text-green-100 font-medium">
                  • Offline support • Touch optimized • Real-time progress
                </div>
              </div>
            </Link>

            <Link href="/fieldv2" className="group">
              <div className="bg-red-600 text-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 hover:bg-red-700 border-4 border-yellow-400">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    🚀 Field V2 (Debug)
                  </h2>
                  <span className="text-xs bg-yellow-400 text-red-600 px-2 py-1 rounded font-bold animate-pulse">DEBUG</span>
                </div>
                <p className="text-red-100">
                  NEW ROUTE - Bypasses browser cache - MIN_ZOOM=1 verified
                </p>
                <div className="mt-2 text-sm text-yellow-200 font-medium">
                  • Fresh code load • Debug indicators • Version 2.0
                </div>
              </div>
            </Link>

            <Link href="/field-pro" className="group">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 hover:from-purple-700 hover:to-pink-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    ✨ Field Tracker Pro
                  </h2>
                  <span className="text-xs bg-white text-purple-600 px-2 py-1 rounded font-bold">PRO</span>
                </div>
                <p className="text-purple-100">
                  Procreate-inspired interface with advanced gestures and animations
                </p>
                <div className="mt-2 text-sm text-purple-100 font-medium">
                  • Two-finger undo • Edge swipe • Spring animations • Page scrubber
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">📊 Statistics</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 157 total signs detected</li>
                <li>• 99 color boxes identified</li>
                <li>• 400 DPI processing</li>
                <li>• Multiple extraction methods</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🛠️ Technologies</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Next.js + TypeScript</li>
                <li>• OpenCV + Tesseract OCR</li>
                <li>• HSV Color Detection</li>
                <li>• Google Vision API</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🎯 Capabilities</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PDF to image conversion</li>
                <li>• Color-based detection</li>
                <li>• Interactive visualization</li>
                <li>• Scalable to 13,000+ signs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}