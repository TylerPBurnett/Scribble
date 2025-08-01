/**
 * Performance Dashboard Component
 * Provides a visual interface for monitoring component performance in development
 */

import React, { useState, useEffect } from 'react';
import {
  getAllPerformanceMetrics,
  getPerformanceSummary,
  resetAllPerformanceMetrics,
  type PerformanceMetrics
} from '../utils/performanceUtils';
import {
  generatePerformanceReport,
  exportPerformanceData,
  printPerformanceReport,
  type PerformanceReport
} from '../utils/performanceLogger';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
  refreshInterval?: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible = false,
  onClose,
  refreshInterval = 2000
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [summary, setSummary] = useState(getPerformanceSummary());
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'renders' | 'avgTime' | 'hitRate'>('avgTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Update metrics periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const allMetrics = Array.from(getAllPerformanceMetrics().values());
      setMetrics(allMetrics);
      setSummary(getPerformanceSummary());
    };

    updateMetrics();
    const intervalId = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(intervalId);
  }, [isVisible, refreshInterval]);

  // Generate report
  const handleGenerateReport = () => {
    const newReport = generatePerformanceReport();
    setReport(newReport);
  };

  // Export data
  const handleExportData = () => {
    const data = exportPerformanceData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset all metrics
  const handleResetMetrics = () => {
    resetAllPerformanceMetrics();
    setMetrics([]);
    setSummary(getPerformanceSummary());
    setReport(null);
  };

  // Sort metrics
  const sortedMetrics = [...metrics].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortBy) {
      case 'name':
        aValue = a.componentName;
        bValue = b.componentName;
        break;
      case 'renders':
        aValue = a.renderCount;
        bValue = b.renderCount;
        break;
      case 'avgTime':
        aValue = a.averageRenderTime;
        bValue = b.averageRenderTime;
        break;
      case 'hitRate':
        aValue = a.memoizationHitRate;
        bValue = b.memoizationHitRate;
        break;
      default:
        aValue = a.averageRenderTime;
        bValue = b.averageRenderTime;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    const numA = aValue as number;
    const numB = bValue as number;
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  // Get performance status color
  const getPerformanceColor = (avgTime: number): string => {
    if (avgTime <= 8) return '#22c55e'; // green
    if (avgTime <= 16) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '600px',
      maxHeight: '80vh',
      backgroundColor: '#1f2937',
      color: '#f9fafb',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#60a5fa' }}>🚀 Performance Dashboard</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={printPerformanceReport}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Console Log
          </button>
          <button
            onClick={handleGenerateReport}
            style={{
              padding: '4px 8px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Generate Report
          </button>
          <button
            onClick={handleExportData}
            style={{
              padding: '4px 8px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Export
          </button>
          <button
            onClick={handleResetMetrics}
            style={{
              padding: '4px 8px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '4px 8px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '6px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>📊 Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <div>Components: <strong>{summary.totalComponents}</strong></div>
          <div>Total Renders: <strong>{summary.totalRenders}</strong></div>
          <div>Avg Render Time: <strong style={{ color: getPerformanceColor(summary.averageRenderTime) }}>
            {summary.averageRenderTime.toFixed(2)}ms
          </strong></div>
          <div>Slowest: <strong style={{ color: '#ef4444' }}>{summary.slowestComponent || 'N/A'}</strong></div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: '2px 6px',
            backgroundColor: '#374151',
            color: '#f9fafb',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          <option value="name">Name</option>
          <option value="renders">Renders</option>
          <option value="avgTime">Avg Time</option>
          <option value="hitRate">Hit Rate</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            padding: '2px 6px',
            backgroundColor: '#4b5563',
            color: '#f9fafb',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Metrics Table */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>📈 Component Metrics</h4>
        {sortedMetrics.length === 0 ? (
          <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No performance data available</div>
        ) : (
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#4b5563' }}>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #6b7280' }}>Component</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>Renders</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>Avg Time</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>Last Time</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>Hit Rate</th>
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((metric, index) => (
                  <tr key={metric.componentName} style={{ backgroundColor: index % 2 === 0 ? '#374151' : '#4b5563' }}>
                    <td style={{ padding: '6px', borderBottom: '1px solid #6b7280' }}>{metric.componentName}</td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>
                      {metric.renderCount}
                    </td>
                    <td style={{ 
                      padding: '6px', 
                      textAlign: 'right', 
                      borderBottom: '1px solid #6b7280',
                      color: getPerformanceColor(metric.averageRenderTime)
                    }}>
                      {metric.averageRenderTime.toFixed(2)}ms
                    </td>
                    <td style={{ 
                      padding: '6px', 
                      textAlign: 'right', 
                      borderBottom: '1px solid #6b7280',
                      color: getPerformanceColor(metric.lastRenderTime)
                    }}>
                      {metric.lastRenderTime.toFixed(2)}ms
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #6b7280' }}>
                      {(metric.memoizationHitRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Section */}
      {report && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '6px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>💡 Recommendations</h4>
          {report.recommendations.length === 0 ? (
            <div style={{ color: '#22c55e' }}>✅ No performance issues detected!</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {report.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '4px', color: '#fbbf24' }}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;