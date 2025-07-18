import { useState, useEffect } from 'react'
import { SettingsDialog } from './SettingsDialog'
import { initSettings, saveSettings, AppSettings } from '../shared/services/settingsService'
import { ThemeProvider } from '../shared/services/themeService'
import TitleBar from '../shared/components/TitleBar'

function SettingsApp() {
  const [appSettings, setAppSettings] = useState<AppSettings>({
    saveLocation: '',
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dim',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)

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

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      window.close();
    }
  }

  // Show loading state
  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background-notes text-foreground">
      <p className="text-lg">Loading settings...</p>
    </div>
  }

  // Render the settings dialog
  return (
    <ThemeProvider initialSettings={appSettings}>
      <div className="flex flex-col h-screen w-screen bg-background-notes">
        <TitleBar
          title=""
          onMinimize={() => window.windowControls.minimize()}
          onMaximize={() => window.windowControls.maximize()}
          onClose={() => window.windowControls.close()}
          className="bg-background-titlebar"
        />
        <div className="flex-1">
          <SettingsDialog
            open={isOpen}
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
