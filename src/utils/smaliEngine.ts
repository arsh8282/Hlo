export interface SmaliInstructionInfo {
  lineNumber: number;
  rawLine: string;
  opcode: string;
  registers: string[];
  target?: string;
  category:
    | 'branch'
    | 'invoke'
    | 'move'
    | 'const'
    | 'return'
    | 'field'
    | 'directive'
    | 'label'
    | 'other';
  hinglishExplanation: string;
}

export interface SmaliMethodMetadata {
  rawDirective: string;
  methodName: string;
  accessFlags: string[];
  isStatic: boolean;
  parameterTypes: string[];
  returnType: string;
  parameterRegisterMap: Array<{ register: string; meaning: string }>;
  localsCount: number | null;
}

export interface FalseConditionReport {
  branches: Array<{
    lineNumber: number;
    instruction: string;
    opcode: string;
    testedRegisters: string[];
    targetLabel: string;
    precedingAssignments: Array<{ lineNumber: number; instruction: string }>;
    conditionSummary: string;
    likelyForceTruePatch: string;
    patchExplanationHinglish: string;
  }>;
  proposedPatchedCode: string;
  hasEvidence: boolean;
  summaryHinglish: string;
}

export interface RegisterUsageReport {
  registers: Array<{
    name: string;
    role: 'Local Register' | 'Parameter / Object Reference';
    writes: number[];
    reads: number[];
    lastAssignedValue: string | null;
  }>;
  localsDeclared: number | null;
  warnings: string[];
}

export interface SyntaxCheckIssue {
  lineNumber: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface LogcatAnalysisReport {
  exceptions: Array<{
    type: string;
    message: string;
    lineNumber: number;
    likelyCauseHinglish: string;
    verificationStep: string;
  }>;
  stackFrames: Array<{
    className: string;
    methodName: string;
    fileAndLine: string;
  }>;
}

const TYPE_DESCRIPTOR_MAP: Record<string, string> = {
  V: 'void (kuch return nahi karta)',
  Z: 'boolean (true/false — 1 ya 0)',
  B: 'byte',
  S: 'short',
  C: 'char',
  I: 'int (integer number)',
  J: 'long (64-bit integer, 2 registers leta hai)',
  F: 'float',
  D: 'double (64-bit float, 2 registers leta hai)',
};

export function parseDalvikTypeDescriptor(desc: string): string {
  if (!desc) return 'unknown';
  let arrayDepth = 0;
  let idx = 0;
  while (desc[idx] === '[') {
    arrayDepth++;
    idx++;
  }
  const core = desc.slice(idx);
  let baseName = core;
  if (TYPE_DESCRIPTOR_MAP[core]) {
    baseName = TYPE_DESCRIPTOR_MAP[core];
  } else if (core.startsWith('L') && core.endsWith(';')) {
    baseName = core.slice(1, -1).replace(/\//g, '.');
  }
  return arrayDepth > 0 ? `${baseName}${'[]'.repeat(arrayDepth)}` : baseName;
}

export function parseParameterListDescriptor(paramsRaw: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < paramsRaw.length) {
    let start = i;
    while (paramsRaw[i] === '[') i++;
    if (paramsRaw[i] === 'L') {
      const semi = paramsRaw.indexOf(';', i);
      if (semi === -1) break;
      i = semi + 1;
    } else {
      i++;
    }
    const token = paramsRaw.slice(start, i);
    result.push(parseDalvikTypeDescriptor(token));
  }
  return result;
}

export function analyzeSmaliMethods(code: string): SmaliMethodMetadata[] {
  const lines = code.split(/\r?\n/);
  const methods: SmaliMethodMetadata[] = [];
  let current: SmaliMethodMetadata | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('.method ')) {
      const tokens = line.replace('.method ', '').trim().split(/\s+/);
      const signatureToken = tokens[tokens.length - 1] || '';
      const flags = tokens.slice(0, -1);
      const isStatic = flags.includes('static');

      const match = signatureToken.match(/^([^\(]+)\(([^\)]*)\)(.+)$/);
      const methodName = match ? match[1] : signatureToken;
      const paramsRaw = match ? match[2] : '';
      const returnRaw = match ? match[3] : 'V';

      const parameterTypes = parseParameterListDescriptor(paramsRaw);
      const returnType = parseDalvikTypeDescriptor(returnRaw);

      const parameterRegisterMap: Array<{ register: string; meaning: string }> = [];
      let pIndex = 0;
      if (!isStatic) {
        parameterRegisterMap.push({
          register: 'p0',
          meaning: 'this (current class instance reference)',
        });
        pIndex = 1;
      }
      for (const pType of parameterTypes) {
        parameterRegisterMap.push({
          register: `p${pIndex}`,
          meaning: `Parameter: ${pType}`,
        });
        pIndex += pType.includes('64-bit') ? 2 : 1;
      }

      current = {
        rawDirective: line,
        methodName,
        accessFlags: flags,
        isStatic,
        parameterTypes,
        returnType,
        parameterRegisterMap,
        localsCount: null,
      };
      methods.push(current);
    } else if (current && line.startsWith('.locals ')) {
      const num = parseInt(line.replace('.locals ', '').trim(), 10);
      if (!Number.isNaN(num)) {
        current.localsCount = num;
      }
    } else if (line.startsWith('.end method')) {
      current = null;
    }
  }

  return methods;
}

