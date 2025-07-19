import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';

const MediaAsset = ({ url, title, type = 'auto' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine media type from URL or props
  const getMediaType = () => {
    if (type !== 'auto') return type;
    
    // Remove query parameters and get the path
    const urlPath = url.split('?')[0];
    const extension = urlPath.split('.').pop()?.toLowerCase();
    
    // Check for video extensions
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    // Check for image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    
    // Fallback: check URL path for hints
    if (urlPath.includes('/dwnld/video/')) {
      return 'video';
    }
    if (urlPath.includes('/dwnld/image/')) {
      return 'image';
    }
    
    return 'unknown';
  };

  const mediaType = getMediaType();

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (mediaType === 'video') {
    return (
      <div className="relative group">
        <video
          className="w-full aspect-[9/16] rounded-lg shadow-md"
          controls
          preload="metadata"
          onError={(e) => {
            console.error('Failed to load video:', url);
            e.target.style.display = 'none';
          }}
          onLoadStart={() => console.log('Video loading started:', url)}
        >
          <source src={url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {title && (
          <div className="mt-2 text-sm text-gray-600 font-medium">
            {title}
          </div>
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (mediaType === 'image') {
    return (
      <div className="relative group">
        <img
          src={url}
          alt={title || 'Ad asset'}
          className="w-full aspect-[9/16] object-cover rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handleFullscreen}
          onError={(e) => {
            console.error('Failed to load image:', url);
            e.target.style.display = 'none';
          }}
          onLoad={() => console.log('Image loaded successfully:', url)}
        />
        
        {title && (
          <div className="mt-2 text-sm text-gray-600 font-medium">
            {title}
          </div>
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Fallback for unknown media types
  return (
    <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
          <span className="text-xs text-gray-600">?</span>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {title || 'Media Asset'}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            View Asset
          </a>
        </div>
      </div>
    </div>
  );
};

export default MediaAsset; 