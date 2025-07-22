# Design Document

## Overview

This design document outlines the UI improvements needed to prepare the Scribble note-taking application for beta release. The focus is on polishing the existing interface, fixing usability issues, and ensuring a consistent, professional user experience across both the main application and note editor windows.

The design builds upon the existing architecture with minimal structural changes, focusing on refinements to visual consistency, interaction patterns, and user experience flows.

## Architecture

### Current Architecture Assessment
- **Main Window**: React-based with Tailwind CSS styling, using a theme system with dim/dark/light modes
- **Note Editor**: Separate window with Tiptap editor and essential toolbar
- **Theme System**: CSS custom properties with Tailwind integration
- **Component Structure**: Well-organized with shared components and services

### Design Principles
1. **Consistency**: Unified visual language across all windows and components
2. **Accessibility**: Proper contrast ratios, keyboard navigation, and screen reader support
3. **Performance**: Smooth animations and responsive interactions
4. **Minimalism**: Clean, distraction-free interface focused on content
5. **Reliability**: Stable interactions without bugs or edge cases

## Components and Interfaces

### Main Application Window

#### Header and Navigation
- **Search Bar**: Enhanced with better focus states and keyboard navigation
- **Action Buttons**: Consistent sizing, hover states, and visual feedback
- **Collection Tabs**: Improved visual hierarchy and active states
- **Settings Access**: Clear iconography and accessible tooltips

#### Note List and Cards
- **Card Design**: Consistent spacing, typography, and hover effects
- **Grid Layout**: Responsive design that adapts to window size
- **Loading States**: Smooth skeleton loading and transitions
- **Empty States**: Helpful messaging and clear next actions

#### Sidebar (Future Enhancement)
- **Navigation Icons**: Clear, consistent iconography
- **Active States**: Visual feedback for current section
- **Responsive Behavior**: Collapsible design for smaller windows

### Note Editor Window

#### Essential Toolbar
- **Button Design**: Consistent sizing, spacing, and visual feedback
- **Active States**: Clear indication of applied formatting
- **Grouping**: Logical organization with separators
- **Responsiveness**: Adaptive layout for different window sizes

#### Editor Interface
- **Typography**: Consistent font sizing and line heights
- **Focus States**: Clear cursor visibility and selection feedback
- **Markdown Rendering**: Smooth real-time preview updates
- **Distraction-Free Mode**: Minimal UI when toolbar is hidden

### Theme System Enhancements

#### Color Consistency
- **Primary Colors**: Consistent accent color usage across themes
- **Background Hierarchy**: Clear distinction between different UI levels
- **Text Contrast**: Proper contrast ratios for all theme variants
- **Interactive States**: Unified hover, active, and focus states

#### Typography Scale
- **Heading Hierarchy**: Clear visual distinction between heading levels
- **Body Text**: Optimal reading experience with proper line heights
- **UI Text**: Consistent sizing for buttons, labels, and navigation

## Data Models

### Theme Configuration
```typescript
interface ThemeConfig {
  name: 'dim' | 'dark' | 'light';
  colors: {
    primary: string;
    background: {
      main: string;
      notes: string;
      titlebar: string;
      sidebar: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    interactive: {
      hover: string;
      active: string;
      focus: string;
    };
  };
}
```

### UI State Management
```typescript
interface UIState {
  activeTheme: ThemeName;
  toolbarVisible: boolean;
  sidebarCollapsed: boolean;
  searchFocused: boolean;
  loadingStates: {
    notes: boolean;
    collections: boolean;
  };
}
```

## Error Handling

### Visual Error States
- **Loading Failures**: Clear error messages with retry options
- **Network Issues**: Graceful degradation with offline indicators
- **Data Corruption**: Recovery suggestions and backup options
- **Theme Loading**: Fallback to default theme on errors

### User Feedback
- **Toast Notifications**: Non-intrusive success and error messages
- **Progress Indicators**: Clear feedback for long-running operations
- **Validation Messages**: Immediate feedback for user input
- **Confirmation Dialogs**: Clear actions for destructive operations

## Testing Strategy

### Visual Regression Testing
- **Theme Switching**: Verify all themes render correctly
- **Responsive Design**: Test across different window sizes
- **Component States**: Validate hover, active, and focus states
- **Animation Smoothness**: Ensure transitions are fluid

### Accessibility Testing
- **Keyboard Navigation**: Tab order and keyboard shortcuts
- **Screen Reader**: Proper ARIA labels and semantic markup
- **Color Contrast**: Verify WCAG compliance across all themes
- **Focus Management**: Clear focus indicators and logical flow

### User Experience Testing
- **Task Completion**: Core workflows work smoothly
- **Error Recovery**: Users can recover from common errors
- **Performance**: Responsive interactions under normal load
- **Cross-Window**: Consistent experience between main and note windows

### Integration Testing
- **Theme Persistence**: Settings saved and restored correctly
- **Window Communication**: Proper synchronization between windows
- **Hotkey Functionality**: All keyboard shortcuts work reliably
- **Data Consistency**: UI updates reflect actual data state

## Implementation Approach

### Phase 1: Visual Consistency
- Standardize component styling and spacing
- Fix theme-specific color inconsistencies
- Improve typography hierarchy and readability
- Enhance interactive states and animations

### Phase 2: User Experience
- Refine keyboard navigation and shortcuts
- Improve loading states and error handling
- Polish toolbar and editor interactions
- Optimize responsive behavior

### Phase 3: Accessibility and Polish
- Ensure WCAG compliance across all themes
- Add proper ARIA labels and semantic markup
- Fine-tune animations and transitions
- Comprehensive testing and bug fixes

### Technical Considerations
- **CSS Custom Properties**: Leverage existing theme system
- **Tailwind Utilities**: Use consistent spacing and sizing scales
- **Component Reusability**: Share common UI patterns
- **Performance**: Minimize layout thrashing and repaints