export function explainSmaliLineHinglish(rawLine: string, lineNumber: number): SmaliInstructionInfo {
  const line = rawLine.trim();
  const regMatches = Array.from(line.matchAll(/\b([vp]\d+)\b/g)).map((m) => m[1]);

  if (!line || line.startsWith('#')) {
    return {
      lineNumber,
      rawLine,
      opcode: 'comment',
      registers: [],
      category: 'other',
      hinglishExplanation: 'Comment ya blank line — execution par koi asar nahi padta.',
    };
  }

  if (line.startsWith(':')) {
    return {
      lineNumber,
      rawLine,
      opcode: 'label',
      registers: [],
      target: line,
      category: 'label',
      hinglishExplanation: `Jump label "${line}" — jab koi conditional branch ya goto match hota hai toh control flow yahan jump karta hai.`,
    };
  }

  if (line.startsWith('.')) {
    const directive = line.split(/\s+/)[0];
    let exp = `Smali assembler directive (${directive}).`;
    if (directive === '.locals') {
      exp = `Sir, yeh batata hai ki is method mein kitne local registers (v0, v1...) allocate honge.`;
    } else if (directive === '.method') {
      exp = `Method declaration start — access flags, parameters aur return type define karta hai.`;
    } else if (directive === '.end') {
      exp = `Current method block yahan khatam hota hai.`;
    }
    return {
      lineNumber,
      rawLine,
      opcode: directive,
      registers: regMatches,
      category: 'directive',
      hinglishExplanation: exp,
    };
  }

  const firstSpace = line.indexOf(' ');
  const opcode = firstSpace === -1 ? line : line.slice(0, firstSpace);
  const rest = firstSpace === -1 ? '' : line.slice(firstSpace + 1).trim();

  if (opcode.startsWith('if-')) {
    const parts = rest.split(',').map((s) => s.trim());
    const target = parts[parts.length - 1] || '';
    let explanation = '';
    if (opcode === 'if-eqz') {
      explanation = `Condition Check: Agar register ${regMatches[0] || 'v0'} ki value 0 (false / null) hai, toh seedha "${target}" par jump karega.`;
    } else if (opcode === 'if-nez') {
      explanation = `Condition Check: Agar register ${regMatches[0] || 'v0'} ki value 0 NAHI hai (true / non-null), toh "${target}" par jump karega.`;
    } else if (opcode === 'if-eq') {
      explanation = `Comparison: Agar ${regMatches[0]} aur ${regMatches[1]} barabar (equal) hain, toh "${target}" par jump karega.`;
    } else if (opcode === 'if-ne') {
      explanation = `Comparison: Agar ${regMatches[0]} aur ${regMatches[1]} alag (not equal) hain, toh "${target}" par jump karega.`;
    } else {
      explanation = `Conditional branch (${opcode}): Registers [${regMatches.join(', ')}] compare karke "${target}" par jump karta hai.`;
    }
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      target,
      category: 'branch',
      hinglishExplanation: explanation,
    };
  }

  if (opcode.startsWith('goto')) {
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: [],
      target: rest,
      category: 'branch',
      hinglishExplanation: `Unconditional Jump: Bina kisi condition ke seedha "${rest}" label par jump karta hai.`,
    };
  }

  if (opcode.startsWith('const')) {
    const parts = rest.split(',').map((s) => s.trim());
    const val = parts[1] || '';
    const isZero = val === '0x0' || val === '0';
    const isOne = val === '0x1' || val === '1';
    const extra = isZero
      ? ' (boolean mein 0x0 ka matlab FALSE ya null hota hai)'
      : isOne
      ? ' (boolean mein 0x1 ka matlab TRUE hota hai)'
      : '';
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      category: 'const',
      hinglishExplanation: `Register ${regMatches[0] || 'v0'} mein constant value ${val} assign kar raha hai${extra}.`,
    };
  }

  if (opcode.startsWith('invoke-')) {
    const arrowIdx = rest.indexOf('->');
    const methodTarget = arrowIdx !== -1 ? rest.slice(arrowIdx + 2) : rest;
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      target: methodTarget,
      category: 'invoke',
      hinglishExplanation: `Method Call (${opcode}): "${methodTarget}" ko call kar raha hai using registers [${regMatches.join(', ')}]. Iska return result agli "move-result" line mein aayega.`,
    };
  }

  if (opcode.startsWith('move-result')) {
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      category: 'move',
      hinglishExplanation: `Pichle invoke-* method call se jo return value aayi hai, usko register ${regMatches[0] || 'v0'} mein store kar raha hai.`,
    };
  }

  if (opcode.startsWith('iget') || opcode.startsWith('sget')) {
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      category: 'field',
      hinglishExplanation: `Field Read (${opcode}): Class/Object field ki value read karke register ${regMatches[0] || 'v0'} mein daal raha hai.`,
    };
  }

  if (opcode.startsWith('iput') || opcode.startsWith('sput')) {
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      category: 'field',
      hinglishExplanation: `Field Write (${opcode}): Register ${regMatches[0] || 'v0'} ki value class/instance field mein save kar raha hai.`,
    };
  }

  if (opcode.startsWith('return')) {
    const exp =
      opcode === 'return-void'
        ? 'Method se bina kisi value ke wapas return ho raha hai (void).'
        : `Method execution khatam karke register ${regMatches[0] || 'v0'} ki value caller ko return kar raha hai.`;
    return {
      lineNumber,
      rawLine,
      opcode,
      registers: regMatches,
      category: 'return',
      hinglishExplanation: exp,
    };
  }

  return {
    lineNumber,
    rawLine,
    opcode,
    registers: regMatches,
    category: 'other',
    hinglishExplanation: `Instruction "${opcode}" execute ho rahi hai registers [${regMatches.join(', ') || 'none'}] ke saath.`,
  };
}

