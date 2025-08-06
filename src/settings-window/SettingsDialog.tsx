import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Folder } from 'lucide-react';
import { AppSettings } from '../shared/services/settingsService';
import { DEFAULT_HOTKEYS, HotkeyAction } from '../shared/services/hotkeyService';
import { useTheme } from '../shared/services/themeService';
import { HotkeysSection } from './components/HotkeysSection';
import { ApplicationSettingsSection } from './components/ApplicationSettingsSection';


// import { forwardRef } from "react";
// import { cn } from "@/lib/utils";

// Custom DialogContent that removes the default border - no longer needed for window mode
// const DialogContent = forwardRef<
//   React.ElementRef<typeof BaseDialogContent>,
//   React.ComponentPropsWithoutRef<typeof BaseDialogContent>
// >(({ className, ...props }, ref) => (
//   <BaseDialogContent
//     ref={ref}
//     className={cn("!border-0", className)}
//     {...props}
//   />
// ));

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// Define the form schema with Zod
const formSchema = z.object({
  saveLocation: z.string().min(1, {
    message: 'Save location is required.',
  }),
  autoSave: z.boolean(),
  theme: z.string(), // Theme name instead of darkMode
  // System integration settings
  autoLaunch: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  globalHotkeys: z.object({
    newNote: z.string(),
    toggleApp: z.string().optional(),
    showApp: z.string().optional(),
  }).optional(),
  // Hotkeys are handled separately from the form
});

