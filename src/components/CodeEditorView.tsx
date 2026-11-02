import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Save,
  Copy,
  Check,
  RotateCcw,
  GitCompare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Bug,
  Wrench,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { computeLineDiff } from '../utils/diffEngine';
import { analyzeFalseConditions } from '../utils/smaliEngine';

interface CodeEditorViewProps {
  code: string;
  proposedCode: string | null;
  isGeneratingPatch: boolean;
  onChangeCode: (newCode: string) => void;
  onSetProposedCode: (proposed: string | null) => void;
  onRequestAiCodeAction: (
    actionType: 'Explain' | 'Debug' | 'Find False Condition' | 'Fix Code' | 'Optimize' | 'Convert',
    selectedOrFullCode: string
  ) => Promise<void>;
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  code,
  proposedCode,
  isGeneratingPatch,
  onChangeCode,
  onSetProposedCode,
  onRequestAiCodeAction,
}) => {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [selectedRangeText, setSelectedRangeText] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('SecurityValidator.smali');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = code.split(/\r?\n/);
  const diffSummary = proposedCode !== null ? computeLineDiff(code, proposedCode) : null;

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUndoStack((prev) => [...prev, code]);
        onChangeCode(reader.result);
        onSetProposedCode(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveFile = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'modified.smali';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSelectChange = () => {
    const el = textareaRef.current;
    if (!el) return;
    const sel = el.value.substring(el.selectionStart, el.selectionEnd).trim();
    setSelectedRangeText(sel);
  };

  const handleApplyDiff = () => {
    if (proposedCode === null) return;
    setUndoStack((prev) => [...prev, code]);
    onChangeCode(proposedCode);
    onSetProposedCode(null);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    onChangeCode(previous);
  };

  const handleQuickStaticFalseFix = () => {
    const report = analyzeFalseConditions(code);
    onSetProposedCode(report.proposedPatchedCode);
  };

  const targetSnippet = selectedRangeText || code;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3.5 py-3 space-y-3">
      {/* Top File Bar */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-[#14060A] border border-[#DC2626]/30 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono font-semibold text-white truncate">{fileName}</span>
          <span aria-hidden="true" className="text-[#C89DA6]">·</span>
          <span className="text-[11px] text-[#F87171]">{lines.length} lines</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-lg bg-[#200910] hover:bg-[#2E0D17] border border-[#DC2626]/30 px-2.5 py-1 text-[11px] text-white"
            title="Open local Smali or source file"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#EF4444]" />
            <span>Open</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".smali,.java,.kt,.xml,.txt,.py,.json"
            onChange={handleOpenFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleSaveFile}
            className="flex items-center gap-1 rounded-lg bg-[#200910] hover:bg-[#2E0D17] border border-[#DC2626]/30 px-2.5 py-1 text-[11px] text-white"
          >
            <Save className="h-3.5 w-3.5 text-[#EF4444]" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg bg-[#200910] hover:bg-[#2E0D17] border border-[#DC2626]/30 px-2.5 py-1 text-[11px] text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#EF4444]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#F87171]" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-lg bg-[#2A0B13] border border-[#EF4444]/40 px-2 py-1 text-[11px] text-[#FCA5A5] hover:text-white"
              title="Undo last applied edit"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual AI & Static Modding Action Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleQuickStaticFalseFix}
          className="flex items-center gap-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1.5 text-[11px] font-semibold text-white"
        >
          <GitCompare className="h-3.5 w-3.5" />
          <span>Generate True-Patch Diff</span>
        </button>

        {(
          ['Explain', 'Find False Condition', 'Fix Code', 'Debug', 'Optimize', 'Convert'] as const
        ).map((action) => (
          <button
            key={action}
            type="button"
            disabled={isGeneratingPatch}
            onClick={() => onRequestAiCodeAction(action, targetSnippet)}
            className="flex items-center gap-1 rounded-lg bg-[#1A080D] hover:bg-[#280C14] border border-[#DC2626]/30 px-2.5 py-1.5 text-[11px] font-medium text-[#F9E8EC] disabled:opacity-40"
          >
            {action === 'Fix Code' ? (
              <Wrench className="h-3 w-3 text-[#EF4444]" />
            ) : action === 'Debug' ? (
              <Bug className="h-3 w-3 text-[#EF4444]" />
            ) : action === 'Optimize' ? (
              <Zap className="h-3 w-3 text-[#EF4444]" />
            ) : (
              <Sparkles className="h-3 w-3 text-[#EF4444]" />
            )}
            <span>{action}</span>
          </button>
        ))}

        {isGeneratingPatch && (
          <span className="flex items-center gap-1 text-[11px] text-[#F87171] ml-1">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>JARVIS preparing patch...</span>
          </span>
        )}
      </div>

      {selectedRangeText && (
        <div className="rounded-lg bg-[#1C080E] border border-[#DC2626]/30 px-3 py-1.5 text-[11px] text-[#F87171] flex items-center justify-between">
          <span>
            Selection Active ({selectedRangeText.split('\n').length} line(s) selected for JARVIS
            action)
          </span>
          <button
            type="button"
            onClick={() => setSelectedRangeText('')}
            className="underline text-white"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Diff Approval Banner & Side-by-Side / Unified Diff Viewer */}
      {diffSummary && proposedCode !== null && (
        <div className="rounded-xl bg-[#16060A] border border-[#EF4444] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <GitCompare className="h-4 w-4 text-[#EF4444]" />
                <span>Proposed Code Diff Review (Approval Required)</span>
              </h3>
              <p className="text-[11px] text-[#C89DA6]">
                +{diffSummary.addedCount} added · -{diffSummary.removedCount} removed · Original
                preserved until you tap Apply.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleApplyDiff}
                className="flex items-center gap-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Apply Changes</span>
              </button>
              <button
                type="button"
                onClick={() => onSetProposedCode(null)}
                className="flex items-center gap-1 rounded-lg bg-[#280C12] hover:bg-[#381019] border border-[#DC2626]/30 px-2.5 py-1.5 text-xs font-medium text-[#FCA5A5]"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-lg bg-[#070203] border border-[#DC2626]/30 font-mono text-[11px]">
            {diffSummary.lines.map((dl, idx) => (
              <div
                key={idx}
                className={`flex px-2 py-0.5 ${
                  dl.type === 'added'
                    ? 'bg-emerald-950/55 text-emerald-200'
                    : dl.type === 'removed'
                    ? 'bg-red-950/70 text-red-300 line-through'
                    : 'text-[#C89DA6]'
                }`}
              >
                <span className="w-8 shrink-0 select-none text-right pr-2 opacity-60">
                  {dl.newLineNumber ?? dl.oldLineNumber}
                </span>
                <span className="w-4 shrink-0 select-none font-bold">
                  {dl.type === 'added' ? '+' : dl.type === 'removed' ? '-' : ' '}
                </span>
                <span className="whitespace-pre overflow-x-auto">{dl.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Line-Numbered Code Editor */}
      <div className="flex-1 min-h-[290px] flex rounded-xl bg-[#080204] border border-[#DC2626]/35 overflow-hidden">
        <div
          aria-hidden="true"
          className="select-none bg-[#120508] border-r border-[#DC2626]/20 px-2.5 py-3 text-right font-mono text-xs text-[#8C5863] leading-[1.6rem]"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="Smali and source code editor"
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          onSelect={handleSelectChange}
          spellCheck={false}
          wrap="off"
          className="flex-1 resize-none bg-transparent p-3 font-mono text-xs text-[#FDE8EC] leading-[1.6rem] whitespace-pre overflow-x-auto focus:outline-none"
        />
      </div>
    </div>
  );
};
