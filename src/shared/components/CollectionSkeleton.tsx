import React from 'react';

interface CollectionSkeletonProps {
  count?: number;
  className?: string;
}

export const CollectionTabsSkeleton: React.FC<CollectionSkeletonProps> = ({ 
  count = 3, 
  className = '' 
}) => {
  return (
    <div className={`flex gap-2 p-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background-secondary animate-pulse"
        >
          {/* Icon skeleton */}
          <div className="w-4 h-4 bg-background-tertiary rounded"></div>
          
          {/* Text skeleton */}
          <div className="h-4 bg-background-tertiary rounded" style={{ width: `${60 + Math.random() * 40}px` }}></div>
          
          {/* Count skeleton */}
          <div className="w-6 h-4 bg-background-tertiary rounded-full"></div>
        </div>
      ))}
    </div>
  );
};

export const CollectionListSkeleton: React.FC<CollectionSkeletonProps> = ({ 
  count = 5, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 p-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary animate-pulse"
        >
          {/* Icon skeleton */}
          <div className="w-8 h-8 bg-background-tertiary rounded-lg flex-shrink-0"></div>
          
          <div className="flex-1 min-w-0">
            {/* Title skeleton */}
            <div className="h-4 bg-background-tertiary rounded mb-2" style={{ width: `${50 + Math.random() * 30}%` }}></div>
            
            {/* Description skeleton */}
            <div className="h-3 bg-background-tertiary rounded" style={{ width: `${70 + Math.random() * 20}%` }}></div>
          </div>
          
          {/* Count skeleton */}
          <div className="w-8 h-6 bg-background-tertiary rounded-full flex-shrink-0"></div>
        </div>
      ))}
    </div>
  );
};

export const CollectionModalSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Title skeleton */}
      <div className="h-6 bg-background-tertiary rounded w-1/3 animate-pulse"></div>
      
      {/* Form fields skeleton */}
      <div className="space-y-4">
        {/* Name field */}
        <div>
          <div className="h-4 bg-background-tertiary rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="h-10 bg-background-secondary rounded animate-pulse"></div>
        </div>
        
        {/* Description field */}
        <div>
          <div className="h-4 bg-background-tertiary rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-20 bg-background-secondary rounded animate-pulse"></div>
        </div>
        
        {/* Icon selection skeleton */}
        <div>
          <div className="h-4 bg-background-tertiary rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="w-10 h-10 bg-background-secondary rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Color selection skeleton */}
        <div>
          <div className="h-4 bg-background-tertiary rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="flex gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="w-8 h-8 bg-background-secondary rounded-full animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Buttons skeleton */}
      <div className="flex gap-3 justify-end">
        <div className="h-10 w-20 bg-background-secondary rounded animate-pulse"></div>
        <div className="h-10 w-24 bg-background-secondary rounded animate-pulse"></div>
      </div>
    </div>
  );
};

// Generic loading spinner for inline loading states
export const CollectionSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg className="animate-spin text-text-tertiary" fill="none" viewBox="0 0 24 24">
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Loading state for collection operations
export const CollectionLoadingState: React.FC<{ 
  message?: string; 
  showSpinner?: boolean;
  className?: string;
}> = ({ 
  message = 'Loading collections...', 
  showSpinner = true,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center gap-3 p-8 text-text-secondary ${className}`}>
      {showSpinner && <CollectionSpinner />}
      <span className="text-sm">{message}</span>
    </div>
  );
};