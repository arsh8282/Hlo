"""
Static Smali Analyzer, False-Condition Detector, and Line Diff Engine for JARVIS AI.
"""
import re
import difflib
from typing import List, Dict, Any


class SmaliAnalyzer:
    def explain_line(self, raw_line: str, line_no: int) -> str:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            return f"L{line_no}: Comment / blank line"
        if line.startswith(":"):
            return f"L{line_no}: Jump target label {line}"
        opcode = line.split()[0]
        regs = re.findall(r"\b[vp]\d+\b", line)
        if opcode == "if-eqz":
            target = line.split(",")[-1].strip()
            return f"L{line_no}: [if-eqz] Agar {regs[0] if regs else 'reg'} == 0 (false) hai toh {target} par jump karega."
        if opcode == "if-nez":
            target = line.split(",")[-1].strip()
            return f"L{line_no}: [if-nez] Agar {regs[0] if regs else 'reg'} != 0 (true) hai toh {target} par jump karega."
        if opcode.startswith("const"):
            return f"L{line_no}: [const] Register {regs[0] if regs else 'reg'} mein constant value assign kar raha hai."
        if opcode.startswith("invoke-"):
            return f"L{line_no}: [{opcode}] Method invoke ho raha hai with registers {regs}."
        if opcode.startswith("move-result"):
            return f"L{line_no}: [move-result] Pichle method call ka return result {regs[0] if regs else 'reg'} mein store ho raha hai."
        if opcode.startswith("return"):
            return f"L{line_no}: [{opcode}] Method caller ko return kar raha hai."
        return f"L{line_no}: [{opcode}] Instruction using registers {regs}"

    def explain_lines(self, code: str) -> List[str]:
        return [
            self.explain_line(raw, idx + 1)
            for idx, raw in enumerate(code.splitlines())
            if raw.strip()
        ]

    def analyze_false_conditions(self, code: str) -> Dict[str, Any]:
        lines = code.splitlines()
        branches = []
        patched_lines = list(lines)

        for idx, raw in enumerate(lines):
            trimmed = raw.strip()
            if trimmed.startswith("if-eqz ") or trimmed.startswith("if-nez "):
                opcode = trimmed.split()[0]
                regs = re.findall(r"\b[vp]\d+\b", trimmed)
                target = trimmed.split(",")[-1].strip()
                branches.append(
                    {
                        "line": idx + 1,
                        "opcode": opcode,
                        "registers": regs,
                        "target": target,
                        "instruction": trimmed,
                    }
                )
            if re.match(r"^const/4\s+[vp]\d+,\s*0x0\b", trimmed):
                patched_lines[idx] = raw.replace("0x0", "0x1")

        summary = (
            f"Sir, found {len(branches)} conditional branch(es). "
            + "; ".join(
                f"L{b['line']} ({b['opcode']} {', '.join(b['registers'])} -> {b['target']})"
                for b in branches
            )
            if branches
            else "Sir, koi if-eqz / if-nez branch is snippet mein nahi mila."
        )
        return {
            "branches": branches,
            "patched_code": "\n".join(patched_lines),
            "summary": summary,
        }


class DiffEngine:
    def unified_diff(self, original: str, modified: str) -> str:
        diff = list(
            difflib.unified_diff(
                original.splitlines(),
                modified.splitlines(),
                fromfile="Original.smali",
                tofile="Patched.smali",
                lineterm="",
            )
        )
        return "\n".join(diff) if diff else "No line differences detected."
