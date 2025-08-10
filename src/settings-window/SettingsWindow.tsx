import { useState, useEffect } from 'react';
import { AppSettings } from '../shared/services/settingsService';
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

interface SettingsWindowProps {
  onClose: () => void;
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsWindow = ({ onClose, initialSettings, onSave }: SettingsWindowProps) => {
  const [settings, setSettings] = useState(initialSettings);
  const [activeSection, setActiveSection] = useState('storage');

  const sections = [
    { id: 'storage', label: 'Storage', icon: FolderOpen, color: 'text-note-sky' },
    { id: 'editor', label: 'Editor', icon: Edit3, color: 'text-note-emerald' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-note-violet' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, color: 'text-note-amber' },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon, color: 'text-note-rose' }
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

  const handleSaveLocationSelect = async () => {
    try {
      console.log('Selecting directory...');
      const result = await window.settings.selectDirectory();
      console.log('Directory selection result:', result);
      if (result.canceled) return;

      const newSettings = {
        ...settings,
        saveLocation: result.filePaths[0]
      };
      console.log('Updating settings with new save location:', newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/20 backdrop-blur-sm">
      <div className="flex w-full h-full bg-gradient-to-br from-white via-gray-50/50 to-primary-10/5 relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-gray-100 transition-colors duration-200"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* TOC Sidebar */}
        <nav className="w-72 sticky top-0 h-screen bg-white/80 backdrop-blur-sm border-r border-gray-100/60">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
            
            <div className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
                    transition-all duration-300 group relative overflow-hidden
                    ${activeSection === section.id 
                      ? 'bg-gradient-to-r from-primary-10 to-transparent text-primary-dark shadow-sm' 
                      : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {/* Active indicator */}
                  {activeSection === section.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-dark rounded-r-full" />
                  )}
                  
                  <section.icon className={`
                    w-5 h-5 transition-all duration-300
                    ${activeSection === section.id ? section.color : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  <span className="font-medium text-sm">{section.label}</span>
                  
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save/Cancel buttons at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent">
            <button 
              onClick={handleSave}
              className="w-full bg-primary-dark hover:bg-primary-dark/90 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 mb-3"
            >
              Save Changes
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 lg:p-12 space-y-16">
            
            {/* Storage Section */}
            <section id="storage" className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-note-sky/10 rounded-xl">
                    <FolderOpen className="w-6 h-6 text-note-sky" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Storage</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Save Location
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={settings.saveLocation}
                        readOnly
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-10"
                      />
                      <button 
                        onClick={handleSaveLocationSelect}
                        className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors duration-200"
                      >
                        Browse
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Choose where your notes are saved</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Automatic Backups</h3>
                        <p className="text-sm text-gray-500 mt-1">Keep your notes safe with regular backups</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-note-emerald"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Editor Section */}
            <section id="editor" className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-note-emerald/10 rounded-xl">
                    <Edit3 className="w-6 h-6 text-note-emerald" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Editor</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Auto-save</h3>
                      <p className="text-sm text-gray-500 mt-1">Automatically save your work</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.autoSave}
                        onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-note-emerald"></div>
                    </label>
                  </div>

                  {settings.autoSave && (
                    <div className="pl-4 border-l-2 border-primary-10 animate-in slide-in-from-left duration-300">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Auto-save interval
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="60"
                          value={settings.autoSaveInterval}
                          onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value)})}
                          className="flex-1 accent-primary-dark"
                        />
                        <div className="min-w-[80px] text-center px-3 py-2 bg-gray-50 rounded-lg font-medium text-gray-700">
                          {settings.autoSaveInterval}s
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Appearance Section */}
            <section id="appearance" className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-note-violet/10 rounded-xl">
                    <Palette className="w-6 h-6 text-note-violet" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['light', 'dim', 'dark'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSettings({...settings, darkMode: theme === 'dark'})}
                          className={`
                            relative p-4 rounded-xl border-2 transition-all duration-200
                            ${(theme === 'dark' && settings.darkMode) || (theme === 'light' && !settings.darkMode)
                              ? 'border-primary-dark bg-primary-10' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                        >
                          <div className="flex items-center justify-center mb-2">
                            <div className={`w-12 h-12 rounded-lg ${
                              theme === 'light' ? 'bg-gray-100' :
                              theme === 'dim' ? 'bg-gray-600' : 'bg-gray-900'
                            }`} />
                          </div>
                          <span className="text-sm font-medium capitalize">{theme}</span>
                          {((theme === 'dark' && settings.darkMode) || (theme === 'light' && !settings.darkMode)) && (
                            <Check className="absolute top-2 right-2 w-4 h-4 text-primary-dark" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Shortcuts Section (Placeholder) */}
            <section id="shortcuts" className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-note-amber/10 rounded-xl">
                    <Keyboard className="w-6 h-6 text-note-amber" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
                </div>
                <p className="text-gray-500">Customize your keyboard shortcuts (coming soon)</p>
              </div>
            </section>

            {/* Advanced Section (Placeholder) */}
            <section id="advanced" className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-note-rose/10 rounded-xl">
                    <SettingsIcon className="w-6 h-6 text-note-rose" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Advanced</h2>
                </div>
                <p className="text-gray-500">Advanced settings and configurations (coming soon)</p>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsWindow;
