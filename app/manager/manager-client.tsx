'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, Download, Filter, FileText, Layers } from 'lucide-react';

interface ReleaseItem {
  signNumber: string;
  area: string;
  level: string;
  signType: string;
  status: 'pending' | 'released' | 'installed' | 'issue';
  notes?: string;
  releaseDate?: string;
  installer?: string;
}

interface PageSignType {
  pageNumber: number;
  signType: string;
  pageTitle: string;
  signCount?: number;
}

interface SignTypeGroup {
  [key: string]: PageSignType[];
}

export default function ManagerClient() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [releaseData, setReleaseData] = useState<ReleaseItem[]>([]);
  const [filteredData, setFilteredData] = useState<ReleaseItem[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [signTypeGroups, setSignTypeGroups] = useState<SignTypeGroup | null>(null);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [selectedSignType, setSelectedSignType] = useState<string>('all');
  
  // Configure PDF.js worker on component mount
  useEffect(() => {
    import('pdfjs-dist').then((pdfjsLib) => {
      // Use a specific version that's known to work
      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js';
    });
  }, []);

  // Extract sign types from PDF pages
  const extractSignTypesFromPages = async (pdfFile: File): Promise<PageSignType[]> => {
    try {
      // Dynamically import PDF.js only on client side
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker with fixed version URL
      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js';
      
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const signTypes: PageSignType[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Look for "SIGN TYPE:" pattern in the text
        let signType: string | null = null;
        const textItems = textContent.items as any[];
        
        for (let i = 0; i < textItems.length; i++) {
          const text = textItems[i].str;
          // Look for various patterns that might indicate sign type
          if (text && (text.includes('SIGN TYPE') || text.includes('Sign Type') || text.includes('TYPE:'))) {
            // Get the next few text items to find the actual type
            for (let j = i + 1; j < Math.min(i + 5, textItems.length); j++) {
              const nextText = textItems[j].str.trim();
              // Look for patterns like BC-1.0, PAC-2.1, etc.
              if (nextText && /^[A-Z]{2,3}-\d+\.\d+$/.test(nextText)) {
                signType = nextText;
                break;
              }
              // Also check for simpler patterns
              if (nextText && /^[A-Z]{2,3}-\d+$/.test(nextText)) {
                signType = nextText;
                break;
              }
            }
          }
          
          // Alternative: Look directly for sign type patterns in any text
          if (!signType && text && /^[A-Z]{2,3}-\d+(\.\d+)?$/.test(text.trim())) {
            // Check if this looks like a sign type (not a sign number)
            if (!/^\d{4}/.test(text)) {
              signType = text.trim();
            }
          }
        }
        
        // Count signs on this page if we have release data
        const pageSignCount = releaseData.filter(item => {
          // This would need to be mapped to actual page numbers
          // For now, we'll estimate based on sign numbers
          return true; // Placeholder
        }).length;
        
        signTypes.push({
          pageNumber: pageNum,
          signType: signType || 'Unclassified',
          pageTitle: `Page ${pageNum}`,
          signCount: 0 // Will be updated if we have sign data
        });
      }
      
      return signTypes;
    } catch (error) {
      console.error('Error processing PDF:', error);
      return [];
    }
  };

  // Group pages by sign type
  const groupPagesBySignType = (signTypes: PageSignType[]): SignTypeGroup => {
    return signTypes.reduce((acc, page) => {
      const type = page.signType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(page);
      return acc;
    }, {} as SignTypeGroup);
  };

  // Handle PDF upload
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedPDF(file);
      setIsProcessingPDF(true);
      
      try {
        const signTypes = await extractSignTypesFromPages(file);
        const groups = groupPagesBySignType(signTypes);
        setSignTypeGroups(groups);
      } catch (error) {
        console.error('Failed to process PDF:', error);
        alert('Failed to process PDF. Please try again.');
      } finally {
        setIsProcessingPDF(false);
      }
    } else {
      alert('Please upload a PDF file');
    }
  };

  // Parse CSV content
  const parseCSV = (content: string): ReleaseItem[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Map common header variations
    const headerMap: Record<string, string> = {
      'sign': 'signNumber',
      'sign number': 'signNumber',
      'sign_number': 'signNumber',
      'area': 'area',
      'zone': 'area',
      'level': 'level',
      'floor': 'level',
      'type': 'signType',
      'sign type': 'signType',
      'sign_type': 'signType',
      'status': 'status',
      'notes': 'notes',
      'release date': 'releaseDate',
      'release_date': 'releaseDate',
      'installer': 'installer'
    };
    
    // Parse data rows
    const data: ReleaseItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === 0) continue;
      
      const item: any = {
        status: 'pending' // default status
      };
      
      headers.forEach((header, index) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[index]) {
          if (mappedKey === 'status') {
            // Normalize status values
            const statusValue = values[index].toLowerCase();
            if (statusValue.includes('released')) item.status = 'released';
            else if (statusValue.includes('installed')) item.status = 'installed';
            else if (statusValue.includes('issue') || statusValue.includes('problem')) item.status = 'issue';
            else item.status = 'pending';
          } else {
            item[mappedKey] = values[index];
          }
        }
      });
      
      // Only add if we have at least a sign number
      if (item.signNumber) {
        data.push(item as ReleaseItem);
      }
    }
    
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsedData = parseCSV(content);
        setReleaseData(parsedData);
        setFilteredData(parsedData);
        
        // Extract unique areas and levels
        const uniqueAreas = [...new Set(parsedData.map(item => item.area).filter(Boolean))];
        const uniqueLevels = [...new Set(parsedData.map(item => item.level).filter(Boolean))];
        setAreas(uniqueAreas);
        setLevels(uniqueLevels);
      };
      reader.readAsText(file);
    }
  };

  // Filter data based on selections
  useEffect(() => {
    let filtered = [...releaseData];
    
    if (selectedArea !== 'all') {
      filtered = filtered.filter(item => item.area === selectedArea);
    }
    
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(item => item.level === selectedLevel);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }
    
    if (selectedSignType !== 'all') {
      filtered = filtered.filter(item => item.signType === selectedSignType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.signNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.signType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(filtered);
  }, [selectedArea, selectedLevel, selectedStatus, selectedSignType, searchTerm, releaseData]);

  // Generate summary statistics
  const getStatistics = () => {
    const total = releaseData.length;
    const pending = releaseData.filter(item => item.status === 'pending').length;
    const released = releaseData.filter(item => item.status === 'released').length;
    const installed = releaseData.filter(item => item.status === 'installed').length;
    const issues = releaseData.filter(item => item.status === 'issue').length;
    
    return { total, pending, released, installed, issues };
  };

  const stats = getStatistics();
  
  // Export filtered data as CSV
  const exportToCSV = () => {
    const headers = ['Sign Number', 'Area', 'Level', 'Sign Type', 'Status', 'Notes'];
    const rows = filteredData.map(item => [
      item.signNumber,
      item.area || '',
      item.level || '',
      item.signType || '',
      item.status,
      item.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atl06_release_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'installed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'released':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'issue':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'installed':
        return 'bg-green-100 text-green-800';
      case 'released':
        return 'bg-blue-100 text-blue-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get color for sign type badges
  const getSignTypeColor = (signType: string) => {
    const hash = signType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-orange-100 text-orange-800'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">📋 Release Manager - ATL06</h1>
            </div>
            {releaseData.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* CSV Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-gray-600" />
              Upload Release Data (CSV)
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="font-medium">Choose CSV File</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFile && (
                <p className="text-sm text-gray-600">
                  {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Expected columns: Sign Number, Area, Level, Sign Type, Status, Notes
            </p>
          </div>

          {/* PDF Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Process Release PDF (Auto-Sort)
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors">
                <Layers className="w-4 h-4" />
                <span className="font-medium">Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                />
              </label>
              {uploadedPDF && (
                <p className="text-sm text-gray-600">
                  {uploadedPDF.name} ({Math.round(uploadedPDF.size / 1024)} KB)
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Automatically extracts sign types from each page
            </p>
            {isProcessingPDF && (
              <div className="mt-3 flex items-center gap-2 text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-sm">Processing PDF pages...</span>
              </div>
            )}
          </div>
        </div>

        {/* Sign Type Groups from PDF */}
        {signTypeGroups && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Pages Organized by Sign Type
            </h2>
            <div className="space-y-4">
              {Object.entries(signTypeGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([signType, pages]) => (
                  <div key={signType} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {signType === 'Unclassified' ? (
                            <span className="text-gray-500">{signType}</span>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSignTypeColor(signType)}`}>
                              {signType}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {pages.length} page{pages.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedSignType(signType)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        Filter Signs
                      </button>
                    </div>
                    <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                      {pages
                        .sort((a, b) => a.pageNumber - b.pageNumber)
                        .map((page) => (
                          <Link
                            key={page.pageNumber}
                            href={`/field?page=${page.pageNumber}`}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm text-center hover:bg-blue-100 transition-colors"
                          >
                            P{page.pageNumber}
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {releaseData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Signs</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.released}</div>
              <div className="text-sm text-blue-600">Released</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.installed}</div>
              <div className="text-sm text-green-600">Installed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.issues}</div>
              <div className="text-sm text-red-600">Issues</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {releaseData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="released">Released</option>
                <option value="installed">Installed</option>
                <option value="issue">Issues</option>
              </select>

              {signTypeGroups && (
                <select
                  value={selectedSignType}
                  onChange={(e) => setSelectedSignType(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Sign Types</option>
                  {Object.keys(signTypeGroups).sort().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              )}
              
              <input
                type="text"
                placeholder="Search signs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
              />
              
              <div className="ml-auto text-sm text-gray-600">
                Showing {filteredData.length} of {releaseData.length} signs
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {filteredData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sign Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Area
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sign Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={`${item.signNumber}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.signNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.area || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.level || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.signType && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSignTypeColor(item.signType)}`}>
                            {item.signType}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {releaseData.length === 0 && !signTypeGroups && (
          <div className="bg-white rounded-lg shadow-sm border p-12">
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data loaded</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV file or PDF to get started
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-xs font-medium text-gray-700 mb-2">Example CSV format:</p>
                <pre className="text-xs text-gray-600 font-mono">
{`Sign Number,Area,Level,Sign Type,Status
2001,Zone A,Level 1,BC-1.0,pending
2002,Zone A,Level 1,BC-2.0,released
2003,Zone B,Level 2,PAC-1.0,installed`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}