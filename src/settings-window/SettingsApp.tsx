import { useState, useEffect } from 'react'
import { SettingsDialog } from './SettingsDialog'
import { initSettings, saveSettings, AppSettings } from '../shared/services/settingsService'
import { ThemeProvider } from '../shared/services/themeService'
import TitleBar from '../shared/components/TitleBar'

function SettingsApp() {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on startup
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== SettingsApp Initialization Start ===');

        // Initialize settings
        const settings = await initSettings()
        console.log('SettingsApp - Settings initialized:', settings)
        setAppSettings(settings)
      } catch (error) {
        console.error('Error during initialization:', error)
        // If initialization fails, set default settings
        setAppSettings({
          saveLocation: '',
          autoSave: true,
          autoSaveInterval: 5,
          theme: 'dim',
        })
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // Handle saving settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    console.log('SettingsApp - Saving new settings:', newSettings)
    setAppSettings(newSettings)
    saveSettings(newSettings)
    console.log('SettingsApp - Settings saved, current state:', newSettings)
  }

  // Handle window close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      window.close();
    }
  }

  // Show loading state or when settings are not yet loaded
  if (isLoading || !appSettings) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background-notes text-foreground">
      <p className="text-lg">Loading settings...</p>
    </div>
  }

  // Detect platform
  const isMac = navigator.userAgent.toLowerCase().includes('mac');

  // Render the settings window
  return (
    <ThemeProvider initialSettings={appSettings}>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Draggable title bar - theme-aware */}
        <div 
          className="h-10 flex items-center flex-shrink-0 select-none border-b bg-background-titlebar border-border"
          style={{ 
            WebkitAppRegion: 'drag',
            // Ensure the drag region is on top
            position: 'relative',
            zIndex: 100
          } as React.CSSProperties}
        >
          {/* macOS traffic light space */}
          {isMac && (
            <div className="w-20 flex-shrink-0" />
          )}
          
          {/* Title - centered */}
          <div className="flex-1 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-semibold text-muted-foreground">Settings</span>
          </div>
          
          {/* Window controls for Windows/Linux */}
          {!isMac && (
            <div 
              className="flex items-center flex-shrink-0" 
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <button
                className="flex items-center justify-center w-11 h-10 transition-colors text-muted-foreground hover:bg-muted/30"
                onClick={() => window.windowControls.minimize()}
                title="Minimize"
              >
                <svg width="10" height="1" viewBox="0 0 10 1">
                  <rect width="10" height="1" fill="currentColor" />
                </svg>
              </button>
              <button
                className="flex items-center justify-center w-11 h-10 transition-colors text-muted-foreground hover:bg-muted/30"
                onClick={() => window.windowControls.maximize()}
                title="Maximize"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect x="0" y="0" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
              </button>
              <button
                className="flex items-center justify-center w-11 h-10 transition-colors text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => window.windowControls.close()}
                title="Close"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
                  <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </div>
          )}
          
          {/* macOS right padding to balance */}
          {isMac && (
            <div className="w-20 flex-shrink-0" />
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <SettingsDialog
            onOpenChange={handleOpenChange}
            initialSettings={appSettings}
            onSave={handleSaveSettings}
          />
        </div>
      </div>
    </ThemeProvider>
  )
}

export default SettingsApp
