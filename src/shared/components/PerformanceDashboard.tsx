/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and optimization results
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllPerformanceMetrics,
  resetAllPerformanceMetrics,
  type PerformanceMetrics
} from '../utils/performanceUtils';
import {
  generatePerformanceReport,
  printPerformanceReport,
  exportPerformanceData,
  type PerformanceReport
} from '../utils/performanceLogger';
import {
  compareWithPreviousSnapshot,
  exportPerformanceComparisons,
  type ComparisonResult
} from '../utils/performanceComparison';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible = false,
  onClose,
  autoRefresh = true,
  refreshInterval = 2000
}) => {
  const [metrics, setMetrics] = useState<Map<string, PerformanceMetrics>>(new Map());
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'report' | 'comparisons'>('metrics');

  // Refresh data
  const refreshData = useCallback(() => {
    setMetrics(getAllPerformanceMetrics());
    setReport(generatePerformanceReport());
    
    // Get comparisons for all components
    const allComparisons: ComparisonResult[] = [];
    const allMetrics = getAllPerformanceMetrics();
    
    for (const componentName of allMetrics.keys()) {
      const comparison = compareWithPreviousSnapshot(componentName);
      if (comparison) {
        allComparisons.push(comparison);
      }
    }
    
    setComparisons(allComparisons);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    refreshData();
    const interval = setInterval(refreshData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [isVisible, autoRefresh, refreshInterval, refreshData]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Reset all metrics
  const handleReset = useCallback(() => {
    resetAllPerformanceMetrics();
    refreshData();
  }, [refreshData]);

  // Export data
  const handleExport = useCallback(() => {
    const performanceData = exportPerformanceData();
    const comparisonData = exportPerformanceComparisons();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      performance: JSON.parse(performanceData),
      comparisons: JSON.parse(comparisonData)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Print report to console
  const handlePrintReport = useCallback(() => {
    printPerformanceReport();
  }, []);

  if (!isVisible) return null;

  const summary = report?.summary || {
    totalComponents: 0,
    totalRenders: 0,
    averageRenderTime: 0,
    slowestComponent: null,
    fastestComponent: null
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Performance Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reset
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export
            </button>
            <button
              onClick={handlePrintReport}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Console Log
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Components</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.totalComponents}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Total Renders</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.totalRenders}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Avg Render Time</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.averageRenderTime.toFixed(2)}ms
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Slowest</div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400">
                {summary.slowestComponent || 'N/A'}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Fastest</div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                {summary.fastestComponent || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['metrics', 'report', 'comparisons'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                selectedTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedTab === 'metrics' && (
            <div className="space-y-4">
              {Array.from(metrics.entries()).map(([componentName, metric]) => (
                <div
                  key={componentName}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {componentName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Renders</div>
                      <div className="font-bold">{metric.renderCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Avg Time</div>
                      <div className={`font-bold ${
                        metric.averageRenderTime > 16 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {metric.averageRenderTime.toFixed(2)}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Last Time</div>
                      <div className="font-bold">{metric.lastRenderTime.toFixed(2)}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">Memo Hit Rate</div>
                      <div className={`font-bold ${
                        metric.memoizationHitRate < 0.5 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {(metric.memoizationHitRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'report' && report && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Recommendations
                </h3>
                {report.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No recommendations at this time.
                  </p>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'comparisons' && (
            <div className="space-y-4">
              {comparisons.map((comparison, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {comparison.componentName}
                  </h3>
                  
                  {comparison.summary.significantImprovements.length > 0 && (
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                        Improvements
                      </h4>
                      <ul className="text-sm space-y-1">
                        {comparison.summary.significantImprovements.map((improvement, i) => (
                          <li key={i} className="text-green-600 dark:text-green-400">
                            ✅ {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comparison.summary.regressions.length > 0 && (
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        Regressions
                      </h4>
                      <ul className="text-sm space-y-1">
                        {comparison.summary.regressions.map((regression, i) => (
                          <li key={i} className="text-red-600 dark:text-red-400">
                            ❌ {regression}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Overall Score: {comparison.summary.overallImprovement.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;