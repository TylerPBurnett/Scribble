import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  FolderOpen, 
  Edit3, 
  Palette, 
  Keyboard, 
  Settings as SettingsIcon,
  Check,
  ChevronRight,
  X
} from 'lucide-react';
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

  // Settings sections configuration - using Lucide icons
  const settingsSections = [
    { 
      id: 'file-management', 
      label: 'File Management', 
      icon: FolderOpen,
      color: 'text-note-sky'
    },
    { 
      id: 'application', 
      label: 'Application', 
      icon: SettingsIcon,
      color: 'text-note-violet'
    },
    { 
      id: 'keyboard-shortcuts', 
      label: 'Keyboard Shortcuts', 
      icon: Keyboard,
      color: 'text-note-amber'
    },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

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
    <div className={`h-full w-full flex ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-white via-gray-50/50 to-primary-10/5'
        : theme === 'dim'
        ? 'bg-gradient-to-br from-background via-background-sidebar to-background-notes'
        : 'bg-gradient-to-br from-background via-background/95 to-background-notes'
    }`}>
      
      {/* TOC Sidebar */}
      <nav className={`w-72 sticky top-0 h-full backdrop-blur-sm border-r ${
        theme === 'light'
          ? 'bg-white/80 border-gray-100/60'
          : theme === 'dim'
          ? 'bg-background-sidebar/90 border-border/30'
          : 'bg-background/80 border-border/20'
      }`}>
        <div className="p-8">
          <h1 className={`text-2xl font-bold mb-8 ${
            theme === 'light' ? 'text-gray-900' : 'text-foreground'
          }`}>Settings</h1>
          
          <div className="space-y-2">
            {settingsSections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
                    transition-all duration-300 group relative overflow-hidden
                    ${activeSection === section.id 
                      ? theme === 'light'
                        ? 'bg-gradient-to-r from-primary-10 to-transparent text-primary-dark shadow-sm'
                        : 'bg-gradient-to-r from-primary/20 to-transparent text-primary shadow-sm' 
                      : theme === 'light'
                        ? 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                        : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {/* Active indicator */}
                  {activeSection === section.id && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${
                      theme === 'light' ? 'bg-primary-dark' : 'bg-primary'
                    }`} />
                  )}
                  
                  <Icon className={`
                    w-5 h-5 transition-all duration-300
                    ${activeSection === section.id 
                      ? section.color 
                      : theme === 'light'
                        ? 'text-gray-400 group-hover:text-gray-600'
                        : 'text-muted-foreground/70 group-hover:text-muted-foreground'
                    }
                  `} />
                  <span className="font-medium text-sm">{section.label}</span>
                  
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Main content with sidebar */}
          <div className="flex flex-1 min-h-0">

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-8 lg:p-12 space-y-16">
                
                {/* File Management Section */}
                {activeSection === 'file-management' && (
                  <section id="file-management" className="scroll-mt-8">
                    <div className={`rounded-2xl shadow-sm border p-8 hover:shadow-md transition-shadow duration-300 ${
                      theme === 'light'
                        ? 'bg-white border-gray-100/50'
                        : theme === 'dim'
                        ? 'bg-card border-border/30'
                        : 'bg-card/90 border-border/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-note-sky/10 rounded-xl">
                          <FolderOpen className="w-6 h-6 text-note-sky" />
                        </div>
                        <h2 className={`text-xl font-semibold ${
                          theme === 'light' ? 'text-gray-900' : 'text-foreground'
                        }`}>File Management</h2>
                      </div>

                      <div className="space-y-6">
                        {/* Save Location */}
                        <FormField
                          control={form.control}
                          name="saveLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={`block text-sm font-medium mb-2 ${
                                theme === 'light' ? 'text-gray-700' : 'text-foreground'
                              }`}>
                                Save Location
                              </FormLabel>
                              <FormControl>
                                <div className="flex gap-3">
                                  <Input
                                    {...field}
                                    readOnly
                                    placeholder="Choose where your notes are saved..."
                                    className={`flex-1 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors ${
                                      theme === 'light'
                                        ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        : theme === 'dim'
                                        ? 'bg-secondary border-border text-secondary-foreground hover:bg-secondary/80'
                                        : 'bg-secondary/70 border-border/50 text-secondary-foreground hover:bg-secondary/90'
                                    }`}
                                    onClick={handleSaveLocationSelect}
                                  />
                                  <Button
                                    type="button"
                                    onClick={handleSaveLocationSelect}
                                    disabled={isSelectingLocation}
                                    className={`px-5 py-3 rounded-xl font-medium transition-colors duration-200 ${
                                      theme === 'light'
                                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                    }`}
                                  >
                                    {isSelectingLocation ? (
                                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      'Browse'
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription className={`mt-2 text-sm ${
                                theme === 'light' ? 'text-gray-500' : 'text-muted-foreground'
                              }`}>
                                Choose where your notes are saved
                              </FormDescription>
                            </FormItem>
                          )}
                        />

                        <div className={`pt-4 border-t ${
                          theme === 'light' ? 'border-gray-100' : 'border-border/30'
                        }`}>
                          {/* Auto Save */}
                          <FormField
                            control={form.control}
                            name="autoSave"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div>
                                  <FormLabel className={`font-medium ${
                                    theme === 'light' ? 'text-gray-900' : 'text-foreground'
                                  }`}>Auto-save</FormLabel>
                                  <FormDescription className={`text-sm mt-1 ${
                                    theme === 'light' ? 'text-gray-500' : 'text-muted-foreground'
                                  }`}>
                                    Automatically save your work
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      checked={field.value}
                                      onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                    <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-note-emerald ${
                                      theme === 'light' 
                                        ? 'bg-gray-200'
                                        : 'bg-muted'
                                    }`}></div>
                                  </label>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Application Settings Section */}
                {activeSection === 'application' && (
                  <section id="application" className="scroll-mt-8">
                    <div className={`rounded-2xl shadow-sm border p-8 hover:shadow-md transition-shadow duration-300 ${
                      theme === 'light'
                        ? 'bg-white border-gray-100/50'
                        : theme === 'dim'
                        ? 'bg-card border-border/30'
                        : 'bg-card/90 border-border/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-note-violet/10 rounded-xl">
                          <SettingsIcon className="w-6 h-6 text-note-violet" />
                        </div>
                        <h2 className={`text-xl font-semibold ${
                          theme === 'light' ? 'text-gray-900' : 'text-foreground'
                        }`}>Application</h2>
                      </div>
                      <ApplicationSettingsSection form={form} theme={theme} />
                    </div>
                  </section>
                )}

                {/* Keyboard Shortcuts Section */}
                {activeSection === 'keyboard-shortcuts' && (
                  <section id="keyboard-shortcuts" className="scroll-mt-8">
                    <div className={`rounded-2xl shadow-sm border p-8 hover:shadow-md transition-shadow duration-300 ${
                      theme === 'light'
                        ? 'bg-white border-gray-100/50'
                        : theme === 'dim'
                        ? 'bg-card border-border/30'
                        : 'bg-card/90 border-border/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-note-amber/10 rounded-xl">
                          <Keyboard className="w-6 h-6 text-note-amber" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <h2 className={`text-xl font-semibold ${
                            theme === 'light' ? 'text-gray-900' : 'text-foreground'
                          }`}>Keyboard Shortcuts</h2>
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors duration-200 ${
                              theme === 'light'
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleHotkeyChange(DEFAULT_HOTKEYS);
                            }}
                          >
                            Reset to Defaults
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <HotkeysSection
                          hotkeys={hotkeys}
                          onChange={handleHotkeyChange}
                          theme={theme}
                        />
                      </div>
                    </div>
                  </section>
                )}

              </div>
            </main>
          </div>

          {/* Footer with Save/Cancel buttons */}
          <div className={`absolute bottom-0 left-0 w-72 p-8 bg-gradient-to-t ${
            theme === 'light'
              ? 'from-white via-white to-transparent'
              : theme === 'dim'
              ? 'from-background-sidebar via-background-sidebar to-transparent'
              : 'from-background via-background to-transparent'
          }`}>
            <Button 
              type="submit"
              className={`w-full py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 mb-3 ${
                theme === 'light'
                  ? 'bg-primary-dark hover:bg-primary-dark/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              Save Changes
            </Button>
            <Button 
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              }`}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
