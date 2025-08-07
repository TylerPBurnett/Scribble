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
  children?: React.ReactNode;  // Add support for child components
}

const TitleBar: React.FC<TitleBarProps> = ({ onMinimize, onMaximize, onClose, className = '', children }) => {
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
      className={`relative flex flex-col h-10 border-b-0 z-20 select-none w-full ${className}`}
      style={dragStyle}
    >
      {/* Content positioned absolutely over the draggable area */}
      <div className="relative w-full h-full">
        {/* Platform-specific reserved spaces */}
        {platform === 'darwin' && (
          <div className="absolute left-0 w-[72px] h-full flex-shrink-0" />
        )}
        {platform !== 'darwin' && renderWindowControls() && (
          <div className="absolute right-0 h-full">
            {renderWindowControls()}
          </div>
        )}
        
        {/* Main content - children centered in full window */}
        <div className="absolute inset-0" style={noDragStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
