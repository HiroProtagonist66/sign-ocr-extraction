'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, Download, Filter } from 'lucide-react';

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

export default function ManagerPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [releaseData, setReleaseData] = useState<ReleaseItem[]>([]);
  const [filteredData, setFilteredData] = useState<ReleaseItem[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);

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
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.signNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.signType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(filtered);
  }, [selectedArea, selectedLevel, selectedStatus, searchTerm, releaseData]);

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
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-gray-600" />
            Upload Release Data
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.signType || '-'}
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
        {releaseData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12">
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No release data loaded</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV file to view and manage sign releases
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-xs font-medium text-gray-700 mb-2">Example CSV format:</p>
                <pre className="text-xs text-gray-600 font-mono">
{`Sign Number,Area,Level,Sign Type,Status
2001,Zone A,Level 1,Exit,pending
2002,Zone A,Level 1,Directional,released
2003,Zone B,Level 2,Room ID,installed`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}