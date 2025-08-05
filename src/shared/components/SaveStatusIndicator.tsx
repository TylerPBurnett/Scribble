import React, { useState, useEffect } from 'react';

interface SaveStatusProps {
  isSaving: boolean;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  className?: string;
  showText?: boolean;
}

export const SaveStatusIndicator: React.FC<SaveStatusProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  className = '',
  showText = true
}) => {
  const [fadeOut, setFadeOut] = useState(false);

  // Handle fade out effect after save completes
  useEffect(() => {
    if (!isSaving && !hasUnsavedChanges) {
      setFadeOut(true);
      const timer = setTimeout(() => setFadeOut(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, hasUnsavedChanges]);

  const getStatusInfo = () => {
    if (isSaving) {
      return {
        icon: (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
          </svg>
        ),
        text: 'Saving...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50'
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
          </svg>
        ),
        text: 'Unsaved changes',
        color: 'text-orange-500',
        bgColor: 'bg-orange-50'
      };
    }

    return {
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
      text: lastSaved ? formatLastSaved(lastSaved) : 'Saved',
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    };
  };

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 30) return 'Just now';
    if (diffMinutes < 1) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const status = getStatusInfo();

  return (
    <div 
      className={`
        flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-all duration-200
        ${status.bgColor} ${status.color} ${className}
        ${fadeOut ? 'opacity-50' : 'opacity-100'}
      `}
      title={showText ? undefined : status.text}
    >
      {status.icon}
      {showText && <span className="font-medium">{status.text}</span>}
    </div>
  );
};

// Compact version for toolbar
export const CompactSaveStatus: React.FC<Omit<SaveStatusProps, 'showText'>> = (props) => (
  <SaveStatusIndicator {...props} showText={false} className="px-1 py-1" />
);

// Full status with details (like Obsidian's status bar)
export const DetailedSaveStatus: React.FC<SaveStatusProps & { queueLength?: number }> = ({
  queueLength,
  ...props
}) => {
  const status = props.isSaving ? 'Saving' : 
                 props.hasUnsavedChanges ? 'Modified' : 'Synced';
  
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <SaveStatusIndicator {...props} />
      {queueLength && queueLength > 0 && (
        <span className="text-xs opacity-60">
          {queueLength} pending
        </span>
      )}
      <span className="text-xs opacity-60">
        {status}
      </span>
    </div>
  );
};
