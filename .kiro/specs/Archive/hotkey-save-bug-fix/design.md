# Design Document

## Overview

The hotkey save bug is caused by a disconnect between the hotkey state management in the SettingsDialog component and the actual persistence to localStorage. The issue occurs because the hotkeys are managed separately from the form state, and while the local state is updated correctly, the save process is not properly persisting the hotkey changes to localStorage.

## Architecture

The hotkey save process involves several components:

1. **HotkeyEditor Component**: Captures individual hotkey changes
2. **HotkeysSection Component**: Manages the collection of hotkeys and calls onChange
3. **SettingsDialog Component**: Manages overall settings state and form submission
4. **SettingsService**: Handles localStorage operations and main process synchronization

The current flow has a critical gap where hotkey changes are not being properly included in the final settings object that gets saved to localStorage.

## Root Cause Analysis

After analyzing the code, the root cause is in the `SettingsDialog.tsx` component's `onSubmit` function. The issue is:

1. Hotkeys are managed in separate state (`hotkeys`) from the form state
2. In `onSubmit`, hotkeys are combined with form values correctly
3. However, the `saveSettings` function call in the shared service may not be receiving the complete settings object with hotkeys
4. The main process sync is happening, but localStorage is not being updated with the hotkey changes

The specific problem appears to be that the `hotkeys` property is not being properly merged into the final settings object before calling `saveSettings`.

## Components and Interfaces

### Modified Components

#### SettingsDialog.tsx
- **Issue**: The hotkey state is not being properly merged with form values before saving
- **Fix**: Ensure hotkeys are explicitly included in the settings object passed to `onSave`
- **Enhancement**: Add validation and error handling for hotkey save operations

#### SettingsService.ts
- **Issue**: May not be properly handling the hotkeys property in the settings object
- **Fix**: Add explicit logging and validation for hotkey persistence
- **Enhancement**: Add verification that hotkeys are actually written to localStorage

### Data Flow

```
HotkeyEditor (captures key) 
  → HotkeysSection (updates hotkey collection)
  → SettingsDialog (manages hotkey state)
  → onSubmit (combines with form data)
  → onSave callback (SettingsApp)
  → saveSettings (shared service)
  → localStorage.setItem
```

## Data Models

### Settings Object Structure
```typescript
interface AppSettings {
  saveLocation: string;
  autoSave: boolean;
  autoSaveInterval: number;
  theme: string;
  hotkeys: Record<HotkeyAction, string>; // This must be properly included
  // ... other properties
}
```

### Hotkey State Structure
```typescript
type HotkeyState = Record<HotkeyAction, string>;
```

## Error Handling

### Current Issues
- Silent failures when hotkeys are not saved
- No validation of hotkey data before saving
- No verification that localStorage was actually updated

### Proposed Solutions
1. **Explicit Validation**: Validate hotkey data structure before saving
2. **Error Logging**: Add comprehensive logging at each step of the save process
3. **Verification**: After saving, read back from localStorage to confirm persistence
4. **User Feedback**: Provide clear success/error messages to users

## Testing Strategy

### Unit Tests
- Test hotkey state management in SettingsDialog
- Test settings persistence in SettingsService
- Test hotkey validation and error handling

### Integration Tests
- Test complete hotkey save flow from UI to localStorage
- Test hotkey changes are immediately available in note windows
- Test error scenarios and recovery

### Manual Testing
- Verify the specific bug scenario described in the requirements
- Test various hotkey combinations and edge cases
- Test settings persistence across app restarts

## Implementation Approach

### Phase 1: Fix Core Save Issue
1. Identify and fix the root cause in SettingsDialog.tsx
2. Ensure hotkeys are properly included in the settings object
3. Add logging to track the save process

### Phase 2: Add Validation and Error Handling
1. Add validation for hotkey data structure
2. Add error handling for localStorage operations
3. Add user feedback for save operations

### Phase 3: Add Verification and Testing
1. Add verification that settings were actually saved
2. Add comprehensive logging for debugging
3. Add automated tests for the save process

## Security Considerations

- Validate hotkey input to prevent injection attacks
- Sanitize hotkey strings before saving to localStorage
- Ensure hotkey validation doesn't expose sensitive information

## Performance Considerations

- Minimize localStorage operations during hotkey editing
- Batch hotkey updates to avoid excessive re-renders
- Optimize hotkey validation to avoid UI lag

## Backward Compatibility

- Ensure existing hotkey settings continue to work
- Handle migration of any changed hotkey data structures
- Maintain compatibility with existing localStorage format