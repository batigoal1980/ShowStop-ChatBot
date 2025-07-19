import React from 'react';
import AssetCard from './AssetCard';

const AssetGrid = ({ assets = [], title = 'Media Assets' }) => {
  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center space-x-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">({assets.length} assets)</span>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex space-x-4 pb-4" style={{ minWidth: 'max-content' }}>
          {assets.map((asset, index) => (
            <div key={index} className="w-80 flex-shrink-0">
              <AssetCard 
                asset={asset} 
                metrics={asset.metrics || {}}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssetGrid; 