interface SettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsDialog({
  onOpenChange,
  initialSettings,
  onSave,
}: SettingsDialogProps) {
  const { theme } = useTheme();
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [activeSection, setActiveSection] = useState('file-management');
  const [hotkeys, setHotkeys] = useState<Record<HotkeyAction, string>>(() => {
    // Ensure we have a complete hotkey set by merging with defaults
    const mergedHotkeys = { ...DEFAULT_HOTKEYS, ...initialSettings.hotkeys };
    console.log('SettingsDialog - Initializing hotkeys state:', JSON.stringify(mergedHotkeys, null, 2));
    return mergedHotkeys;
  });

  // Settings sections configuration
  const settingsSections = [
    { 
      id: 'file-management', 
      label: 'File Management', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    { 
      id: 'application', 
      label: 'Application', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    { 
      id: 'keyboard-shortcuts', 
      label: 'Keyboard Shortcuts', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 5H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"></path>
          <path d="M2 12h20"></path>
          <path d="M12 12v7"></path>
        </svg>
      )
    },
  ];

  // Update hotkeys state when initialSettings changes (e.g., when dialog is reopened)
  useEffect(() => {
    const mergedHotkeys = { ...DEFAULT_HOTKEYS, ...initialSettings.hotkeys };
    console.log('SettingsDialog - Updating hotkeys state from initialSettings:', JSON.stringify(mergedHotkeys, null, 2));
    setHotkeys(mergedHotkeys);
  }, [initialSettings.hotkeys]);

  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saveLocation: initialSettings.saveLocation,
      autoSave: initialSettings.autoSave,
      theme: initialSettings.theme || 'dim',
      autoLaunch: initialSettings.autoLaunch || false,
      minimizeToTray: initialSettings.minimizeToTray || true,
      globalHotkeys: initialSettings.globalHotkeys || {
        newNote: 'CommandOrControl+Alt+N',
        toggleApp: 'CommandOrControl+Alt+S',
        showApp: 'CommandOrControl+Alt+S',  // Include both for backward compatibility
      },
    },
  });

  // Handle form submission
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('=== HOTKEY SAVE DEBUG: onSubmit started ===');
    console.log('Form values received:', JSON.stringify(values, null, 2));
    console.log('Current hotkeys state:', JSON.stringify(hotkeys, null, 2));
    console.log('Initial settings hotkeys:', JSON.stringify(initialSettings.hotkeys, null, 2));

    // Validate hotkeys state before proceeding
    if (!hotkeys || typeof hotkeys !== 'object') {
      console.error('HOTKEY SAVE ERROR: Invalid hotkeys state:', hotkeys);
      // Fallback to default hotkeys if state is corrupted
      setHotkeys({ ...DEFAULT_HOTKEYS, ...initialSettings.hotkeys });
      return;
    }

    // Ensure all required hotkey actions are present
    const requiredActions = Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[];
    const missingActions = requiredActions.filter(action => !hotkeys[action]);
    if (missingActions.length > 0) {
      console.warn('HOTKEY SAVE WARNING: Missing hotkey actions:', missingActions);
      // Fill in missing actions with defaults
      const completeHotkeys = { ...DEFAULT_HOTKEYS, ...hotkeys };
      setHotkeys(completeHotkeys);
      // Use the complete hotkeys for saving
      var hotkeysTosave = completeHotkeys;
    } else {
      var hotkeysTosave = hotkeys;
    }

    // Combine form values with hotkeys and preserve autoSaveInterval
    const combinedSettings: AppSettings = {
      ...values,
      autoSaveInterval: initialSettings.autoSaveInterval, // Keep the original interval
      hotkeys: hotkeysTosave,
    } as AppSettings;

    console.log('Combined settings after merging hotkeys:', JSON.stringify(combinedSettings, null, 2));
    console.log('Hotkeys property in combined settings:', JSON.stringify(combinedSettings.hotkeys, null, 2));
    console.log('Type of hotkeys property:', typeof combinedSettings.hotkeys);
    console.log('Is hotkeys property defined?', combinedSettings.hotkeys !== undefined);
    console.log('Is hotkeys property null?', combinedSettings.hotkeys === null);
    console.log('Number of hotkey entries:', combinedSettings.hotkeys ? Object.keys(combinedSettings.hotkeys).length : 0);

    // Ensure both toggleApp and showApp properties are set for backward compatibility
    if (combinedSettings.globalHotkeys) {
      console.log('Processing globalHotkeys for backward compatibility');
      if (combinedSettings.globalHotkeys.toggleApp && !combinedSettings.globalHotkeys.showApp) {
        combinedSettings.globalHotkeys.showApp = combinedSettings.globalHotkeys.toggleApp;
        console.log('Set showApp from toggleApp:', combinedSettings.globalHotkeys.showApp);
      } else if (combinedSettings.globalHotkeys.showApp && !combinedSettings.globalHotkeys.toggleApp) {
        combinedSettings.globalHotkeys.toggleApp = combinedSettings.globalHotkeys.showApp;
        console.log('Set toggleApp from showApp:', combinedSettings.globalHotkeys.toggleApp);
      }
    }

    console.log('Final combined settings before save:', JSON.stringify(combinedSettings, null, 2));
    console.log('Saving settings with global hotkeys:', JSON.stringify(combinedSettings.globalHotkeys, null, 2));

    // Force immediate update of global hotkeys
    console.log('Syncing settings with main process...');
    window.settings.syncSettings(combinedSettings as unknown as Record<string, unknown>)
      .then(success => {
        console.log('Settings synced directly from SettingsDialog:', success);
        window.settings.settingsUpdated();
        console.log('Notified main process to update hotkeys');
      })
      .catch(error => {
        console.error('Error syncing settings from SettingsDialog:', error);
      });

    console.log('Calling onSave callback with combined settings...');
    onSave(combinedSettings);
    console.log('=== HOTKEY SAVE DEBUG: onSubmit completed ===');
    onOpenChange(false);
  }

  // Handle hotkey changes
  const handleHotkeyChange = (updatedHotkeys: Record<HotkeyAction, string>) => {
    setHotkeys(updatedHotkeys);
  };

  // Handle save location selection
  const handleSaveLocationSelect = async () => {
    setIsSelectingLocation(true);
    try {
      const result = await window.settings.selectDirectory();
      if (!result.canceled && result.filePaths.length > 0) {
        form.setValue('saveLocation', result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    } finally {
      setIsSelectingLocation(false);
    }
  };

  return (
    <div className={`h-full w-full flex flex-col font-twitter ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-background text-foreground'}`}>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Main content with sidebar */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <div className={`w-48 flex-shrink-0 border-r ${theme === 'light' ? 'border-gray-200/60 bg-gray-50/50' : 'border-border/30 bg-background/20'}`}>
              <div className="p-3">
                <h2 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Settings</h2>
                <nav className="space-y-1">
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${activeSection === section.id
                        ? (theme === 'light'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-primary/20 text-primary border border-primary/30')
                        : (theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground')
                        }`}
                    >
                      <span className="flex-shrink-0">{section.icon}</span>
                      <span>{section.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3">
              {/* File Management Section */}
              {activeSection === 'file-management' && (
                <div className={`rounded-lg border ${theme === 'light' ? 'bg-gray-200/90 border-gray-300/70' : 'bg-background/30 border-border/30'}`}>
                  <div className={`px-3 py-2 border-b ${theme === 'light' ? 'border-gray-200/60' : 'border-border/30'}`}>
                    <h3 className={`text-base font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>File Management</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    {/* Save Location */}
                    <FormField
                      control={form.control}
                      name="saveLocation"
                      render={({ field }) => (
                        <FormItem className={`flex flex-col space-y-2 rounded-lg border p-5 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
                          <FormLabel className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Save Location</FormLabel>
                          <FormDescription className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
                            Choose where to save your notes
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                readOnly
                                placeholder="Select folder location..."
                                className={`pr-12 h-9 text-sm cursor-pointer ${theme === 'light' ? 'bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100' : 'bg-secondary border-border/50 text-secondary-foreground hover:bg-secondary/80'} transition-colors`}
                                onClick={handleSaveLocationSelect}
                              />
                              <button
                                type="button"
                                onClick={handleSaveLocationSelect}
                                disabled={isSelectingLocation}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${theme === 'light' ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-200' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'} ${isSelectingLocation ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {isSelectingLocation ? (
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <Folder size={16} />
                                )}
                              </button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Auto Save */}
                    <FormField
                      control={form.control}
                      name="autoSave"
                      render={({ field }) => (
                        <FormItem className={`flex flex-row items-start justify-between rounded-lg border p-5 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <FormLabel className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Auto Save</FormLabel>
                            <FormDescription className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
                              Automatically save notes while typing
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex items-center shrink-0">
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className=""
                              />
                              <span className={`ml-2 text-sm font-medium ${field.value ? (theme === 'light' ? 'text-blue-600' : 'text-primary') : (theme === 'light' ? 'text-gray-500' : 'text-muted-foreground')}`}>
                                {field.value ? 'On' : 'Off'}
                              </span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Application Settings Section */}
              {activeSection === 'application' && (
                <ApplicationSettingsSection form={form} theme={theme} />
              )}

              {/* Keyboard Shortcuts Section */}
              {activeSection === 'keyboard-shortcuts' && (
                <div className={`rounded-lg border ${theme === 'light' ? 'bg-gray-200/90 border-gray-300/70' : 'bg-background/30 border-border/30'}`}>
                  <div className={`px-3 py-2 border-b ${theme === 'light' ? 'border-gray-200/60' : 'border-border/30'} flex items-center justify-between`}>
                    <h3 className={`text-base font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Keyboard Shortcuts</h3>
                    <button
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleHotkeyChange(DEFAULT_HOTKEYS);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                      <span>Reset</span>
                    </button>
                  </div>
                  <div className="p-3">
                    <HotkeysSection
                      hotkeys={hotkeys}
                      onChange={handleHotkeyChange}
                      theme={theme}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex-shrink-0 flex items-center justify-end gap-2 py-3 px-6 border-t ${theme === 'light' ? 'border-gray-200/80 bg-gray-50/80' : 'border-border/40 bg-background/60'}`}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className={`transition-all duration-200 hover:scale-105 ${theme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className={`transition-all duration-200 hover:scale-105 ${theme === 'light' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md'}`}>
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
