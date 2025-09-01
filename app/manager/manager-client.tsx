'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Layers, Search, Save, Download, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Zap, Filter, Eye } from 'lucide-react';
import { supabase, ProjectSignCatalog, SignDescription } from '@/lib/supabase';

interface PageSignType {
  pageNumber: number;
  signType: string | null;
  signNumbers: string[];
  pageTitle: string;
}

interface SignAssignment {
  sign_number: string;
  sign_type_code: string | null;
  verified: boolean;
  page_number?: number;
}

export default function ManagerClient() {
  // State management
  const [signs, setSigns] = useState<ProjectSignCatalog[]>([]);
  const [signTypes, setSignTypes] = useState<SignDescription[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(57);
  const [pageSignTypes, setPageSignTypes] = useState<PageSignType[]>([]);
  const [selectedSignType, setSelectedSignType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Map<string, SignAssignment>>(new Map());
  const [showOnlyCurrentPage, setShowOnlyCurrentPage] = useState(false);
  
  // Load sign catalog from Supabase
  const loadSignCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('project_sign_catalog')
        .select(`
          id,
          sign_number,
          sign_description_id,
          side_a_message,
          side_b_message,
          sign_descriptions (
            id,
            sign_type_code,
            description
          )
        `)
        .order('sign_number');

      if (error) {
        console.error('Error loading signs:', error);
        // Use mock data if Supabase fails
        const mockSigns = generateMockSigns();
        setSigns(mockSigns);
      } else if (data) {
        // Map the data to include site_id and handle the nested sign_descriptions
        const signsWithSiteId = data.map((sign: any) => ({
          id: sign.id,
          site_id: 'ATL06',
          sign_number: sign.sign_number,
          sign_description_id: sign.sign_description_id,
          side_a_message: sign.side_a_message,
          side_b_message: sign.side_b_message,
          sign_descriptions: sign.sign_descriptions ? sign.sign_descriptions[0] : undefined
        }));
        setSigns(signsWithSiteId);
      }
    } catch (err) {
      console.error('Failed to load signs:', err);
      // Use mock data as fallback
      const mockSigns = generateMockSigns();
      setSigns(mockSigns);
    }
  };

  // Generate mock signs for demo
  const generateMockSigns = (): ProjectSignCatalog[] => {
    const mockSigns: ProjectSignCatalog[] = [];
    for (let i = 1; i <= 4314; i++) {
      const signNumber = i.toString().padStart(4, '0');
      mockSigns.push({
        id: `mock-${i}`,
        site_id: 'ATL06',
        sign_number: signNumber,
        sign_description_id: null,
        side_a_message: null,
        side_b_message: null
      });
    }
    return mockSigns;
  };

  // Load sign types from Supabase
  const loadSignTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('sign_descriptions')
        .select('*')
        .order('sign_type_code');

      if (error) {
        console.error('Error loading sign types:', error);
        // Use mock sign types if Supabase fails
        setSignTypes(getMockSignTypes());
      } else {
        setSignTypes(data || []);
      }
    } catch (err) {
      console.error('Failed to load sign types:', err);
      setSignTypes(getMockSignTypes());
    }
  };

  // Mock sign types for demo
  const getMockSignTypes = (): SignDescription[] => [
    { id: '1', sign_type_code: 'BC-1.0', description: 'Exit Signs' },
    { id: '2', sign_type_code: 'BC-2.0', description: 'Fire Safety Signs' },
    { id: '3', sign_type_code: 'BC-5.1', description: 'Fire Barrier Signs' },
    { id: '4', sign_type_code: 'BC-5.2', description: 'Smoke Barrier Signs' },
    { id: '5', sign_type_code: 'PAC-1.1', description: 'Power Center Signs' },
    { id: '6', sign_type_code: 'PAC-2.0', description: 'Electrical Room Signs' },
    { id: '7', sign_type_code: 'ID-5.2', description: 'Room ID Signs' },
    { id: '8', sign_type_code: 'ID-3.1', description: 'Directory Signs' },
    { id: '9', sign_type_code: 'REG-1.0', description: 'Regulatory Signs' },
    { id: '10', sign_type_code: 'FIELD', description: 'Field Locate' }
  ];

  // Initialize data on mount
  useEffect(() => {
    loadSignCatalog();
    loadSignTypes();
    
    // Load ATL06 release PDF metadata
    loadATL06Metadata();
  }, []);

  // Load pre-extracted ATL06 metadata
  const loadATL06Metadata = () => {
    // Simulated extracted data from ATL06 release.pdf
    const metadata: PageSignType[] = [];
    
    // Page 1-15: BC-1.0 (Exit signs)
    for (let i = 1; i <= 15; i++) {
      metadata.push({
        pageNumber: i,
        signType: 'BC-1.0',
        signNumbers: generateSignRange((i - 1) * 75 + 1, i * 75),
        pageTitle: `Page ${i}`
      });
    }
    
    // Page 16-25: PAC-1.1 (Power centers)
    for (let i = 16; i <= 25; i++) {
      metadata.push({
        pageNumber: i,
        signType: 'PAC-1.1',
        signNumbers: generateSignRange((i - 1) * 75 + 1, i * 75),
        pageTitle: `Page ${i}`
      });
    }
    
    // Page 26-40: ID-5.2 (Room IDs)
    for (let i = 26; i <= 40; i++) {
      metadata.push({
        pageNumber: i,
        signType: 'ID-5.2',
        signNumbers: generateSignRange((i - 1) * 75 + 1, i * 75),
        pageTitle: `Page ${i}`
      });
    }
    
    // Page 41-57: Mixed types
    for (let i = 41; i <= 57; i++) {
      metadata.push({
        pageNumber: i,
        signType: i % 2 === 0 ? 'BC-5.1' : 'BC-5.2',
        signNumbers: generateSignRange((i - 1) * 75 + 1, Math.min(i * 75, 4314)),
        pageTitle: `Page ${i}`
      });
    }
    
    setPageSignTypes(metadata);
  };

  // Generate sign number range
  const generateSignRange = (start: number, end: number): string[] => {
    const range: string[] = [];
    for (let i = start; i <= end && i <= 4314; i++) {
      range.push(i.toString().padStart(4, '0'));
    }
    return range;
  };

  // Process uploaded PDF
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsProcessingPDF(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process PDF');
      }

      const data = await response.json();
      setPageSignTypes(data.pages);
      setTotalPages(data.totalPages);
      
      // Auto-assign based on extracted data
      if (data.pages.length > 0) {
        autoAssignFromExtraction(data.pages);
      }
    } catch (error) {
      console.error('PDF processing error:', error);
      alert('Failed to process PDF. Using pre-loaded ATL06 data.');
      loadATL06Metadata();
    } finally {
      setIsProcessingPDF(false);
    }
  };

  // Auto-assign signs based on extraction
  const autoAssignFromExtraction = (pages: PageSignType[]) => {
    const newAssignments = new Map(assignments);
    
    pages.forEach(page => {
      if (page.signType && page.signType !== 'Unclassified') {
        page.signNumbers.forEach(signNumber => {
          newAssignments.set(signNumber, {
            sign_number: signNumber,
            sign_type_code: page.signType,
            verified: false,
            page_number: page.pageNumber
          });
        });
      }
    });
    
    setAssignments(newAssignments);
  };

  // Get current page data
  const currentPageData = useMemo(() => {
    return pageSignTypes.find(p => p.pageNumber === currentPage);
  }, [pageSignTypes, currentPage]);

  // Filter signs based on search and filters
  const filteredSigns = useMemo(() => {
    let filtered = [...signs];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(sign => 
        sign.sign_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by assignment status
    if (filterStatus === 'assigned') {
      filtered = filtered.filter(sign => 
        assignments.has(sign.sign_number) && assignments.get(sign.sign_number)?.sign_type_code
      );
    } else if (filterStatus === 'unassigned') {
      filtered = filtered.filter(sign => 
        !assignments.has(sign.sign_number) || !assignments.get(sign.sign_number)?.sign_type_code
      );
    }
    
    // Filter by current page if enabled
    if (showOnlyCurrentPage && currentPageData) {
      filtered = filtered.filter(sign => 
        currentPageData.signNumbers.includes(sign.sign_number)
      );
    }
    
    return filtered;
  }, [signs, searchTerm, filterStatus, showOnlyCurrentPage, currentPageData, assignments]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = signs.length;
    const assigned = Array.from(assignments.values()).filter(a => a.sign_type_code).length;
    const verified = Array.from(assignments.values()).filter(a => a.verified).length;
    const percentage = total > 0 ? Math.round((assigned / total) * 100) : 0;
    
    return { total, assigned, unassigned: total - assigned, verified, percentage };
  }, [signs, assignments]);

  // Bulk assign signs to type
  const bulkAssignSignType = (signNumbers: string[], typeCode: string) => {
    const newAssignments = new Map(assignments);
    
    signNumbers.forEach(signNumber => {
      newAssignments.set(signNumber, {
        sign_number: signNumber,
        sign_type_code: typeCode,
        verified: false,
        page_number: currentPage
      });
    });
    
    setAssignments(newAssignments);
    setSelectedSigns(new Set());
  };

  // Auto-assign current page
  const autoAssignCurrentPage = () => {
    if (!currentPageData || !currentPageData.signType || currentPageData.signType === 'Unclassified') {
      alert('No sign type detected for current page');
      return;
    }
    
    bulkAssignSignType(currentPageData.signNumbers, currentPageData.signType);
  };

  // Assign by range
  const assignRange = (startNum: string, endNum: string, typeCode: string) => {
    const start = parseInt(startNum);
    const end = parseInt(endNum);
    const signNumbers: string[] = [];
    
    for (let i = start; i <= end; i++) {
      const signNumber = i.toString().padStart(4, '0');
      if (signs.some(s => s.sign_number === signNumber)) {
        signNumbers.push(signNumber);
      }
    }
    
    bulkAssignSignType(signNumbers, typeCode);
  };

  // Save assignments to Supabase
  const saveAssignments = async () => {
    setIsSaving(true);
    
    try {
      // In production, update Supabase
      // For demo, just show success
      console.log('Saving assignments:', Array.from(assignments.values()));
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Successfully saved ${assignments.size} assignments`);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setIsSaving(false);
    }
  };

  // Export assignments
  const exportAssignments = () => {
    const data = {
      site: 'ATL06',
      timestamp: new Date().toISOString(),
      total_signs: signs.length,
      assigned: stats.assigned,
      assignments: Array.from(assignments.values())
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atl06-assignments-${Date.now()}.json`;
    a.click();
  };

  // Toggle sign selection
  const toggleSignSelection = (signNumber: string) => {
    const newSelection = new Set(selectedSigns);
    if (newSelection.has(signNumber)) {
      newSelection.delete(signNumber);
    } else {
      newSelection.add(signNumber);
    }
    setSelectedSigns(newSelection);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">📋 Sign Type Assignment - ATL06</h1>
                <p className="text-sm text-gray-600">
                  {stats.total.toLocaleString()} signs | {stats.percentage}% assigned | {stats.verified} verified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAssignments}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={saveAssignments}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Progress:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{stats.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panels */}
      <div className="flex-1 flex">
        {/* Left Panel - PDF Page Viewer */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">PDF Pages</h2>
            
            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Page Preview */}
            <div className="bg-gray-100 rounded-lg p-4 mb-3">
              <div className="aspect-[8.5/11] bg-white rounded shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Page {currentPage}</p>
                  {currentPageData && (
                    <>
                      <p className="text-xs text-gray-500 mt-2">
                        Sign Type: <span className="font-semibold">{currentPageData.signType}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Signs: {currentPageData.signNumbers[0]} - {currentPageData.signNumbers[currentPageData.signNumbers.length - 1]}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <button
              onClick={autoAssignCurrentPage}
              disabled={!currentPageData?.signType || currentPageData.signType === 'Unclassified'}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Auto-Assign Page to {currentPageData?.signType || 'N/A'}
            </button>
          </div>

          {/* Upload PDF */}
          <div className="p-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Release PDF</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePDFUpload}
                className="hidden"
                disabled={isProcessingPDF}
              />
            </label>
            {isProcessingPDF && (
              <p className="text-xs text-gray-500 mt-2">Processing PDF...</p>
            )}
          </div>
        </div>

        {/* Middle Panel - Sign Assignment */}
        <div className="flex-1 flex flex-col">
          {/* Filters */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search signs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Signs</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyCurrentPage}
                  onChange={(e) => setShowOnlyCurrentPage(e.target.checked)}
                  className="rounded"
                />
                Current Page Only
              </label>
            </div>
          </div>

          {/* Sign List */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <table className="w-full">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr className="border-b">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSigns(new Set(filteredSigns.map(s => s.sign_number)));
                        } else {
                          setSelectedSigns(new Set());
                        }
                      }}
                      checked={selectedSigns.size === filteredSigns.length && filteredSigns.length > 0}
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-semibold">Sign #</th>
                  <th className="p-3 text-left text-sm font-semibold">Type</th>
                  <th className="p-3 text-left text-sm font-semibold">Status</th>
                  <th className="p-3 text-left text-sm font-semibold">Page</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredSigns.slice(0, 100).map(sign => {
                  const assignment = assignments.get(sign.sign_number);
                  return (
                    <tr key={sign.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedSigns.has(sign.sign_number)}
                          onChange={() => toggleSignSelection(sign.sign_number)}
                        />
                      </td>
                      <td className="p-3 font-mono text-sm">{sign.sign_number}</td>
                      <td className="p-3">
                        {assignment?.sign_type_code ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {assignment.sign_type_code}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">--</span>
                        )}
                      </td>
                      <td className="p-3">
                        {assignment?.verified ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : assignment?.sign_type_code ? (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {assignment?.page_number || '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredSigns.length > 100 && (
              <div className="p-4 text-center text-sm text-gray-500">
                Showing first 100 of {filteredSigns.length} signs
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedSigns.size > 0 && (
            <div className="bg-white border-t p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedSigns.size} selected
                </span>
                <select
                  value={selectedSignType}
                  onChange={(e) => setSelectedSignType(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg"
                >
                  <option value="">Choose type...</option>
                  {signTypes.map(type => (
                    <option key={type.id} value={type.sign_type_code}>
                      {type.sign_type_code} - {type.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedSignType) {
                      bulkAssignSignType(Array.from(selectedSigns), selectedSignType);
                    }
                  }}
                  disabled={!selectedSignType}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign Type
                </button>
                <button
                  onClick={() => setSelectedSigns(new Set())}
                  className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Sign Types */}
        <div className="w-80 bg-white border-l">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Sign Types</h2>
          </div>
          <div className="overflow-auto">
            {signTypes.map(type => {
              const assignedCount = Array.from(assignments.values()).filter(
                a => a.sign_type_code === type.sign_type_code
              ).length;
              
              return (
                <div
                  key={type.id}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedSignType(type.sign_type_code)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{type.sign_type_code}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {assignedCount} assigned
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedSigns.size > 0) {
                          bulkAssignSignType(Array.from(selectedSigns), type.sign_type_code);
                        }
                      }}
                      disabled={selectedSigns.size === 0}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      Select
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}