export function analyzeFalseConditions(code: string): FalseConditionReport {
  const rawLines = code.split(/\r?\n/);
  const parsedLines = rawLines.map((line, idx) => explainSmaliLineHinglish(line, idx + 1));

  const branches: FalseConditionReport['branches'] = [];
  const patchedLines = [...rawLines];

  for (let i = 0; i < parsedLines.length; i++) {
    const info = parsedLines[i];
    if (info.category === 'branch' && info.opcode.startsWith('if-')) {
      const testedRegs = info.registers;
      const precedingAssignments: Array<{ lineNumber: number; instruction: string }> = [];

      for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
        const prev = parsedLines[j];
        if (
          prev.registers.some((r) => testedRegs.includes(r)) &&
          (prev.category === 'const' ||
            prev.category === 'move' ||
            prev.category === 'field')
        ) {
          precedingAssignments.unshift({
            lineNumber: prev.lineNumber,
            instruction: prev.rawLine.trim(),
          });
        }
      }

      let likelyForceTruePatch = info.rawLine;
      let patchExplanationHinglish = '';
      let conditionSummary = '';

      if (info.opcode === 'if-eqz') {
        const reg = testedRegs[0] || 'v0';
        conditionSummary = `Line ${info.lineNumber} checks "${info.rawLine.trim()}". Jab ${reg} == 0 (false) hota hai, toh yeh "${info.target}" (usually failure/false block) par jump kar jata hai.`;
        likelyForceTruePatch = `    const/4 ${reg}, 0x1\n${info.rawLine}`;
        patchExplanationHinglish = `Sir, "${info.opcode}" se theek pehle "${reg}" mein 0x1 (TRUE) set karne ya branch ko invert/NOP karne se false jump रुक jayega.`;
        // Also inspect if there is a direct const/4 reg, 0x0 right before or at target
        for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
          if (patchedLines[k].includes(`const/4 ${reg}, 0x0`)) {
            patchedLines[k] = patchedLines[k].replace('0x0', '0x1');
          }
        }
      } else if (info.opcode === 'if-nez') {
        const reg = testedRegs[0] || 'v0';
        conditionSummary = `Line ${info.lineNumber} checks "${info.rawLine.trim()}". Jab ${reg} != 0 hota hai tab "${info.target}" par jump karta hai. Agar ${reg} 0 (false) aaya toh jump skip ho jata hai.`;
        likelyForceTruePatch = info.rawLine.replace('if-nez', 'if-eqz');
        patchExplanationHinglish = `Sir, agar ${reg} false (0) aa raha hai, toh "if-nez" ko "if-eqz" ya register ko 0x1 force karne se desired path execute hoga.`;
      } else {
        conditionSummary = `Line ${info.lineNumber} compares [${testedRegs.join(', ')}] using "${info.opcode}" and branches to "${info.target}".`;
        likelyForceTruePatch = info.rawLine.replace(
          info.opcode,
          info.opcode === 'if-eq' ? 'if-ne' : 'if-eq'
        );
        patchExplanationHinglish = `Branch condition "${info.opcode}" ko invert karke opposite branch path trigger kiya ja sakta hai.`;
      }

      branches.push({
        lineNumber: info.lineNumber,
        instruction: info.rawLine.trim(),
        opcode: info.opcode,
        testedRegisters: testedRegs,
        targetLabel: info.target || '',
        precedingAssignments,
        conditionSummary,
        likelyForceTruePatch,
        patchExplanationHinglish,
      });
    }
  }

  // Also check if any return block explicitly sets 0x0 right before return
  for (let i = 0; i < patchedLines.length; i++) {
    const trimmed = patchedLines[i].trim();
    if (/^const\/4\s+[vp]\d+,\s*0x0\b/.test(trimmed)) {
      patchedLines[i] = patchedLines[i].replace('0x0', '0x1');
    }
  }

  return {
    branches,
    proposedPatchedCode: patchedLines.join('\n'),
    hasEvidence: branches.length > 0,
    summaryHinglish:
      branches.length > 0
        ? `Sir, is Smali code mein ${branches.length} conditional branch(es) mile hain jo boolean/check flow control kar rahe hain.`
        : `Sir, is snippet mein koi conditional branch (if-eqz / if-nez) nahi mila. Kripya surrounding method lines ya caller method paste karein.`,
  };
}

