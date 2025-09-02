'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface DetectedAssignment {
  type: string;
  confidence: number;
  source: 'title_block' | 'content' | 'none';
  allTypes?: string[];
}

interface Props {
  suggestions: Record<number, DetectedAssignment>;
  signTypes: Array<{ sign_type_code: string; description: string }>;
  onApply: (assignments: Record<number, string>) => void;
  onClose: () => void;
}

export default function AutoDetectReviewModal({ 
  suggestions, 
  signTypes,
  onApply, 
  onClose 
}: Props) {
  const [reviewedAssignments, setReviewedAssignments] = useState(suggestions);
  
  // Calculate statistics
  const pages = Object.keys(suggestions).map(Number).sort((a, b) => a - b);
  const stats = {
    total: pages.length,
    highConfidence: Object.values(suggestions).filter(s => s.confidence > 0.8).length,
    mediumConfidence: Object.values(suggestions).filter(s => s.confidence > 0.5 && s.confidence <= 0.8).length,
    lowConfidence: Object.values(suggestions).filter(s => s.confidence <= 0.5).length
  };
  
  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600 bg-green-50';
    if (confidence > 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };
  
  const getConfidenceIcon = (confidence: number) => {
    if (confidence > 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence > 0.5) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Review Auto-Detected Sign Types</h2>
              <p className="text-gray-600 mt-1">
                {stats.total} pages analyzed • Review and adjust before applying
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Statistics */}
          <div className="mt-4 flex gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm">
                <span className="font-semibold text-green-600">{stats.highConfidence}</span>
                <span className="text-gray-600 ml-1">High Confidence</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm">
                <span className="font-semibold text-yellow-600">{stats.mediumConfidence}</span>
                <span className="text-gray-600 ml-1">Medium</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm">
                <span className="font-semibold text-red-600">{stats.lowConfidence}</span>
                <span className="text-gray-600 ml-1">Low/Manual Review</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700">Page</th>
                <th className="text-left p-3 font-medium text-gray-700">Detected Type</th>
                <th className="text-left p-3 font-medium text-gray-700">Source</th>
                <th className="text-left p-3 font-medium text-gray-700">Confidence</th>
                <th className="text-left p-3 font-medium text-gray-700">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pages.map(pageNum => {
                const suggestion = reviewedAssignments[pageNum];
                if (!suggestion) return null;
                
                return (
                  <tr 
                    key={pageNum}
                    className={getConfidenceColor(suggestion.confidence)}
                  >
                    <td className="p-3">
                      <span className="font-mono font-semibold">{pageNum}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getConfidenceIcon(suggestion.confidence)}
                        <span className="font-mono font-medium">
                          {suggestion.type || 'Not detected'}
                        </span>
                      </div>
                      {suggestion.allTypes && suggestion.allTypes.length > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Also found: {suggestion.allTypes.filter(t => t !== suggestion.type).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-600">
                        {suggestion.source === 'title_block' ? '📋 Title Block' :
                         suggestion.source === 'content' ? '📄 Page Content' :
                         '❓ Not Found'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              suggestion.confidence > 0.8 ? 'bg-green-500' :
                              suggestion.confidence > 0.5 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={reviewedAssignments[pageNum]?.type || ''}
                        onChange={(e) => {
                          setReviewedAssignments(prev => ({
                            ...prev,
                            [pageNum]: { 
                              ...prev[pageNum], 
                              type: e.target.value,
                              confidence: e.target.value ? 1.0 : 0 // Manual override = 100% confidence
                            }
                          }));
                        }}
                        className="px-3 py-1 border rounded-lg text-sm w-full"
                      >
                        <option value="">Not assigned</option>
                        {signTypes.map(type => (
                          <option key={type.sign_type_code} value={type.sign_type_code}>
                            {type.sign_type_code} - {type.description}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 High confidence detections are typically from title blocks
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Apply only high confidence
                  const filtered: Record<number, string> = {};
                  Object.entries(reviewedAssignments).forEach(([page, s]) => {
                    if (s.confidence > 0.8 && s.type) {
                      filtered[parseInt(page)] = s.type;
                    }
                  });
                  onApply(filtered);
                  onClose();
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
              >
                Apply High Confidence Only ({stats.highConfidence})
              </button>
              <button
                onClick={() => {
                  // Apply all detected
                  const all: Record<number, string> = {};
                  Object.entries(reviewedAssignments).forEach(([page, s]) => {
                    if (s.type) {
                      all[parseInt(page)] = s.type;
                    }
                  });
                  onApply(all);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Apply All Detected ({stats.total})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}