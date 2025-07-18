import React from 'react';
import { BarChart3 } from 'lucide-react';

const Chart = ({ data, type = 'bar', title, height = 300 }) => {
  // This is a placeholder component
  // In a real implementation, you would use Recharts, D3.js, or Chart.js
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No data available for chart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <div 
        className="flex items-center justify-center text-gray-500"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-600">
            Chart visualization would be rendered here
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Data points: {data.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chart; 