export function analyzeRegisters(code: string): RegisterUsageReport {
  const lines = code.split(/\r?\n/);
  const map = new Map<
    string,
    {
      name: string;
      role: 'Local Register' | 'Parameter / Object Reference';
      writes: number[];
      reads: number[];
      lastAssignedValue: string | null;
    }
  >();
  let localsDeclared: number | null = null;
  const warnings: string[] = [];

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith('.locals ')) {
      const n = parseInt(trimmed.replace('.locals ', '').trim(), 10);
      if (!Number.isNaN(n)) localsDeclared = n;
    }

    const regs = Array.from(trimmed.matchAll(/\b([vp]\d+)\b/g)).map((m) => m[1]);
    if (regs.length === 0) return;

    const opcode = trimmed.split(/\s+/)[0];
    const isWriteFirst =
      opcode.startsWith('const') ||
      opcode.startsWith('move') ||
      opcode.startsWith('iget') ||
      opcode.startsWith('sget') ||
      opcode.startsWith('new-instance') ||
      opcode.startsWith('aget') ||
      opcode.startsWith('add-') ||
      opcode.startsWith('sub-');

    regs.forEach((r, rIdx) => {
      if (!map.has(r)) {
        map.set(r, {
          name: r,
          role: r.startsWith('p') ? 'Parameter / Object Reference' : 'Local Register',
          writes: [],
          reads: [],
          lastAssignedValue: null,
        });
      }
      const entry = map.get(r)!;
      if (rIdx === 0 && isWriteFirst) {
        entry.writes.push(lineNo);
        entry.lastAssignedValue = trimmed;
      } else {
        entry.reads.push(lineNo);
      }
    });
  });

  if (localsDeclared !== null) {
    for (const key of map.keys()) {
      if (key.startsWith('v')) {
        const regIndex = parseInt(key.slice(1), 10);
        if (regIndex >= localsDeclared) {
          warnings.push(
            `Verifier Error Risk: Register ${key} use hua hai par .locals ${localsDeclared} declared hai (index 0 se ${
              localsDeclared - 1
            } tak hi valid hai).`
          );
        }
      }
    }
  } else {
    warnings.push(
      'Context Notice: ".locals" directive nahi dikha. Complete method header hone par exact register allocation verify hoga.'
    );
  }

  return {
    registers: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)),
    localsDeclared,
    warnings,
  };
}

