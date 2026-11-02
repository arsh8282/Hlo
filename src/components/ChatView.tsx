import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Square,
  PlusCircle,
  Copy,
  Check,
  RotateCcw,
  Monitor,
  MonitorOff,
  Camera,
  Code2,
  Trash2,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  recognizedDraft: string | null;
  voiceError: string | null;
  screenAwarenessEnabled: boolean;
  isSharingScreen: boolean;
  capturedScreenshot: string | null;
  onSendMessage: (text: string, imageBase64?: string) => void;
  onStopGenerationOrSpeech: () => void;
  onNewChat: () => void;
  onStartVoiceInput: () => void;
  onStopVoiceInput: () => void;
  onAcceptVoiceDraft: (text: string) => void;
  onCancelVoiceDraft: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onCaptureCurrentScreenFrame: () => void;
  onUploadScreenshotFile: (base64: string) => void;
  onClearScreenshot: () => void;
  onSendCodeToEditor: (code: string) => void;
  onRetryLastPrompt: () => void;
}

const QUICK_PROMPTS = [
  'Sirf screen par jo error hai, usko explain karo.',
  'What is wrong with this Smali code?',
  'Find the false condition in license check.',
  'Explain registers v0, v1, and p0 in Hinglish.',
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isLoading,
  isSpeaking,
  isListening,
  recognizedDraft,
  voiceError,
  screenAwarenessEnabled,
  isSharingScreen,
  capturedScreenshot,
  onSendMessage,
  onStopGenerationOrSpeech,
  onNewChat,
  onStartVoiceInput,
  onStopVoiceInput,
  onAcceptVoiceDraft,
  onCancelVoiceDraft,
  onStartScreenShare,
  onStopScreenShare,
  onCaptureCurrentScreenFrame,
  onUploadScreenshotFile,
  onClearScreenshot,
  onSendCodeToEditor,
  onRetryLastPrompt,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [voiceEditDraft, setVoiceEditDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recognizedDraft !== null) {
      setVoiceEditDraft(recognizedDraft);
    }
  }, [recognizedDraft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && !capturedScreenshot) return;
    onSendMessage(
      trimmed || 'Sir, please analyze this captured screen and explain any errors or Smali logic.',
      capturedScreenshot || undefined
    );
    setInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadScreenshotFile(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const segments = msg.text.split(/(```[\s\S]*?```)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith('```') && segment.endsWith('```')) {
        const lines = segment.slice(3, -3).trim().split('\n');
        const firstLine = lines[0]?.trim() || '';
        const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
        const lang = hasLang ? firstLine : 'smali';
        const codeContent = hasLang ? lines.slice(1).join('\n') : lines.join('\n');
        const codeId = `${msg.id}-code-${index}`;

        return (
          <div
            key={codeId}
            className="my-2.5 rounded-xl bg-[#090204] border border-[#DC2626]/35 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#1B080D] border-b border-[#DC2626]/25 text-[11px] text-[#F87171]">
              <span className="font-mono uppercase tracking-wider">{lang}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendCodeToEditor(codeContent)}
                  className="flex items-center gap-1 text-[#F9E8EC] hover:text-[#EF4444] transition-colors"
                  title="Open snippet in Code Editor"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>To Editor</span>
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(codeContent, codeId)}
                  className="flex items-center gap-1 text-[#F9E8EC] hover:text-[#EF4444] transition-colors"
                >
                  {copiedId === codeId ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#EF4444]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs font-mono text-[#FDE8EC] overflow-x-auto leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      return (
        <p key={index} className="whitespace-pre-wrap leading-relaxed text-[13px]">
          {segment}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-toolbar: New Chat & Screen Awareness Control Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#120609] border-b border-[#DC2626]/20 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg bg-[#1E0A10] hover:bg-[#2A0E16] border border-[#DC2626]/30 px-2.5 py-1.5 text-xs font-medium text-[#F9E8EC] transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5 text-[#EF4444]" />
            <span>New Chat</span>
          </button>

          {isSpeaking && (
            <button
              type="button"
              onClick={onStopGenerationOrSpeech}
              className="flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-2.5 py-1.5 text-xs font-semibold text-white animate-pulse"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Stop Speech</span>
            </button>
          )}
        </div>

        {/* User-Controlled Screen Awareness Controls */}
        {screenAwarenessEnabled && (
          <div className="flex items-center gap-1.5">
            {isSharingScreen ? (
              <>
                <span className="text-[11px] text-[#F87171] font-medium">Sharing Active</span>
                <button
                  type="button"
                  onClick={onCaptureCurrentScreenFrame}
                  className="flex items-center gap-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  <Camera className="h-3 w-3" />
                  <span>Capture</span>
                </button>
                <button
                  type="button"
                  onClick={onStopScreenShare}
                  aria-label="Stop screen sharing"
                  className="p-1.5 rounded-lg bg-[#2A0D14] text-[#FCA5A5] hover:text-white border border-[#DC2626]/30"
                >
                  <MonitorOff className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartScreenShare}
                  className="flex items-center gap-1 rounded-lg bg-[#1F0A10] hover:bg-[#2D0E17] border border-[#DC2626]/35 px-2.5 py-1.5 text-[11px] font-medium text-[#F9E8EC]"
                >
                  <Monitor className="h-3.5 w-3.5 text-[#EF4444]" />
                  <span>Share Screen</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-[#1F0A10] hover:bg-[#2D0E17] border border-[#DC2626]/35 px-2.5 py-1.5 text-[11px] font-medium text-[#C89DA6] hover:text-white"
                  title="Attach screenshot image for analysis"
                >
                  <Camera className="h-3.5 w-3.5 text-[#F87171]" />
                  <span>Screenshot</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Conversation Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-3 border ${
                  isUser
                    ? 'bg-[#280A11] border-[#EF4444]/40 text-white'
                    : msg.isError
                    ? 'bg-[#3B0A0A] border-[#EF4444] text-[#FCA5A5]'
                    : 'bg-[#14070A] border-[#DC2626]/25 text-[#F9E8EC]'
                }`}
              >
                {msg.imagePreview && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-[#DC2626]/40">
                    <img
                      src={msg.imagePreview}
                      alt="Authorized screen capture for analysis"
                      className="max-h-48 w-auto object-contain bg-black"
                    />
                  </div>
                )}

                {renderMessageContent(msg)}

                <div className="mt-2 pt-1.5 border-t border-[#DC2626]/15 flex items-center justify-between gap-3 text-[11px] text-[#C89DA6]">
                  <div className="flex items-center gap-1.5">
                    <span>{isUser ? 'Sir' : 'JARVIS'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {msg.isError && (
                      <button
                        type="button"
                        onClick={onRetryLastPrompt}
                        className="flex items-center gap-1 text-[#FCA5A5] hover:text-white font-medium"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="flex items-center gap-1 text-[#C89DA6] hover:text-white transition-colors"
                      aria-label="Copy message response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-[#EF4444]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start">
            <div className="rounded-2xl bg-[#14070A] border border-[#DC2626]/30 px-4 py-3 text-xs text-[#F87171] flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#EF4444] animate-spin" />
              <span>JARVIS is analyzing bytecode & preparing response, Sir...</span>
              <button
                type="button"
                onClick={onStopGenerationOrSpeech}
                className="ml-2 rounded-lg bg-[#2B0C13] border border-[#EF4444]/40 px-2 py-0.5 text-[11px] text-white hover:bg-[#DC2626]"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar when conversation is short */}
      {messages.length <= 2 && !capturedScreenshot && (
        <div className="px-3.5 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="shrink-0 rounded-xl bg-[#16070B] hover:bg-[#240B12] border border-[#DC2626]/25 px-3 py-1.5 text-[11px] text-[#C89DA6] hover:text-white transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Explicit Screen Capture Preview Bar before sending */}
      {capturedScreenshot && (
        <div className="mx-3.5 mb-2 rounded-xl bg-[#1A080D] border border-[#EF4444]/50 p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={capturedScreenshot}
              alt="Screen preview"
              className="h-12 w-16 object-cover rounded-lg border border-[#DC2626]/40 bg-black"
            />
            <div>
              <p className="text-xs font-semibold text-white">Screen Capture Ready</p>
              <p className="text-[11px] text-[#C89DA6]">
                Will only be uploaded when you tap Analyze Screen or Send.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onSendMessage(
                  input.trim() ||
                    'Sirf screen par jo error ya Smali condition hai, usko detail mein Hinglish mein explain karo.',
                  capturedScreenshot
                )
              }
              className="rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              Analyze Screen
            </button>
            <button
              type="button"
              onClick={onClearScreenshot}
              aria-label="Discard captured screenshot"
              className="p-1.5 rounded-lg bg-[#280C12] text-[#C89DA6] hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recognized Voice Input Confirmation Bar */}
      {(isListening || recognizedDraft !== null || voiceError) && (
        <div className="mx-3.5 mb-2 rounded-xl bg-[#1D080E] border border-[#EF4444]/50 p-3 text-xs">
          {isListening ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#F87171] font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444] animate-ping" />
                <span>Listening (Hindi / English / Hinglish)... Speak now, Sir.</span>
              </div>
              <button
                type="button"
                onClick={onStopVoiceInput}
                className="rounded-lg bg-[#DC2626] px-2.5 py-1 text-white font-semibold"
              >
                Stop
              </button>
            </div>
          ) : voiceError ? (
            <div className="flex items-center justify-between text-[#FCA5A5]">
              <span>{voiceError}</span>
              <button
                type="button"
                onClick={onCancelVoiceDraft}
                className="underline ml-2 text-white"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] text-[#C89DA6]">
                Review or edit recognized voice command before sending:
              </label>
              <input
                type="text"
                value={voiceEditDraft}
                onChange={(e) => setVoiceEditDraft(e.target.value)}
                className="w-full rounded-lg bg-[#0A0406] border border-[#DC2626]/40 px-2.5 py-1.5 text-xs text-white"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelVoiceDraft}
                  className="px-2.5 py-1 rounded-lg bg-[#2A0D15] text-[#C89DA6] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAcceptVoiceDraft(voiceEditDraft);
                    setInput(voiceEditDraft);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#2A0D15] border border-[#DC2626]/40 text-white"
                >
                  Insert in Composer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAcceptVoiceDraft('');
                    onSendMessage(voiceEditDraft, capturedScreenshot || undefined);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#DC2626] text-white font-semibold"
                >
                  Send Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer Dock */}
      <div className="p-3 bg-[#100508] border-t border-[#DC2626]/25">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={isListening ? onStopVoiceInput : onStartVoiceInput}
            aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isListening
                ? 'bg-[#DC2626] border-[#F87171] text-white animate-pulse'
                : 'bg-[#1B080E] border-[#DC2626]/35 text-[#F87171] hover:text-white hover:border-[#EF4444]'
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <textarea
            aria-label="Ask JARVIS in Hinglish, Hindi, or English"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask JARVIS, Sir... (Paste Smali, Logcat, or ask in Hinglish)"
            className="flex-1 resize-none rounded-xl bg-[#0A0305] border border-[#DC2626]/35 px-3.5 py-2 text-xs text-white placeholder-[#82525C] focus:border-[#EF4444] focus:outline-none"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={onStopGenerationOrSpeech}
              aria-label="Stop generation"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DC2626] text-white"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() && !capturedScreenshot}
              aria-label="Send message"
              className="flex h-10 px-4 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 text-xs font-semibold text-white transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
