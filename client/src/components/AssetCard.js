import React from 'react';
import { Image, Video, BarChart3, Eye, MousePointer, DollarSign } from 'lucide-react';
import MediaAsset from './MediaAsset';

const AssetCard = ({ asset, metrics = {} }) => {
  const isVideo = asset.url.includes('/dwnld/video/') || 
                  asset.url.match(/\.(mp4|mov|avi|webm|mkv)/i);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow h-full">
      {/* Media Asset */}
      <div className="relative">
        <MediaAsset url={asset.url} title={asset.title || 'Ad Asset'} />
        
        {/* Asset Type Badge */}
        <div className="absolute top-1 left-1">
          <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
            isVideo 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {isVideo ? (
              <>
                <Video className="h-2.5 w-2.5" />
                <span className="text-xs">Video</span>
              </>
            ) : (
              <>
                <Image className="h-2.5 w-2.5" />
                <span className="text-xs">Image</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      {Object.keys(metrics).length > 0 && (
        <div className="p-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            {/* Spend */}
            {metrics.spend !== undefined && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Spend</div>
                  <div className="text-xs font-medium">{formatCurrency(metrics.spend)}</div>
                </div>
              </div>
            )}

            {/* Impressions */}
            {metrics.impressions !== undefined && (
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Impressions</div>
                  <div className="text-xs font-medium">{formatNumber(metrics.impressions)}</div>
                </div>
              </div>
            )}

            {/* Clicks */}
            {metrics.clicks !== undefined && (
              <div className="flex items-center space-x-2">
                <MousePointer className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-500">Clicks</div>
                  <div className="text-xs font-medium">{formatNumber(metrics.clicks)}</div>
                </div>
              </div>
            )}

            {/* Purchases */}
            {metrics.purchases !== undefined && (
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <div>
                  <div className="text-xs text-gray-500">Purchases</div>
                  <div className="text-xs font-medium">{formatNumber(metrics.purchases)}</div>
                </div>
              </div>
            )}

            {/* Revenue */}
            {metrics.revenue !== undefined && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="text-xs text-gray-500">Revenue</div>
                  <div className="text-xs font-medium">{formatCurrency(metrics.revenue)}</div>
                </div>
              </div>
            )}

            {/* ROAS */}
            {metrics.roas !== undefined && (
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="text-xs text-gray-500">ROAS</div>
                  <div className="text-xs font-medium">{metrics.roas}x</div>
                </div>
              </div>
            )}

            {/* CTR */}
            {metrics.ctr !== undefined && (
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-xs text-gray-500">CTR</div>
                  <div className="text-xs font-medium">{metrics.ctr}%</div>
                </div>
              </div>
            )}

            {/* CPA */}
            {metrics.cpa !== undefined && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-xs text-gray-500">CPA</div>
                  <div className="text-xs font-medium">{formatCurrency(metrics.cpa)}</div>
                </div>
              </div>
            )}

            {/* CPM */}
            {metrics.cpm !== undefined && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-cyan-600" />
                <div>
                  <div className="text-xs text-gray-500">CPM</div>
                  <div className="text-xs font-medium">{formatCurrency(metrics.cpm)}</div>
                </div>
              </div>
            )}

            {/* CVR */}
            {metrics.cvr !== undefined && (
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-pink-600" />
                <div>
                  <div className="text-xs text-gray-500">CVR</div>
                  <div className="text-xs font-medium">{metrics.cvr}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset Info */}
      <div className="p-3 pt-0">
        <div className="text-sm text-gray-600 truncate">
          {asset.title || 'Ad Asset'}
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate">
          {asset.campaign_name && `Campaign: ${asset.campaign_name}`}
        </div>
      </div>
    </div>
  );
};

export default AssetCard; 