export function checkSmaliSyntax(code: string): SyntaxCheckIssue[] {
  const lines = code.split(/\r?\n/);
  const issues: SyntaxCheckIssue[] = [];
  let inMethod = false;
  let methodStartLine = 0;
  const definedLabels = new Set<string>();
  const referencedLabels: Array<{ label: string; line: number }> = [];

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith(':')) {
      definedLabels.add(trimmed.split(/\s+/)[0]);
    }

    if (trimmed.startsWith('.method ')) {
      if (inMethod) {
        issues.push({
          lineNumber: lineNo,
          severity: 'error',
          message: 'Nested .method mila bina pichle method ko ".end method" se close kiye.',
        });
      }
      inMethod = true;
      methodStartLine = lineNo;
    } else if (trimmed.startsWith('.end method')) {
      if (!inMethod) {
        issues.push({
          lineNumber: lineNo,
          severity: 'error',
          message: '".end method" mila bina matching ".method" directive ke.',
        });
      }
      inMethod = false;
    }

    if (/^(if-[a-z]+|goto(\/\d+)?)\s+/.test(trimmed)) {
      const tokens = trimmed.split(/[\s,]+/);
      const target = tokens[tokens.length - 1];
      if (target && target.startsWith(':')) {
        referencedLabels.push({ label: target, line: lineNo });
      } else {
        issues.push({
          lineNumber: lineNo,
          severity: 'error',
          message: `Branch instruction "${trimmed}" mein valid ":label" target missing hai.`,
        });
      }
    }
  });

  if (inMethod) {
    issues.push({
      lineNumber: methodStartLine,
      severity: 'warning',
      message: 'Method start hua hai par ".end method" se close nahi kiya gaya.',
    });
  }

  for (const ref of referencedLabels) {
    if (!definedLabels.has(ref.label)) {
      issues.push({
        lineNumber: ref.line,
        severity: 'warning',
        message: `Target label "${ref.label}" is snippet mein defined nahi hai (check karein ki snippet complete method hai ya nahi).`,
      });
    }
  }

  return issues;
}

