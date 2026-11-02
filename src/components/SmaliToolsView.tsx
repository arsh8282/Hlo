import React, { useState } from 'react';
import {
  ShieldAlert,
  Cpu,
  GitBranch,
  Terminal,
  Wrench,
  FileCode2,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import {
  explainSmaliLineHinglish,
  analyzeFalseConditions,
  analyzeRegisters,
  analyzeSmaliMethods,
  checkSmaliSyntax,
  analyzeLogcatCrash,
  convertSmaliToJavaPseudocode,
} from '../utils/smaliEngine';
import { DEFAULT_SMALI_EDITOR_CODE, DEFAULT_SAMPLE_LOGCAT } from '../types';

interface SmaliToolsViewProps {
  onAskJarvisDeepAnalysis: (prompt: string) => void;
  onLoadIntoEditorWithDiff: (original: string, proposed: string) => void;
}

type ToolSubMode =
  | 'false-condition'
  | 'explainer'
  | 'registers'
  | 'methods'
  | 'logcat'
  | 'apk-troubleshooter';

export const SmaliToolsView: React.FC<SmaliToolsViewProps> = ({
  onAskJarvisDeepAnalysis,
  onLoadIntoEditorWithDiff,
}) => {
  const [activeTool, setActiveTool] = useState<ToolSubMode>('false-condition');
  const [smaliInput, setSmaliInput] = useState(DEFAULT_SMALI_EDITOR_CODE);
  const [logcatInput, setLogcatInput] = useState(DEFAULT_SAMPLE_LOGCAT);
  const [apkErrorInput, setApkErrorInput] = useState(
    'brut.androlib.AndrolibException: brut.common.BrutException: could not exec (exit code = 1): [aapt2, compile, --dir, res]'
  );

  // Compute deterministic static analysis results in real time
  const falseConditionReport = analyzeFalseConditions(smaliInput);
  const parsedLines = smaliInput
    .split(/\r?\n/)
    .map((line, idx) => explainSmaliLineHinglish(line, idx + 1));
  const registerReport = analyzeRegisters(smaliInput);
  const methodList = analyzeSmaliMethods(smaliInput);
  const syntaxIssues = checkSmaliSyntax(smaliInput);
  const javaPseudocode = convertSmaliToJavaPseudocode(smaliInput);
  const logcatReport = analyzeLogcatCrash(logcatInput);

  const toolsMenu: Array<{ id: ToolSubMode; label: string }> = [
    { id: 'false-condition', label: 'False-Condition' },
    { id: 'explainer', label: 'Smali Explainer' },
    { id: 'registers', label: 'Registers' },
    { id: 'methods', label: 'Methods & Pseudo' },
    { id: 'logcat', label: 'Logcat Crash' },
    { id: 'apk-troubleshooter', label: 'APK Build Help' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3.5 py-3 space-y-4">
      {/* Segmented Tool Selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-[#14060A] border border-[#DC2626]/25">
        {toolsMenu.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTool(item.id)}
            className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all text-center truncate ${
              activeTool === item.id
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[#C89DA6] hover:text-white hover:bg-[#1F0910]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Smali Input Box for Smali-based tools */}
      {activeTool !== 'logcat' && activeTool !== 'apk-troubleshooter' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="smali-workbench-input"
              className="text-xs font-semibold text-[#F9E8EC]"
            >
              Smali Code Input
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSmaliInput(DEFAULT_SMALI_EDITOR_CODE)}
                className="text-[11px] text-[#F87171] hover:underline"
              >
                Load Sample Check
              </button>
              <span aria-hidden="true" className="text-[#C89DA6]">·</span>
              <button
                type="button"
                onClick={() =>
                  onAskJarvisDeepAnalysis(
                    `Sir, please analyze this Smali snippet in Hinglish, trace why any condition might be false, and show the corrected Smali:\n\`\`\`smali\n${smaliInput}\n\`\`\``
                  )
                }
                className="flex items-center gap-1 text-[11px] font-semibold text-[#EF4444] hover:text-white"
              >
                <Sparkles className="h-3 w-3" />
                <span>Deep AI Trace</span>
              </button>
            </div>
          </div>
          <textarea
            id="smali-workbench-input"
            rows={7}
            value={smaliInput}
            onChange={(e) => setSmaliInput(e.target.value)}
            className="w-full rounded-xl bg-[#080204] border border-[#DC2626]/35 p-3 font-mono text-xs text-[#FDE8EC] focus:border-[#EF4444] focus:outline-none"
            placeholder="Paste .method ... .end method Smali code here..."
          />
        </div>
      )}

      {/* 1. FALSE-CONDITION ANALYZER */}
      {activeTool === 'false-condition' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#16070B] border border-[#DC2626]/30 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-[#EF4444]" />
                <span>Static Branch & False-Condition Report</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  onLoadIntoEditorWithDiff(smaliInput, falseConditionReport.proposedPatchedCode)
                }
                className="flex items-center gap-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                <span>Preview Diff in Editor</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[#F9E8EC]">
              {falseConditionReport.summaryHinglish}
            </p>
          </div>

          {falseConditionReport.branches.map((b, idx) => (
            <div
              key={`${b.lineNumber}-${idx}`}
              className="rounded-xl bg-[#120509] border border-[#DC2626]/25 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[#F87171]">
                  Line {b.lineNumber}: {b.instruction}
                </span>
                <span className="text-[11px] text-[#C89DA6]">
                  Target: {b.targetLabel}
                </span>
              </div>
              <p className="text-[#F9E8EC] leading-relaxed">{b.conditionSummary}</p>

              {b.precedingAssignments.length > 0 && (
                <div className="rounded-lg bg-[#0A0305] p-2.5 border border-[#DC2626]/20">
                  <p className="text-[11px] text-[#C89DA6] mb-1">
                    Preceding Register Assignments (Verified Evidence):
                  </p>
                  {b.precedingAssignments.map((pa) => (
                    <div key={pa.lineNumber} className="font-mono text-[11px] text-[#FCA5A5]">
                      L{pa.lineNumber}: {pa.instruction}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <p className="text-[11px] font-semibold text-[#F87171]">
                  Minimal Correction (Hinglish):
                </p>
                <p className="text-[#C89DA6] mt-0.5">{b.patchExplanationHinglish}</p>
                <pre className="mt-1.5 rounded-lg bg-[#080204] border border-[#DC2626]/30 p-2 font-mono text-[11px] text-white overflow-x-auto">
                  {b.likelyForceTruePatch}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. SMALI LINE-BY-LINE EXPLAINER */}
      {activeTool === 'explainer' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F87171]">
              Line-by-Line Hinglish Opcode Breakdown
            </h3>
            <span className="text-[11px] text-[#C89DA6]">
              {parsedLines.filter((l) => l.opcode !== 'comment').length} active lines
            </span>
          </div>

          <div className="space-y-1.5">
            {parsedLines
              .filter((l) => l.rawLine.trim().length > 0)
              .map((item) => (
                <div
                  key={item.lineNumber}
                  className="rounded-xl bg-[#130609] border border-[#DC2626]/20 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#F87171]">
                      L{item.lineNumber}: {item.rawLine.trim()}
                    </span>
                    <span className="text-[#C89DA6]">{item.category}</span>
                  </div>
                  <p className="mt-1 text-[#F9E8EC] text-[12px] leading-relaxed">
                    {item.hinglishExplanation}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. REGISTER & SYNTAX VERIFIER */}
      {activeTool === 'registers' && (
        <div className="space-y-3">
          {registerReport.warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#3A0A0E] border border-[#EF4444] p-3 text-xs text-[#FCA5A5] flex items-start gap-2"
            >
              <ShieldAlert className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}

          {syntaxIssues.length === 0 ? (
            <div className="rounded-xl bg-[#16070B] border border-[#DC2626]/30 p-3 text-xs text-[#F9E8EC] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#EF4444]" />
              <span>Static Syntax Parser: All method boundaries and branch labels matched.</span>
            </div>
          ) : (
            syntaxIssues.map((iss, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#3A0A0E] border border-[#EF4444] p-3 text-xs text-[#FCA5A5]"
              >
                Line {iss.lineNumber} ({iss.severity.toUpperCase()}): {iss.message}
              </div>
            ))
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F87171]">
              Register Allocation Map (.locals {registerReport.localsDeclared ?? 'N/A'})
            </h4>
            {registerReport.registers.map((reg) => (
              <div
                key={reg.name}
                className="rounded-xl bg-[#130609] border border-[#DC2626]/25 p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white text-sm">{reg.name}</span>
                  <span className="text-[11px] text-[#F87171]">{reg.role}</span>
                </div>
                <p className="text-[11px] text-[#C89DA6]">
                  Written at lines: {reg.writes.join(', ') || 'Parameter input'} · Read at lines:{' '}
                  {reg.reads.join(', ') || 'None'}
                </p>
                {reg.lastAssignedValue && (
                  <p className="font-mono text-[11px] text-[#FDE8EC] truncate">
                    Last Write: {reg.lastAssignedValue}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. METHOD DESCRIPTOR & JAVA PSEUDOCODE */}
      {activeTool === 'methods' && (
        <div className="space-y-3">
          {methodList.map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#14060A] border border-[#DC2626]/30 p-3.5 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-sm">{m.methodName}()</span>
                <span className="text-[11px] text-[#F87171]">
                  {m.accessFlags.join(' ') || 'package-private'}
                </span>
              </div>
              <p className="text-[#C89DA6]">
                Return Type: <span className="text-white font-medium">{m.returnType}</span>
              </p>
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-[#F87171]">
                  Parameter Register Mapping:
                </p>
                {m.parameterRegisterMap.map((pr) => (
                  <div key={pr.register} className="font-mono text-[11px] text-[#F9E8EC]">
                    {pr.register} → {pr.meaning}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-[#110508] border border-[#DC2626]/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F87171] flex items-center gap-1.5">
                <FileCode2 className="h-4 w-4 text-[#EF4444]" />
                <span>Smali-to-Java Illustrative Pseudocode</span>
              </h4>
            </div>
            <pre className="rounded-lg bg-[#080204] p-3 font-mono text-xs text-[#FDE8EC] overflow-x-auto leading-relaxed">
              {javaPseudocode}
            </pre>
          </div>
        </div>
      )}

      {/* 5. LOGCAT CRASH ANALYZER */}
      {activeTool === 'logcat' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="logcat-input" className="text-xs font-semibold text-white">
              Paste Android Logcat / Stack Trace
            </label>
            <button
              type="button"
              onClick={() =>
                onAskJarvisDeepAnalysis(
                  `Sir, please analyze this Android Logcat crash stack trace in Hinglish and tell me how to fix the Smali/APK:\n\`\`\`\n${logcatInput}\n\`\`\``
                )
              }
              className="flex items-center gap-1 text-xs font-semibold text-[#EF4444] hover:text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ask JARVIS about Crash</span>
            </button>
          </div>
          <textarea
            id="logcat-input"
            rows={6}
            value={logcatInput}
            onChange={(e) => setLogcatInput(e.target.value)}
            className="w-full rounded-xl bg-[#080204] border border-[#DC2626]/35 p-3 font-mono text-xs text-[#FDE8EC]"
          />

          {logcatReport.exceptions.map((ex, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#18070B] border border-[#EF4444]/40 p-3.5 text-xs space-y-1.5"
            >
              <div className="flex items-center gap-2 text-[#F87171] font-mono font-bold">
                <Terminal className="h-4 w-4 text-[#EF4444]" />
                <span>{ex.type}</span>
              </div>
              <p className="text-white font-mono text-[11px]">{ex.message}</p>
              <p className="text-[#F9E8EC] pt-1">
                <strong className="text-[#F87171]">Reason (Hinglish):</strong>{' '}
                {ex.likelyCauseHinglish}
              </p>
              <p className="text-[#C89DA6]">
                <strong className="text-[#F87171]">Fix Step:</strong> {ex.verificationStep}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 6. APK TROUBLESHOOTER */}
      {activeTool === 'apk-troubleshooter' && (
        <div className="space-y-3">
          <label htmlFor="apk-err-input" className="block text-xs font-semibold text-white">
            Paste Apktool / AAPT2 / ADB Install Error
          </label>
          <textarea
            id="apk-err-input"
            rows={4}
            value={apkErrorInput}
            onChange={(e) => setApkErrorInput(e.target.value)}
            className="w-full rounded-xl bg-[#080204] border border-[#DC2626]/35 p-3 font-mono text-xs text-[#FDE8EC]"
          />
          <button
            type="button"
            onClick={() =>
              onAskJarvisDeepAnalysis(
                `Sir, diagnose this APK build/install failure in simple Hinglish and give exact steps to fix it:\n\`\`\`\n${apkErrorInput}\n\`\`\``
              )
            }
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] py-2.5 text-xs font-semibold text-white"
          >
            <Wrench className="h-4 w-4" />
            <span>Diagnose with JARVIS AI</span>
          </button>

          <div className="rounded-xl bg-[#14060A] border border-[#DC2626]/25 p-3.5 text-xs space-y-2">
            <h4 className="font-bold text-[#F87171] uppercase tracking-wider">
              Common APK Modding Failure Stages
            </h4>
            <p className="text-[#F9E8EC]">
              <strong>1. INSTALL_PARSE_FAILED_NO_CERTIFICATES:</strong> APK recompile ke baad
              apksigner ya uber-apk-signer se v1+v2 sign nahi kiya gaya.
            </p>
            <p className="text-[#F9E8EC]">
              <strong>2. AAPT2 Resource Compilation Failed:</strong> res/values/public.xml ya
              AndroidManifest.xml mein malformed XML attribute hai.
            </p>
            <p className="text-[#F9E8EC]">
              <strong>3. INSTALL_FAILED_UPDATE_INCOMPATIBLE:</strong> Phone par pehle se original
              signature wala app installed hai; pehle uninstall karein ya package name clone karein.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
