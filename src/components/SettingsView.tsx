import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  RefreshCw,
  Volume2,
  Monitor,
  Layers,
  Sliders,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  GeminiModelInfo,
  JarvisSettings,
  DEFAULT_CUSTOM_INSTRUCTIONS,
} from '../types';

interface SettingsViewProps {
  settings: JarvisSettings;
  availableModels: GeminiModelInfo[];
  usingServerKey: boolean;
  isLoadingModels: boolean;
  modelError: string | null;
  conversationCount: number;
  hasCachedScreenshot: boolean;
  onUpdateSettings: (partial: Partial<JarvisSettings>) => void;
  onRefreshModels: (apiKey: string) => Promise<boolean>;
  onClearAllConversations: () => void;
  onClearCachedScreenshots: () => void;
  onResetAllSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  availableModels,
  usingServerKey,
  isLoadingModels,
  modelError,
  conversationCount,
  hasCachedScreenshot,
  onUpdateSettings,
  onRefreshModels,
  onClearAllConversations,
  onClearCachedScreenshots,
  onResetAllSettings,
}) => {
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState(settings.customInstructions);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyDraft(settings.apiKey);
    setInstructionsDraft(settings.customInstructions);
  }, [settings.apiKey, settings.customInstructions]);

  const showTempNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2200);
  };

  const handleSaveInstructions = () => {
    onUpdateSettings({ customInstructions: instructionsDraft });
    showTempNotice('Custom JARVIS instructions saved, Sir.');
  };

  const handleResetInstructions = () => {
    setInstructionsDraft(DEFAULT_CUSTOM_INSTRUCTIONS);
    onUpdateSettings({ customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS });
    showTempNotice('Reset to default Hinglish Smali persona.');
  };

  const handleClearInstructions = () => {
    setInstructionsDraft('');
  };

  const handleValidateKey = async () => {
    onUpdateSettings({ apiKey: apiKeyDraft });
    const ok = await onRefreshModels(apiKeyDraft);
    if (ok) {
      showTempNotice('API credentials validated and live models refreshed.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3.5 py-3 space-y-4">
      {savedNotice && (
        <div className="rounded-xl bg-[#260A11] border border-[#EF4444] px-3.5 py-2.5 text-xs text-white flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#EF4444] shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* 1. Custom JARVIS System Instructions Editor */}
      <section className="rounded-xl bg-[#130609] border border-[#DC2626]/30 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-[#EF4444]" />
            <span>Custom JARVIS System Instructions</span>
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSaveInstructions}
              className="flex items-center gap-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              <Save className="h-3 w-3" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleResetInstructions}
              className="rounded-lg bg-[#240910] hover:bg-[#330D17] border border-[#DC2626]/30 px-2 py-1 text-[11px] text-[#F9E8EC]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleClearInstructions}
              className="rounded-lg bg-[#240910] hover:bg-[#330D17] border border-[#DC2626]/30 px-2 py-1 text-[11px] text-[#FCA5A5]"
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          aria-label="Custom JARVIS system instructions"
          rows={4}
          value={instructionsDraft}
          onChange={(e) => setInstructionsDraft(e.target.value)}
          placeholder="Enter custom persona and Smali explanation rules..."
          className="w-full rounded-xl bg-[#080204] border border-[#DC2626]/35 p-3 text-xs text-white leading-relaxed focus:border-[#EF4444] focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label
              htmlFor="pref-lang-select"
              className="block text-[11px] text-[#C89DA6] mb-1"
            >
              Preferred Language
            </label>
            <select
              id="pref-lang-select"
              value={settings.preferredLanguage}
              onChange={(e) =>
                onUpdateSettings({
                  preferredLanguage: e.target.value as JarvisSettings['preferredLanguage'],
                })
              }
              className="w-full rounded-lg bg-[#080204] border border-[#DC2626]/35 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="Hinglish">Easy Hinglish (Default)</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="resp-depth-select"
              className="block text-[11px] text-[#C89DA6] mb-1"
            >
              Explanation Depth
            </label>
            <select
              id="resp-depth-select"
              value={settings.responseDepth}
              onChange={(e) =>
                onUpdateSettings({
                  responseDepth: e.target.value as JarvisSettings['responseDepth'],
                })
              }
              className="w-full rounded-lg bg-[#080204] border border-[#DC2626]/35 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="concise">Concise Summary</option>
              <option value="balanced">Balanced Step-by-Step</option>
              <option value="deep">Deep Opcode & Register Trace</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Gemini API Credentials & Dynamic Model Selection */}
      <section className="rounded-xl bg-[#130609] border border-[#DC2626]/30 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
            <KeyRound className="h-4 w-4 text-[#EF4444]" />
            <span>Gemini API & Dynamic Model Discovery</span>
          </h3>
          <button
            type="button"
            onClick={handleValidateKey}
            disabled={isLoadingModels}
            className="flex items-center gap-1 rounded-lg bg-[#220910] hover:bg-[#320D18] border border-[#DC2626]/40 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
            <span>Validate & Refresh Models</span>
          </button>
        </div>

        <div>
          <label htmlFor="settings-api-key" className="block text-[11px] text-[#C89DA6] mb-1">
            Gemini API Key {usingServerKey ? '(Environment Key Connected)' : ''}
          </label>
          <div className="relative">
            <input
              id="settings-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              placeholder={
                usingServerKey ? 'Using server environment key...' : 'Enter Gemini API key...'
              }
              className="w-full rounded-lg bg-[#080204] border border-[#DC2626]/35 px-3 py-2 pr-9 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C89DA6] hover:text-white"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {modelError && <p className="mt-1 text-[11px] text-[#FCA5A5]">{modelError}</p>}
        </div>

        <div>
          <label htmlFor="settings-model-select" className="block text-[11px] text-[#C89DA6] mb-1">
            Active Gemini Model ({availableModels.length} discovered)
          </label>
          <select
            id="settings-model-select"
            value={settings.selectedModel}
            onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
            className="w-full rounded-lg bg-[#080204] border border-[#DC2626]/35 px-2.5 py-2 font-mono text-xs text-white"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — {m.supportsVision ? 'Multimodal Vision' : 'Text'}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 3. Voice, Screen Awareness & Floating Assistant Toggles */}
      <section className="rounded-xl bg-[#130609] border border-[#DC2626]/30 p-3.5 space-y-3 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
          <Volume2 className="h-4 w-4 text-[#EF4444]" />
          <span>Voice, Screen Awareness & Floating Assistant</span>
        </h3>

        <div className="flex items-center justify-between py-1.5 border-b border-[#DC2626]/15">
          <div>
            <p className="font-semibold text-white">Automatic Spoken Responses (TTS)</p>
            <p className="text-[11px] text-[#C89DA6]">
              Speaks concise Hinglish summaries aloud while keeping full Smali code on screen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ speechEnabled: !settings.speechEnabled })}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              settings.speechEnabled
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#220910] text-[#C89DA6] border border-[#DC2626]/30'
            }`}
          >
            {settings.speechEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-[#DC2626]/15">
          <div>
            <label htmlFor="voice-locale-select" className="font-semibold text-white block">
              Voice Recognition & Speech Locale
            </label>
            <p className="text-[11px] text-[#C89DA6]">
              Supports English (India), Hindi, and US English recognition.
            </p>
          </div>
          <select
            id="voice-locale-select"
            value={settings.voiceLanguage}
            onChange={(e) =>
              onUpdateSettings({
                voiceLanguage: e.target.value as JarvisSettings['voiceLanguage'],
              })
            }
            className="rounded-lg bg-[#080204] border border-[#DC2626]/35 px-2.5 py-1.5 text-xs text-white"
          >
            <option value="en-IN">en-IN (Hinglish / India)</option>
            <option value="hi-IN">hi-IN (Hindi)</option>
            <option value="en-US">en-US (English)</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-[#DC2626]/15">
          <div>
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>User-Controlled Screen Awareness</span>
            </p>
            <p className="text-[11px] text-[#C89DA6]">
              Requires explicit user authorization before capturing or uploading any screen image.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ screenAwarenessEnabled: !settings.screenAwarenessEnabled })
            }
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              settings.screenAwarenessEnabled
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#220910] text-[#C89DA6] border border-[#DC2626]/30'
            }`}
          >
            {settings.screenAwarenessEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <div>
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>Movable Floating JARVIS Assistant Bubble</span>
            </p>
            <p className="text-[11px] text-[#C89DA6]">
              Quick overlay panel for Ask JARVIS, Analyze Screen, and Voice Input.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ floatingAssistantEnabled: !settings.floatingAssistantEnabled })
            }
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              settings.floatingAssistantEnabled
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#220910] text-[#C89DA6] border border-[#DC2626]/30'
            }`}
          >
            {settings.floatingAssistantEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </section>

      {/* 4. Privacy, Storage & Reset Controls */}
      <section className="rounded-xl bg-[#130609] border border-[#DC2626]/30 p-3.5 space-y-2.5 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-[#EF4444]" />
          <span>Privacy, Local Storage & Reset</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClearAllConversations();
              showTempNotice('All local conversation history cleared.');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#240910] hover:bg-[#350D17] border border-[#DC2626]/30 px-3 py-1.5 text-xs text-[#FCA5A5]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History ({conversationCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClearCachedScreenshots();
              showTempNotice('Temporary screen captures cleared.');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#240910] hover:bg-[#350D17] border border-[#DC2626]/30 px-3 py-1.5 text-xs text-[#F9E8EC]"
          >
            <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" />
            <span>Clear Cached Screenshots {hasCachedScreenshot ? '(1)' : '(0)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetAllSettings();
              showTempNotice('Application settings restored to defaults.');
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#240910] hover:bg-[#350D17] border border-[#DC2626]/30 px-3 py-1.5 text-xs text-[#C89DA6] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Settings</span>
          </button>
        </div>
      </section>
    </div>
  );
};
