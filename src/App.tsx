import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  MessageSquare,
  Wrench,
  Code2,
  History,
  Settings,
  Volume2,
  VolumeX,
  KeyRound,
} from 'lucide-react';
import {
  GeminiModelInfo,
  ChatMessage,
  ConversationRecord,
  JarvisSettings,
  DEFAULT_CUSTOM_INSTRUCTIONS,
  DEFAULT_SMALI_EDITOR_CODE,
} from './types';
import { buildSpokenSummary } from './utils/diffEngine';
import { OnboardingModal } from './components/OnboardingModal';
import { ChatView } from './components/ChatView';
import { SmaliToolsView } from './components/SmaliToolsView';
import { CodeEditorView } from './components/CodeEditorView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { FloatingAssistant } from './components/FloatingAssistant';

type ActiveTab = 'chat' | 'tools' | 'editor' | 'history' | 'settings';

const STORAGE_SETTINGS_KEY = 'jarvis_ai_red_settings_v1';
const STORAGE_CONVERSATIONS_KEY = 'jarvis_ai_red_conversations_v1';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg-1',
  role: 'assistant',
  text: `Welcome back, Sir. JARVIS AI is online in full Crimson Tactical Mode.\n\nMain aapकी Android development, APK modding, Smali false-condition analysis, register debugging, aur Logcat crash diagnosis mein madad karne ke liye ready hoon.\n\nExample Smali check:\n\`\`\`smali\n.method public isProUser()Z\n    .locals 1\n    const/4 v0, 0x1\n    return v0\n.end method\n\`\`\`\nAap upar right corner se Speech ON/OFF toggle kar sakte hain, ya seedha Smali code bhej sakte hain.`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  model: 'gemini-3.8-flash',
};

