import React, { useState, useEffect, CSSProperties } from 'react';

// Define custom CSS properties for Electron app region
interface AppRegionStyle extends CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag';
}

interface TitleBarProps {
  title: string;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  className?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ onMinimize, onMaximize, onClose, className = '' }) => {
  const [platform, setPlatform] = useState<'win32' | 'darwin' | 'other'>('other');

  // Detect platform on component mount
  useEffect(() => {
    // Use navigator.platform as a fallback in the renderer
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows')) {
      setPlatform('win32');
    } else if (userAgent.includes('mac')) {
      setPlatform('darwin');
    } else {
      setPlatform('other');
    }
  }, []);



  // Define app region styles
  const dragStyle: AppRegionStyle = { WebkitAppRegion: 'drag' };
  const noDragStyle: AppRegionStyle = { WebkitAppRegion: 'no-drag' };

  // Render platform-specific window controls
  const renderWindowControls = () => {
    // Only render custom window controls for non-macOS platforms
    // For macOS, we're using the native traffic lights via Electron's titleBarStyle: 'hiddenInset'
    if (platform !== 'darwin') {
      // Windows-style controls (right-aligned, monochrome)
      return (
        <div className="flex items-center">
          <button
            className="flex items-center justify-center w-10 h-8 text-text-secondary hover:bg-background-tertiary transition-colors"
            style={noDragStyle}
            onClick={onMinimize}
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            className="flex items-center justify-center w-10 h-8 text-text-secondary hover:bg-background-tertiary transition-colors"
            style={noDragStyle}
            onClick={onMaximize}
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0" y="0" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </button>
          <button
            className="flex items-center justify-center w-10 h-8 text-text-secondary hover:bg-danger hover:text-white transition-colors"
            style={noDragStyle}
            onClick={onClose}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      );
    }

    // Return null for macOS since we're using native controls
    return null;
  };

  return (
    <div
      className={`relative flex flex-col h-12 border-b-0 z-20 select-none w-full ${className}`}
      style={dragStyle}
    >
      <div className="flex justify-between items-center w-full h-full px-4">
        {platform === 'darwin' ? (
          // macOS layout - we need to leave space for the native traffic lights
          // and center the title in the remaining space
          <>
            {/* Empty space for traffic lights (80px) - increased for better spacing */}
            <div className="w-[80px]"></div>

            {/* Empty space for centered layout */}
            <div className="flex items-center justify-center flex-grow">
            </div>

            {/* Empty space to balance the layout */}
            <div className="w-[80px]"></div>
          </>
        ) : (
          // Windows layout (menu/title on left, controls on right)
          <>
            <div className="flex items-center">
            </div>
            {renderWindowControls()}
          </>
        )}
      </div>


    </div>
  );
};

export default TitleBar;
