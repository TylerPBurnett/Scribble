import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { UseFormReturn } from 'react-hook-form';
import { ThemeName } from '../../shared/services/themeService';
import { GlobalHotkeyEditor } from './GlobalHotkeyEditor';
import { ThemesSection } from './ThemesSection';

type ApplicationSettingsSectionProps = {
  form: UseFormReturn<any>;
  theme?: ThemeName;
};

export function ApplicationSettingsSection({ form, theme = 'dim' }: ApplicationSettingsSectionProps) {
  // Handle global hotkey changes
  const handleGlobalHotkeyChange = (field: any, value: string) => {
    // Update the form field
    field.onChange(value);

    // Get the current form values
    const formValues = form.getValues();

    // Force immediate update of global hotkeys in main process
    console.log('Global hotkey changed, updating main process immediately');
    console.log('Current form values:', formValues);

    // Only update if we have the necessary hotkeys
    // Make sure we have at least the newNote hotkey
    if (formValues.globalHotkeys?.newNote) {
      // Ensure we have both toggleApp and showApp properties for backward compatibility
      if (formValues.globalHotkeys.toggleApp && !formValues.globalHotkeys.showApp) {
        formValues.globalHotkeys.showApp = formValues.globalHotkeys.toggleApp;
      } else if (formValues.globalHotkeys.showApp && !formValues.globalHotkeys.toggleApp) {
        formValues.globalHotkeys.toggleApp = formValues.globalHotkeys.showApp;
      }

      window.settings.syncSettings(formValues as Record<string, unknown>)
        .then(success => {
          console.log('Settings synced from ApplicationSettingsSection:', success);
          window.settings.settingsUpdated();
          console.log('Notified main process to update hotkeys');
        })
        .catch(error => {
          console.error('Error syncing settings from ApplicationSettingsSection:', error);
        });
    }
  };

  return (
    <div className={`space-y-6 p-6 rounded-lg ${theme === 'light' ? 'bg-gray-200/90 border border-gray-300/70' : 'backdrop-blur-sm'}`}>
      <h3 className={`text-base font-medium border-b pb-4 ${theme === 'light' ? 'text-gray-900 border-gray-200' : 'text-foreground border-border/50'}`}>Application Settings</h3>

      {/* Theme Selection */}
      <div className={`p-5 rounded-lg border ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
        <ThemesSection
          currentTheme={form.watch('theme') as ThemeName}
          onChange={(theme) => form.setValue('theme', theme)}
        />
      </div>

      {/* Auto Launch */}
      <FormField
        control={form.control}
        name="autoLaunch"
        render={({ field }) => (
          <FormItem className={`flex flex-row items-start justify-between rounded-lg border p-5 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
            <div className="flex-1 min-w-0 pr-4">
              <FormLabel className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Start with System</FormLabel>
              <FormDescription className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
                Launch Scribble automatically when you log in
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

      {/* Minimize to Tray */}
      <FormField
        control={form.control}
        name="minimizeToTray"
        render={({ field }) => (
          <FormItem className={`flex flex-row items-start justify-between rounded-lg border p-5 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
            <div className="flex-1 min-w-0 pr-4">
              <FormLabel className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Minimize to System Tray</FormLabel>
              <FormDescription className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
                Keep Scribble running in the system tray when closed
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

      {/* Global Hotkeys Subsection */}
      <div className={`space-y-6 mt-6 pt-6 border-t ${theme === 'light' ? 'border-gray-200' : 'border-border/50'}`}>
        <div>
          <h4 className={`text-base font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>Global Hotkeys</h4>
          <FormDescription className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
            These hotkeys work even when Scribble is minimized to the system tray
          </FormDescription>
        </div>

        {/* New Note Global Hotkey */}
        <FormField
          control={form.control}
          name="globalHotkeys.newNote"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <GlobalHotkeyEditor
                  label="New Note"
                  description=""
                  currentValue={field.value}
                  onChange={(value) => handleGlobalHotkeyChange(field, value)}
                  theme={theme}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Toggle App Global Hotkey */}
        <FormField
          control={form.control}
          name="globalHotkeys.toggleApp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <GlobalHotkeyEditor
                  label="Toggle App"
                  description=""
                  currentValue={field.value}
                  onChange={(value) => handleGlobalHotkeyChange(field, value)}
                  theme={theme}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}