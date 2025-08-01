/**
 * Example integration of performance utilities with React components
 * This demonstrates how to integrate the performance measurement infrastructure
 */

import React, { useMemo, useCallback } from 'react';
import { useRenderPerformance, useMemoizationTracking, useOperationMeasurement } from '../hooks/usePerformanceMonitoring';

// Example: NoteCard component with performance monitoring
interface NoteCardProps {
  note: {
    id: string;
    title: string;
    content: string;
    color: string;
    updatedAt: Date;
  };
  onClick: (note: any) => void;
  isActive?: boolean;
}

const OptimizedNoteCard: React.FC<NoteCardProps> = React.memo(({ note, onClick, isActive }) => {
  // Track render performance
  const { logMetrics } = useRenderPerformance('NoteCard');
  
  // Track memoization effectiveness
  useMemoizationTracking('NoteCard', [note.id, note.title, note.content, note.updatedAt, isActive]);
  
  // Memoized click handler
  const handleClick = useCallback(() => {
    onClick(note);
  }, [note, onClick]);
  
  // Expensive computation with memoization
  const formattedContent = useMemo(() => {
    // Simulate expensive formatting operation
    return note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');
  }, [note.content]);
  
  return (
    <div 
      onClick={handleClick}
      style={{
        padding: '12px',
        backgroundColor: note.color,
        border: isActive ? '2px solid #007acc' : '1px solid #ccc',
        borderRadius: '8px',
        cursor: 'pointer',
        marginBottom: '8px'
      }}
    >
      <h3>{note.title}</h3>
      <p>{formattedContent}</p>
      <small>Updated: {note.updatedAt.toLocaleDateString()}</small>
      {process.env.NODE_ENV === 'development' && (
        <button onClick={(e) => { e.stopPropagation(); logMetrics(); }}>
          Log Performance
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.color === nextProps.note.color &&
    prevProps.note.updatedAt.getTime() === nextProps.note.updatedAt.getTime() &&
    prevProps.isActive === nextProps.isActive
  );
});

// Example: NoteList component with performance monitoring
interface NoteListProps {
  notes: Array<{
    id: string;
    title: string;
    content: string;
    color: string;
    updatedAt: Date;
    favorite?: boolean;
  }>;
  onNoteClick: (note: any) => void;
  activeNoteId?: string;
  sortBy: 'title' | 'updatedAt';
}

const OptimizedNoteList: React.FC<NoteListProps> = ({ notes, onNoteClick, activeNoteId, sortBy }) => {
  // Track render performance
  useRenderPerformance('NoteList');
  
  // Track memoization
  useMemoizationTracking('NoteList', [notes, sortBy]);
  
  // Operation measurement hook
  const { measureSync } = useOperationMeasurement();
  
  // Memoized sorting operation
  const sortedNotes = useMemo(() => {
    return measureSync('Note Sorting', () => {
      return [...notes].sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
      });
    }).result;
  }, [notes, sortBy, measureSync]);
  
  // Memoized favorite/regular note separation
  const { favoriteNotes, regularNotes } = useMemo(() => {
    const favorites = sortedNotes.filter(note => note.favorite);
    const regular = sortedNotes.filter(note => !note.favorite);
    return { favoriteNotes: favorites, regularNotes: regular };
  }, [sortedNotes]);
  
  // Memoized click handler
  const handleNoteClick = useCallback((note: any) => {
    onNoteClick(note);
  }, [onNoteClick]);
  
  return (
    <div style={{ padding: '16px' }}>
      <h2>Notes ({notes.length})</h2>
      
      {favoriteNotes.length > 0 && (
        <div>
          <h3>⭐ Favorites</h3>
          {favoriteNotes.map(note => (
            <OptimizedNoteCard
              key={note.id}
              note={note}
              onClick={handleNoteClick}
              isActive={note.id === activeNoteId}
            />
          ))}
        </div>
      )}
      
      {regularNotes.length > 0 && (
        <div>
          <h3>📝 Notes</h3>
          {regularNotes.map(note => (
            <OptimizedNoteCard
              key={note.id}
              note={note}
              onClick={handleNoteClick}
              isActive={note.id === activeNoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Example: Performance monitoring wrapper component
const PerformanceMonitoringWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { measureOperation } = useOperationMeasurement();
  
  React.useEffect(() => {
    // Example: Measure component mount time
    const measureMount = async () => {
      await measureOperation('Component Mount', async () => {
        return new Promise(resolve => setTimeout(resolve, 10));
      });
    };
    
    measureMount();
  }, [measureOperation]);
  
  return <>{children}</>;
};

// Example usage in a main component
const ExampleApp: React.FC = () => {
  const [notes] = React.useState([
    {
      id: '1',
      title: 'First Note',
      content: 'This is the content of the first note. It contains some text that will be truncated in the preview.',
      color: '#fff9c4',
      updatedAt: new Date('2024-01-15'),
      favorite: true
    },
    {
      id: '2',
      title: 'Second Note',
      content: 'This is another note with different content.',
      color: '#e1f5fe',
      updatedAt: new Date('2024-01-16'),
      favorite: false
    }
  ]);
  
  const [activeNoteId, setActiveNoteId] = React.useState<string>();
  const [sortBy, setSortBy] = React.useState<'title' | 'updatedAt'>('updatedAt');
  
  const handleNoteClick = useCallback((note: any) => {
    setActiveNoteId(note.id);
  }, []);
  
  return (
    <PerformanceMonitoringWrapper>
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <header style={{ padding: '16px', borderBottom: '1px solid #ccc' }}>
          <h1>Performance Optimized Note App</h1>
          <div>
            <label>
              Sort by:
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="updatedAt">Date Updated</option>
                <option value="title">Title</option>
              </select>
            </label>
          </div>
        </header>
        
        <main>
          <OptimizedNoteList
            notes={notes}
            onNoteClick={handleNoteClick}
            activeNoteId={activeNoteId}
            sortBy={sortBy}
          />
        </main>
        
        {process.env.NODE_ENV === 'development' && (
          <footer style={{ padding: '16px', borderTop: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
            <p>Performance monitoring is active in development mode.</p>
            <p>Open browser console and run: <code>performanceExamples.runAllExamples()</code></p>
          </footer>
        )}
      </div>
    </PerformanceMonitoringWrapper>
  );
};

export { OptimizedNoteCard, OptimizedNoteList, PerformanceMonitoringWrapper, ExampleApp };