export function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [settings, setSettings] = useState<JarvisSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          apiKey: parsed.apiKey || '',
          selectedModel: parsed.selectedModel || 'gemini-3.8-flash',
          speechEnabled: typeof parsed.speechEnabled === 'boolean' ? parsed.speechEnabled : true,
          voiceLanguage: parsed.voiceLanguage || 'en-IN',
          screenAwarenessEnabled:
            typeof parsed.screenAwarenessEnabled === 'boolean'
              ? parsed.screenAwarenessEnabled
              : true,
          floatingAssistantEnabled:
            typeof parsed.floatingAssistantEnabled === 'boolean'
              ? parsed.floatingAssistantEnabled
              : true,
          customInstructions: parsed.customInstructions ?? DEFAULT_CUSTOM_INSTRUCTIONS,
          responseDepth: parsed.responseDepth || 'balanced',
          preferredLanguage: parsed.preferredLanguage || 'Hinglish',
          onboardingCompleted: isAutostart ? true : Boolean(parsed.onboardingCompleted),
        };
      }
    } catch {
      // Ignore storage parse error
    }
    return {
      apiKey: '',
      selectedModel: 'gemini-3.8-flash',
      speechEnabled: true,
      voiceLanguage: 'en-IN',
      screenAwarenessEnabled: true,
      floatingAssistantEnabled: true,
      customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
      responseDepth: 'balanced',
      preferredLanguage: 'Hinglish',
      onboardingCompleted: isAutostart,
    };
  });

  const [conversations, setConversations] = useState<ConversationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [
      {
        id: 'conv-default-1',
        title: 'Smali Modding & False-Condition Session',
        updatedAt: new Date().toLocaleDateString(),
        model: 'gemini-3.8-flash',
        messages: [INITIAL_WELCOME_MESSAGE],
      },
    ];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(
    () => conversations[0]?.id || 'conv-default-1'
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(
    !settings.onboardingCompleted && !isAutostart
  );

  // Dynamic Gemini Models state
  const [availableModels, setAvailableModels] = useState<GeminiModelInfo[]>([
    {
      id: 'gemini-3.8-flash',
      displayName: 'Gemini 3.8 Flash',
      description:
        'Fast, high-intelligence multimodal model for Smali analysis, Hinglish chat, and screen debugging.',
      inputTokenLimit: 1048576,
      outputTokenLimit: 65536,
      supportedActions: ['generateContent', 'countTokens'],
      supportsVision: true,
    },
    {
      id: 'gemini-3.1-flash-lite',
      displayName: 'Gemini 3.1 Flash Lite',
      description:
        'Ultra-low latency model ideal for rapid Smali opcode lookups and quick floating assistant queries.',
      inputTokenLimit: 1048576,
      outputTokenLimit: 32768,
      supportedActions: ['generateContent'],
      supportsVision: true,
    },
    {
      id: 'gemini-flash-latest',
      displayName: 'Gemini Flash Latest',
      description:
        'Latest stable Flash release with balanced speed, code diff generation, and multimodal vision.',
      inputTokenLimit: 1048576,
      outputTokenLimit: 65536,
      supportedActions: ['generateContent'],
      supportsVision: true,
    },
  ]);
  const [usingServerKey, setUsingServerKey] = useState<boolean>(true);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Chat & Editor runtime states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastUserPrompt, setLastUserPrompt] = useState<{
    text: string;
    image?: string;
  } | null>(null);
  const [editorCode, setEditorCode] = useState<string>(DEFAULT_SMALI_EDITOR_CODE);
  const [proposedEditorCode, setProposedEditorCode] = useState<string | null>(null);
  const [isGeneratingPatch, setIsGeneratingPatch] = useState<boolean>(false);

  // Voice & TTS states
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedDraft, setRecognizedDraft] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Screen Awareness states
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore
    }
  }, [conversations]);

  const updateSettings = (partial: Partial<JarvisSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Fetch models on mount
  const fetchAndValidateModels = async (customKey: string): Promise<boolean> => {
    setIsLoadingModels(true);
    setModelError(null);
    try {
      const res = await fetch('/api/gemini/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: customKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setModelError(data.error || 'Could not validate API key with Gemini Models API.');
        setIsLoadingModels(false);
        return false;
      }
      if (Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
      }
      setUsingServerKey(Boolean(data.usingEnvironmentKey));
      if (data.usingEnvironmentKey && !settings.onboardingCompleted) {
        updateSettings({ onboardingCompleted: true });
        setShowOnboardingModal(false);
      }
      setIsLoadingModels(false);
      return true;
    } catch (err: any) {
      setModelError(err?.message || 'Network error while connecting to Gemini Models API.');
      setIsLoadingModels(false);
      return false;
    }
  };

  useEffect(() => {
    fetchAndValidateModels(settings.apiKey);
  }, []);

  // Speech Output (TextToSpeech)
  const speakResponseText = (rawText: string) => {
    if (!settings.speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const summary = buildSpokenSummary(rawText);
      if (!summary) return;
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.lang = settings.voiceLanguage;
      utterance.rate = 1.02;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeechAndGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Voice Input (SpeechRecognition)
  const startVoiceInput = () => {
    setVoiceError(null);
    setRecognizedDraft(null);
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceError(
        'Native SpeechRecognition is unavailable in this browser frame. You can type or paste your command directly, Sir.'
      );
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = settings.voiceLanguage;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        setRecognizedDraft(transcript);
        setIsListening(false);
      };
      rec.onerror = (event: any) => {
        setIsListening(false);
        setVoiceError(`Voice recognition notice: ${event?.error || 'microphone permission needed'}`);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setIsListening(false);
      setVoiceError(err?.message || 'Unable to start microphone session.');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  };

  // Screen Awareness (MediaProjection / getDisplayMedia)
  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setVoiceError(
        'Screen capture API is restricted in this container. Use the Screenshot button to attach a screen image for analysis, Sir.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      screenVideoRef.current = video;

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopScreenShare();
      });
    } catch {
      setIsSharingScreen(false);
    }
  };

  const captureCurrentScreenFrame = () => {
    const video = screenVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedScreenshot(dataUrl);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    screenVideoRef.current = null;
    setIsSharingScreen(false);
  };

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const appendMessageToActiveConversation = (msg: ChatMessage, updatedTitle?: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversation.id) return conv;
        return {
          ...conv,
          title: updatedTitle || conv.title,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: settings.selectedModel,
          messages: [...conv.messages, msg],
        };
      })
    );
  };

  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if (isGenerating) return;
    const trimmed = text.trim();
    if (!trimmed && !imageBase64) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imagePreview: imageBase64,
    };

    const isFirstUserMessage = activeConversation.messages.length <= 1;
    const newTitle = isFirstUserMessage
      ? trimmed.slice(0, 38) + (trimmed.length > 38 ? '...' : '')
      : undefined;

    appendMessageToActiveConversation(userMsg, newTitle);
    setLastUserPrompt({ text: trimmed, image: imageBase64 });
    setCapturedScreenshot(null);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fullSystemInstruction = `${settings.customInstructions}\nPreferred Language: ${settings.preferredLanguage}. Explanation Depth: ${settings.responseDepth}. Always address the user as Sir.`;

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          systemInstruction: fullSystemInstruction,
          history: activeConversation.messages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          message: trimmed,
          imageBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Gemini API request failed.');
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || settings.selectedModel,
      };
      appendMessageToActiveConversation(assistantMsg);
      speakResponseText(data.text);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `Sir, request encountered an error: ${err?.message || 'Unknown error'}. Please verify your connection or tap Retry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      appendMessageToActiveConversation(errMsg);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const freshConv: ConversationRecord = {
      id: newId,
      title: `Session ${conversations.length + 1}`,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: settings.selectedModel,
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          text: 'New session initialized, Sir. Paste your Smali method, crash log, or question whenever you are ready.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: settings.selectedModel,
        },
      ],
    };
    setConversations((prev) => [freshConv, ...prev]);
    setActiveConversationId(newId);
    setActiveTab('chat');
  };

  const handleRequestAiCodeAction = async (
    actionType: 'Explain' | 'Debug' | 'Find False Condition' | 'Fix Code' | 'Optimize' | 'Convert',
    selectedOrFullCode: string
  ) => {
    if (actionType === 'Fix Code' || actionType === 'Optimize') {
      setIsGeneratingPatch(true);
      try {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: settings.apiKey,
            model: settings.selectedModel,
            systemInstruction:
              'Return ONLY the corrected Smali/code inside a single ```smali ... ``` block without extra commentary if possible, or provide the corrected code block clearly so it can be diffed.',
            message: `Action: ${actionType}. Fix any false conditions or bugs in this Smali code so the check succeeds:\n\`\`\`smali\n${selectedOrFullCode}\n\`\`\``,
          }),
        });
        const data = await res.json();
        if (data.ok && data.text) {
          const match = data.text.match(/```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
          const extracted = match ? match[1].trim() : data.text.trim();
          setProposedEditorCode(extracted);
        }
      } catch {
        // Fallback if offline
      } finally {
        setIsGeneratingPatch(false);
      }
      return;
    }

    setActiveTab('chat');
    handleSendMessage(
      `Sir, please perform **${actionType}** on this code snippet in easy Hinglish:\n\`\`\`smali\n${selectedOrFullCode}\n\`\`\``
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#070204] text-[#F9E8EC] flex flex-col items-center justify-start">
      {/* Mobile-First App Shell Container */}
      <div className="w-full max-w-2xl h-screen flex flex-col bg-[#0B0406] border-x border-[#DC2626]/25 shadow-[0_0_50px_rgba(220,38,38,0.12)] relative overflow-hidden">
        {/* Top Mobile Header with Mandatory Upper-Right Speech ON/OFF Toggle */}
        <header className="shrink-0 h-14 px-3.5 bg-[#120509] border-b border-[#DC2626]/35 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DC2626]/20 border border-[#EF4444]">
              <Cpu className="h-5 w-5 text-[#EF4444]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-[#120509]" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-wider text-white uppercase leading-none">
                  JARVIS AI
                </h1>
                <span className="text-[11px] text-[#F87171] font-mono truncate">
                  · {settings.selectedModel}
                </span>
              </div>
              <p className="text-[11px] text-[#C89DA6] truncate mt-0.5">
                Android Smali & Modding Assistant · Ready, Sir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowOnboardingModal(true)}
              aria-label="Open API and Model Setup Wizard"
              className="p-2 rounded-xl bg-[#1D080E] hover:bg-[#2B0C15] border border-[#DC2626]/35 text-[#F87171] hover:text-white transition-colors"
              title="API Key & Model Setup Wizard"
            >
              <KeyRound className="h-4 w-4" />
            </button>

            {/* Mandatory Upper-Right Speech ON/OFF Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !settings.speechEnabled;
                updateSettings({ speechEnabled: nextState });
                if (!nextState && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
              }}
              aria-label={`Speech output ${settings.speechEnabled ? 'ON' : 'OFF'}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                settings.speechEnabled
                  ? 'bg-[#DC2626] border-[#FCA5A5]/60 text-white shadow-[0_0_15px_rgba(220,38,38,0.45)]'
                  : 'bg-[#1A070C] border-[#DC2626]/30 text-[#C89DA6] hover:text-white'
              }`}
            >
              {settings.speechEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>Speech: {settings.speechEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </header>

        {/* Main Active Screen Workspace */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatView
              messages={activeConversation.messages}
              isLoading={isGenerating}
              isSpeaking={isSpeaking}
              isListening={isListening}
              recognizedDraft={recognizedDraft}
              voiceError={voiceError}
              screenAwarenessEnabled={settings.screenAwarenessEnabled}
              isSharingScreen={isSharingScreen}
              capturedScreenshot={capturedScreenshot}
              onSendMessage={handleSendMessage}
              onStopGenerationOrSpeech={stopSpeechAndGeneration}
              onNewChat={handleNewConversation}
              onStartVoiceInput={startVoiceInput}
              onStopVoiceInput={stopVoiceInput}
              onAcceptVoiceDraft={() => setRecognizedDraft(null)}
              onCancelVoiceDraft={() => {
                setRecognizedDraft(null);
                setVoiceError(null);
              }}
              onStartScreenShare={startScreenShare}
              onStopScreenShare={stopScreenShare}
              onCaptureCurrentScreenFrame={captureCurrentScreenFrame}
              onUploadScreenshotFile={(b64) => setCapturedScreenshot(b64)}
              onClearScreenshot={() => setCapturedScreenshot(null)}
              onSendCodeToEditor={(snippet) => {
                setEditorCode(snippet);
                setProposedEditorCode(null);
                setActiveTab('editor');
              }}
              onRetryLastPrompt={() => {
                if (lastUserPrompt) {
                  handleSendMessage(lastUserPrompt.text, lastUserPrompt.image);
                }
              }}
            />
          )}

          {activeTab === 'tools' && (
            <SmaliToolsView
              onAskJarvisDeepAnalysis={(prompt) => {
                setActiveTab('chat');
                handleSendMessage(prompt);
              }}
              onLoadIntoEditorWithDiff={(orig, proposed) => {
                setEditorCode(orig);
                setProposedEditorCode(proposed);
                setActiveTab('editor');
              }}
            />
          )}

          {activeTab === 'editor' && (
            <CodeEditorView
              code={editorCode}
              proposedCode={proposedEditorCode}
              isGeneratingPatch={isGeneratingPatch}
              onChangeCode={setEditorCode}
              onSetProposedCode={setProposedEditorCode}
              onRequestAiCodeAction={handleRequestAiCodeAction}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              conversations={conversations}
              activeConversationId={activeConversation.id}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setActiveTab('chat');
              }}
              onNewConversation={handleNewConversation}
              onRenameConversation={(id, newTitle) => {
                setConversations((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
                );
              }}
              onDeleteConversation={(id) => {
                setConversations((prev) => {
                  const remaining = prev.filter((c) => c.id !== id);
                  if (remaining.length === 0) {
                    const fallback: ConversationRecord = {
                      id: `conv-${Date.now()}`,
                      title: 'New Session',
                      updatedAt: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      model: settings.selectedModel,
                      messages: [INITIAL_WELCOME_MESSAGE],
                    };
                    setActiveConversationId(fallback.id);
                    return [fallback];
                  }
                  if (id === activeConversationId) {
                    setActiveConversationId(remaining[0].id);
                  }
                  return remaining;
                });
              }}
              onClearAllConversations={() => {
                const fresh: ConversationRecord = {
                  id: `conv-${Date.now()}`,
                  title: 'Fresh JARVIS Session',
                  updatedAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  model: settings.selectedModel,
                  messages: [INITIAL_WELCOME_MESSAGE],
                };
                setConversations([fresh]);
                setActiveConversationId(fresh.id);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              availableModels={availableModels}
              usingServerKey={usingServerKey}
              isLoadingModels={isLoadingModels}
              modelError={modelError}
              conversationCount={conversations.length}
              hasCachedScreenshot={Boolean(capturedScreenshot)}
              onUpdateSettings={updateSettings}
              onRefreshModels={fetchAndValidateModels}
              onClearAllConversations={() => {
                const fresh: ConversationRecord = {
                  id: `conv-${Date.now()}`,
                  title: 'Fresh JARVIS Session',
                  updatedAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  model: settings.selectedModel,
                  messages: [INITIAL_WELCOME_MESSAGE],
                };
                setConversations([fresh]);
                setActiveConversationId(fresh.id);
              }}
              onClearCachedScreenshots={() => setCapturedScreenshot(null)}
              onResetAllSettings={() => {
                setSettings({
                  apiKey: '',
                  selectedModel: 'gemini-3.8-flash',
                  speechEnabled: true,
                  voiceLanguage: 'en-IN',
                  screenAwarenessEnabled: true,
                  floatingAssistantEnabled: true,
                  customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
                  responseDepth: 'balanced',
                  preferredLanguage: 'Hinglish',
                  onboardingCompleted: true,
                });
              }}
            />
          )}
        </main>

        {/* Movable Floating JARVIS Assistant Overlay */}
        {settings.floatingAssistantEnabled && (
          <FloatingAssistant
            onQuickAsk={(prompt) => handleSendMessage(prompt)}
            onTriggerVoice={startVoiceInput}
            onTriggerScreenCapture={startScreenShare}
            onOpenFullChat={() => setActiveTab('chat')}
            onDisableFloating={() => updateSettings({ floatingAssistantEnabled: false })}
          />
        )}

        {/* Bottom 5-Tab Mobile Navigation Bar */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="shrink-0 h-16 bg-[#110408] border-t border-[#DC2626]/35 grid grid-cols-5 px-2"
        >
          {(
            [
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'tools', label: 'Smali Tools', icon: Wrench },
              { id: 'editor', label: 'Code Editor', icon: Code2 },
              { id: 'history', label: 'History', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? 'text-[#EF4444] font-semibold'
                    : 'text-[#C89DA6] hover:text-white'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-[#DC2626]/20 border border-[#EF4444]/50' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] leading-none">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* First-Launch Setup Wizard Modal */}
        {showOnboardingModal && (
          <OnboardingModal
            settings={settings}
            availableModels={availableModels}
            usingServerKey={usingServerKey}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            onValidateAndFetchModels={fetchAndValidateModels}
            onCompleteSetup={(key, model) => {
              updateSettings({
                apiKey: key,
                selectedModel: model,
                onboardingCompleted: true,
              });
              setShowOnboardingModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
