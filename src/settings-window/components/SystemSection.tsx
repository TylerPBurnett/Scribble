import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { UseFormReturn } from 'react-hook-form';
import { ThemeName } from '../../shared/services/themeService';
import { GlobalHotkeyEditor } from './GlobalHotkeyEditor';

type SystemSectionProps = {
  form: UseFormReturn<any>;
  theme?: ThemeName;
};

export function SystemSection({ form, theme = 'dim' }: SystemSectionProps) {
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
          console.log('Settings synced from SystemSection:', success);
          window.settings.settingsUpdated();
          console.log('Notified main process to update hotkeys');
        })
        .catch(error => {
          console.error('Error syncing settings from SystemSection:', error);
        });
    }
  };
  return (
    <div className="space-y-6 backdrop-blur-sm p-6">
      <h3 className={`text-2xl font-semibold border-b border-border/50 pb-4 ${theme === 'light' ? 'text-black' : 'text-foreground'}`}>System Integration</h3>

      {/* Auto Launch */}
      <FormField
        control={form.control}
        name="autoLaunch"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/30 p-5 backdrop-blur-sm bg-black/20">
            <div className="space-y-2">
              <FormLabel className={`text-base font-medium ${theme === 'light' ? 'text-black' : 'text-foreground'}`}>Start with Windows</FormLabel>
              <FormDescription className={`text-sm ${theme === 'light' ? 'text-black/70' : 'text-muted-foreground'}`}>
                Launch Scribble automatically when you log in
              </FormDescription>
            </div>
            <FormControl>
              <div className="flex items-center">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className=""
                />
                <span className={`ml-2 text-sm font-medium ${field.value ? 'text-primary' : 'text-muted-foreground'}`}>
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
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/30 p-5 backdrop-blur-sm bg-black/20 mt-4">
            <div className="space-y-2">
              <FormLabel className={`text-base font-medium ${theme === 'light' ? 'text-black' : 'text-foreground'}`}>Minimize to System Tray</FormLabel>
              <FormDescription className={`text-sm ${theme === 'light' ? 'text-black/70' : 'text-muted-foreground'}`}>
                Keep Scribble running in the system tray when closed
              </FormDescription>
            </div>
            <FormControl>
              <div className="flex items-center">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className=""
                />
                <span className={`ml-2 text-sm font-medium ${field.value ? 'text-primary' : 'text-muted-foreground'}`}>
                  {field.value ? 'On' : 'Off'}
                </span>
              </div>
            </FormControl>
          </FormItem>
        )}
      />

      <div className="space-y-5 mt-8 pt-6 border-t border-border/50">
        <div>
          <h4 className={`text-xl font-semibold ${theme === 'light' ? 'text-black' : 'text-foreground'}`}>Global Hotkeys</h4>
          <FormDescription className={`text-sm mt-1 ${theme === 'light' ? 'text-black/70' : 'text-muted-foreground'}`}>
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
                  description="Global hotkey to create a new note"
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
                  description="Global hotkey to show or hide the main window"
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
