export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffSummary {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export function computeLineDiff(originalText: string, modifiedText: string): DiffSummary {
  const oldLines = originalText.split(/\r?\n/);
  const newLines = modifiedText.split(/\r?\n/);

  const n = oldLines.length;
  const m = newLines.length;

  // LCS matrix for line-level diff
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldNum++,
        newLineNumber: newNum++,
        content: oldLines[i],
      });
      unchangedCount++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({
        type: 'removed',
        oldLineNumber: oldNum++,
        newLineNumber: null,
        content: oldLines[i],
      });
      removedCount++;
      i++;
    } else {
      lines.push({
        type: 'added',
        oldLineNumber: null,
        newLineNumber: newNum++,
        content: newLines[j],
      });
      addedCount++;
      j++;
    }
  }

  while (i < n) {
    lines.push({
      type: 'removed',
      oldLineNumber: oldNum++,
      newLineNumber: null,
      content: oldLines[i++],
    });
    removedCount++;
  }

  while (j < m) {
    lines.push({
      type: 'added',
      oldLineNumber: null,
      newLineNumber: newNum++,
      content: newLines[j++],
    });
    addedCount++;
  }

  return {
    lines,
    addedCount,
    removedCount,
    unchangedCount,
  };
}

/**
 * Extracts a concise natural-language summary suitable for Android TextToSpeech
 * so JARVIS never reads huge blocks of Smali opcodes, stack traces, or source code verbatim.
 */
export function buildSpokenSummary(markdownText: string): string {
  if (!markdownText) return '';
  // Remove fenced code blocks completely from spoken output
  const withoutCode = markdownText.replace(/```[\s\S]*?```/g, ' [Code snippet displayed on screen, Sir.] ');
  // Remove inline code backticks and markdown formatting symbols
  const cleaned = withoutCode
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Keep spoken output concise (up to 280 chars or first 2 sentences)
  const sentences = cleaned.split(/(?<=[.!?।])\s+/);
  const shortText = sentences.slice(0, 3).join(' ');
  return shortText.length > 320 ? `${shortText.slice(0, 317)}...` : shortText;
}
