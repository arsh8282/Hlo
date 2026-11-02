import React, { useState } from 'react';
import {
  Cpu,
  X,
  Minimize2,
  Send,
  Mic,
  Camera,
  Maximize2,
  Move,
} from 'lucide-react';

interface FloatingAssistantProps {
  onQuickAsk: (prompt: string) => void;
  onTriggerVoice: () => void;
  onTriggerScreenCapture: () => void;
  onOpenFullChat: () => void;
  onDisableFloating: () => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  onQuickAsk,
  onTriggerVoice,
  onTriggerScreenCapture,
  onOpenFullChat,
  onDisableFloating,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [position, setPosition] = useState<{ right: number; bottom: number }>({
    right: 14,
    bottom: 132,
  });

  const cyclePosition = () => {
    setPosition((prev) => ({
      right: prev.right === 14 ? 20 : 14,
      bottom: prev.bottom === 132 ? 220 : 132,
    }));
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onQuickAsk(quickInput.trim());
    setQuickInput('');
    setExpanded(false);
    onOpenFullChat();
  };

  if (!expanded) {
    return (
      <div
        style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
        className="fixed z-40 flex items-center gap-1"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Open Floating JARVIS Assistant"
          className="h-12 w-12 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] border-2 border-[#FCA5A5] shadow-[0_0_25px_rgba(220,38,38,0.65)] flex items-center justify-center text-white transition-transform active:scale-95"
        >
          <Cpu className="h-6 w-6 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
      className="fixed z-40 w-72 rounded-2xl bg-[#130508]/95 backdrop-blur-md border border-[#EF4444] shadow-[0_0_35px_rgba(220,38,38,0.4)] p-3 text-xs text-white space-y-2.5"
      role="dialog"
      aria-label="Floating JARVIS Compact Overlay"
    >
      <div className="flex items-center justify-between border-b border-[#DC2626]/25 pb-2">
        <div className="flex items-center gap-1.5 font-display font-bold tracking-wider text-sm text-[#F87171]">
          <Cpu className="h-4 w-4 text-[#EF4444]" />
          <span>JARVIS OVERLAY</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={cyclePosition}
            aria-label="Move floating panel position"
            className="p-1 rounded hover:bg-[#260B11] text-[#C89DA6] hover:text-white"
            title="Move overlay position"
          >
            <Move className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Minimize floating assistant"
            className="p-1 rounded hover:bg-[#260B11] text-[#C89DA6] hover:text-white"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDisableFloating}
            aria-label="Close floating assistant"
            className="p-1 rounded hover:bg-[#260B11] text-[#FCA5A5] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleQuickSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Quick question, Sir..."
          className="flex-1 rounded-lg bg-[#080204] border border-[#DC2626]/40 px-2.5 py-1.5 text-xs text-white placeholder-[#7F525B] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send quick question"
          className="p-1.5 rounded-lg bg-[#DC2626] text-white"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            onOpenFullChat();
            onTriggerScreenCapture();
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg bg-[#1E080E] hover:bg-[#2B0C14] border border-[#DC2626]/30 py-2 text-[10px] text-[#F9E8EC]"
        >
          <Camera className="h-3.5 w-3.5 text-[#EF4444]" />
          <span>Analyze Screen</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            onOpenFullChat();
            onTriggerVoice();
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg bg-[#1E080E] hover:bg-[#2B0C14] border border-[#DC2626]/30 py-2 text-[10px] text-[#F9E8EC]"
        >
          <Mic className="h-3.5 w-3.5 text-[#EF4444]" />
          <span>Voice Input</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            onOpenFullChat();
          }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg bg-[#1E080E] hover:bg-[#2B0C14] border border-[#DC2626]/30 py-2 text-[10px] text-[#F9E8EC]"
        >
          <Maximize2 className="h-3.5 w-3.5 text-[#EF4444]" />
          <span>Full Chat</span>
        </button>
      </div>
    </div>
  );
};
