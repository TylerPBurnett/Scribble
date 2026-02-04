import React, { useEffect, useState } from 'react';
import { AppSettings, getSettings } from '../shared/services/settingsService';
import { ThemeProvider } from '../shared/providers/ThemeProvider';
import { NoteSettingsWindow } from './components/NoteSettingsWindow';

export const NoteSettingsApp: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    // Load settings when the component mounts
    const loadSettings = async () => {
      try {
        const currentSettings = getSettings();
        setSettings(currentSettings);
        console.log('Note settings window loaded with settings:', currentSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
        // Use default settings if loading fails
        setSettings({
          saveLocation: '',
          autoSave: true,
          autoSaveInterval: 5,
          theme: 'dim',
        });
      }
    };

    loadSettings();
  }, []);

  if (!settings) {
    // Show loading state
    return (
      <div className="note-settings-window">
        <div className="note-settings-titlebar">
          <div className="note-settings-title">Loading...</div>
        </div>
        <div className="note-settings-content">
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider initialSettings={settings}>
      <NoteSettingsWindow />
    </ThemeProvider>
  );
};