export function analyzeLogcatCrash(logText: string): LogcatAnalysisReport {
  const lines = logText.split(/\r?\n/);
  const exceptions: LogcatAnalysisReport['exceptions'] = [];
  const stackFrames: LogcatAnalysisReport['stackFrames'] = [];

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const exMatch = raw.match(
      /([a-zA-Z0-9_$.]+(?:Exception|Error|VerifyError)):\s*(.*)$/
    );
    if (exMatch) {
      const exType = exMatch[1];
      const msg = exMatch[2] || '';
      let cause = 'Runtime par unexpected state ya invalid argument pass hua hai.';
      let step = 'Stack trace ke sabse upar wale app frame ki line number check karein.';

      if (exType.includes('VerifyError')) {
        cause =
          'Smali mod ke baad Dalvik/ART bytecode verifier fail hua (e.g., .locals count galat hai ya register type mismatch hai).';
        step =
          'Modified method mein ".locals" count badhayein aur check karein ki return instruction method signature se match karta hai.';
      } else if (exType.includes('NullPointerException')) {
        cause =
          'Register mein 0x0 (null reference) tha jab uspar invoke-virtual ya iget call kiya gaya.';
        step = 'Crash line se pehle if-eqz null check add karein ya object initialization verify karein.';
      } else if (exType.includes('UnsatisfiedLinkError')) {
        cause = 'Native .so library missing hai ya JNI method signature mismatch hai.';
        step = 'APK ke lib/arm64-v8a folder mein native .so files check karein.';
      } else if (exType.includes('SecurityException')) {
        cause = 'AndroidManifest.xml mein required permission missing hai ya signature check trigger hua.';
        step = 'Manifest permissions aur signature verification method trace karein.';
      }

      exceptions.push({
        type: exType,
        message: msg,
        lineNumber: lineNo,
        likelyCauseHinglish: cause,
        verificationStep: step,
      });
    }

    const frameMatch = raw.match(/at\s+([a-zA-Z0-9_$./]+)\.([a-zA-Z0-9_$<>]+)\(([^)]+)\)/);
    if (frameMatch) {
      stackFrames.push({
        className: frameMatch[1],
        methodName: frameMatch[2],
        fileAndLine: frameMatch[3],
      });
    }
  });

  return { exceptions, stackFrames };
}

export function convertSmaliToJavaPseudocode(code: string): string {
  const lines = code.split(/\r?\n/);
  const out: string[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('.method ')) {
      out.push(`// ${t}`);
      out.push(`function methodBlock() {`);
    } else if (t.startsWith('.end method')) {
      out.push(`}`);
    } else if (t.startsWith('const/4 ') || t.startsWith('const/16 ') || t.startsWith('const ')) {
      const parts = t.replace(/^const(\/\d+)?\s+/, '').split(',');
      if (parts.length >= 2) {
        const reg = parts[0].trim();
        const val = parts[1].trim();
        const friendly =
          val === '0x0' ? 'false /* 0x0 */' : val === '0x1' ? 'true /* 0x1 */' : val;
        out.push(`  ${reg} = ${friendly};`);
      }
    } else if (t.startsWith('const-string ')) {
      const m = t.match(/^const-string\s+([vp]\d+),\s*(.+)$/);
      if (m) out.push(`  ${m[1]} = ${m[2]};`);
    } else if (t.startsWith('invoke-')) {
      const arrow = t.indexOf('->');
      const callPart = arrow !== -1 ? t.slice(arrow + 2) : t;
      const regs = Array.from(t.matchAll(/\b([vp]\d+)\b/g)).map((m) => m[1]);
      out.push(`  lastResult = call ${callPart}(${regs.join(', ')});`);
    } else if (t.startsWith('move-result')) {
      const regs = Array.from(t.matchAll(/\b([vp]\d+)\b/g)).map((m) => m[1]);
      if (regs[0]) out.push(`  ${regs[0]} = lastResult;`);
    } else if (t.startsWith('if-eqz ')) {
      const parts = t.replace('if-eqz ', '').split(',');
      out.push(`  if (${parts[0]?.trim()} == 0 /* false */) goto ${parts[1]?.trim()};`);
    } else if (t.startsWith('if-nez ')) {
      const parts = t.replace('if-nez ', '').split(',');
      out.push(`  if (${parts[0]?.trim()} != 0 /* true */) goto ${parts[1]?.trim()};`);
    } else if (t.startsWith(':')) {
      out.push(`${t}`);
    } else if (t.startsWith('return-void')) {
      out.push(`  return;`);
    } else if (t.startsWith('return')) {
      const regs = Array.from(t.matchAll(/\b([vp]\d+)\b/g)).map((m) => m[1]);
      out.push(`  return ${regs[0] || ''};`);
    }
  }

  return out.length > 0
    ? out.join('\n')
    : '// Sir, valid Smali instructions paste karein pseudocode generate karne ke liye.';
}
