import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import logoIcon from '../../assets/icon-64.png';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [platform, setPlatform] = useState<'win32' | 'darwin' | 'other'>('other');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the menu is open and the click is outside both the menu and the button
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    // Add event listener when menu is open
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

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

            {/* Centered clickable logo */}
            <div className="flex items-center justify-center flex-grow">
              <button
                ref={buttonRef}
                className="flex items-center bg-transparent border-none cursor-pointer p-0"
                onClick={toggleMenu}
                style={noDragStyle}
                title="Menu"
              >
                <img
                  src={logoIcon}
                  alt="Scribble Logo"
                  className="w-7 h-7 object-contain hover:opacity-80 transition-opacity"
                />
              </button>
            </div>

            {/* Empty space to balance the layout */}
            <div className="w-[80px]"></div>
          </>
        ) : (
          // Windows layout (menu/title on left, controls on right)
          <>
            <div className="flex items-center">
              <button
                ref={buttonRef}
                className="flex items-center bg-transparent border-none cursor-pointer p-0"
                onClick={toggleMenu}
                style={noDragStyle}
                title="Menu"
              >
                <img
                  src={logoIcon}
                  alt="Scribble Logo"
                  className="w-7 h-7 object-contain hover:opacity-80 transition-opacity"
                />
              </button>
            </div>
            {renderWindowControls()}
          </>
        )}
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className={`absolute top-12 ${platform === 'darwin' ? 'left-1/2 transform -translate-x-1/2' : 'left-0'} w-56 border border-gray-800/50 shadow-lg z-10 rounded-lg font-twitter`}
          style={{ ...noDragStyle, backgroundColor: '#191a21' }}
        >
          <div className="py-3 px-4 cursor-pointer transition-all duration-200 flex items-center hover:bg-black/20 first:rounded-t-lg">
            <svg className="mr-3 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span className="text-text">New Note</span>
          </div>
          <div className="py-3 px-4 cursor-pointer transition-all duration-200 flex items-center hover:bg-black/20">
            <svg className="mr-3 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span className="text-text">Settings</span>
          </div>
          <div className="py-3 px-4 cursor-pointer transition-all duration-200 flex items-center hover:bg-black/20 rounded-b-lg">
            <svg className="mr-3 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span className="text-text">About</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TitleBar;
