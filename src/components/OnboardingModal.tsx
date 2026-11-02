import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Cpu,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { GeminiModelInfo, JarvisSettings } from '../types';

interface OnboardingModalProps {
  settings: JarvisSettings;
  availableModels: GeminiModelInfo[];
  usingServerKey: boolean;
  isLoadingModels: boolean;
  modelError: string | null;
  onValidateAndFetchModels: (apiKey: string) => Promise<boolean>;
  onCompleteSetup: (apiKey: string, selectedModel: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  settings,
  availableModels,
  usingServerKey,
  isLoadingModels,
  modelError,
  onValidateAndFetchModels,
  onCompleteSetup,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visionFilterOnly, setVisionFilterOnly] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    settings.selectedModel || 'gemini-3.8-flash'
  );
  const [validationStatus, setValidationStatus] = useState<string | null>(null);

  const filteredModels = availableModels.filter((m) => {
    const matchesSearch =
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCapability = visionFilterOnly ? m.supportsVision : true;
    return matchesSearch && matchesCapability;
  });

  const handleValidateStep = async () => {
    setValidationStatus('Validating Gemini API connection & fetching live models...');
    const ok = await onValidateAndFetchModels(apiKeyInput);
    if (ok) {
      setValidationStatus('Credentials verified! Live Gemini models loaded.');
      setStep(2);
    } else {
      setValidationStatus(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jarvis-setup-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#110609] border border-[#DC2626]/40 shadow-[0_0_40px_rgba(220,38,38,0.2)] p-5 text-[#F9E8EC]">
        {/* Animated Red Core Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#DC2626]/20">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/50">
            <Cpu className="h-6 w-6 text-[#EF4444] animate-pulse" />
          </div>
          <div>
            <h2
              id="jarvis-setup-title"
              className="font-display text-xl font-bold tracking-wider text-white uppercase"
            >
              JARVIS AI · SYSTEM INIT
            </h2>
            <p className="text-xs text-[#C89DA6]">
              Step {step} of 2 · {step === 1 ? 'Gemini API Authentication' : 'Select Active Model'}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <p className="text-xs leading-relaxed text-[#C89DA6]">
              Welcome, Sir. JARVIS connects directly to the official Google Gemini Models API for
              Smali reverse engineering, false-condition analysis, and screen debugging.
            </p>

            {usingServerKey && (
              <div className="rounded-xl bg-[#1B090E] border border-[#DC2626]/30 p-3 text-xs text-[#F9E8EC]">
                <div className="flex items-center gap-2 font-semibold text-[#F87171]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Environment Gemini API Key Detected</span>
                </div>
                <p className="mt-1 text-[#C89DA6]">
                  An active environment key is already provisioned on this runtime. You can proceed
                  immediately or enter a custom Gemini API key below.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="gemini-api-key-input"
                className="block text-xs font-medium text-[#F9E8EC] mb-1.5"
              >
                Google Gemini API Key {usingServerKey ? '(Optional override)' : '(Required)'}
              </label>
              <div className="relative">
                <input
                  id="gemini-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    usingServerKey
                      ? 'Leave blank to use connected environment key...'
                      : 'AIzaSy...'
                  }
                  className="w-full rounded-xl bg-[#0A0406] border border-[#DC2626]/30 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-[#7F525B] focus:border-[#EF4444] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C89DA6] hover:text-white p-1"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#C89DA6]">
                Keys are stored locally and redacted from logs. In production APK distributions, a
                server proxy is recommended over client-embedded keys.
              </p>
            </div>

            {modelError && (
              <div className="rounded-xl bg-[#450A0A]/80 border border-[#EF4444] p-3 text-xs text-[#FCA5A5] flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Validation Error</p>
                  <p className="mt-0.5">{modelError}</p>
                </div>
              </div>
            )}

            {validationStatus && !modelError && (
              <p className="text-xs text-[#F87171] font-medium">{validationStatus}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleValidateStep}
                disabled={isLoadingModels}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
              >
                {isLoadingModels ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Validating & Fetching Models...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Validate Key & Discover Models</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-[#C89DA6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search available Gemini models"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter models by name or capability..."
                  className="w-full rounded-xl bg-[#0A0406] border border-[#DC2626]/30 pl-8 pr-3 py-2 text-xs text-white placeholder-[#7F525B] focus:border-[#EF4444] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setVisionFilterOnly(!visionFilterOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  visionFilterOnly
                    ? 'bg-[#DC2626] text-white border-[#EF4444]'
                    : 'bg-[#17080C] text-[#C89DA6] border-[#DC2626]/30 hover:text-white'
                }`}
              >
                Multimodal Only
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {filteredModels.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id)}
                    className={`w-full text-left rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'bg-[#260B12] border-[#EF4444] shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                        : 'bg-[#14070B] border-[#DC2626]/20 hover:border-[#DC2626]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-white">
                        {model.id}
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-[#EF4444]" />}
                    </div>
                    <p className="text-[11px] text-[#C89DA6] mt-1 line-clamp-2">
                      {model.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#F87171]">
                      <span>In: {(model.inputTokenLimit / 1000).toFixed(0)}k</span>
                      <span aria-hidden="true">·</span>
                      <span>Out: {(model.outputTokenLimit / 1000).toFixed(0)}k</span>
                      <span aria-hidden="true">·</span>
                      <span>{model.supportsVision ? 'Vision + Text' : 'Text Only'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2.5 rounded-xl bg-[#1A090D] border border-[#DC2626]/30 text-xs font-medium text-[#C89DA6] hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onCompleteSetup(apiKeyInput, selectedModel)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-4 py-2.5 text-xs font-semibold text-white transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>Confirm & Launch JARVIS</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
