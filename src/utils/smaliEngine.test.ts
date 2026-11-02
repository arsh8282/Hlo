import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDalvikTypeDescriptor,
  analyzeSmaliMethods,
  analyzeFalseConditions,
  analyzeRegisters,
  checkSmaliSyntax,
  analyzeLogcatCrash,
  convertSmaliToJavaPseudocode,
} from './smaliEngine';
import { computeLineDiff, buildSpokenSummary } from './diffEngine';

const SAMPLE_SMALI = `.method public isPremiumUnlocked(Ljava/lang/String;I)Z
    .locals 2

    invoke-virtual {p0, p1}, Lcom/example/app/LicenseManager;->checkToken(Ljava/lang/String;)Z
    move-result v0

    if-eqz v0, :cond_premium

    const/4 v1, 0x0
    return v1

    :cond_premium
    const/4 v1, 0x1
    return v1
.end method`;

test('Dalvik descriptor parser decodes primitives, objects, and arrays', () => {
  assert.equal(parseDalvikTypeDescriptor('Z'), 'boolean (true/false — 1 ya 0)');
  assert.equal(parseDalvikTypeDescriptor('Ljava/lang/String;'), 'java.lang.String');
  assert.equal(parseDalvikTypeDescriptor('[I'), 'int (integer number)[]');
});

test('Smali method analyzer extracts signature, p0=this, parameters, and locals', () => {
  const methods = analyzeSmaliMethods(SAMPLE_SMALI);
  assert.equal(methods.length, 1);
  assert.equal(methods[0].methodName, 'isPremiumUnlocked');
  assert.equal(methods[0].isStatic, false);
  assert.equal(methods[0].localsCount, 2);
  assert.equal(methods[0].parameterRegisterMap[0].register, 'p0');
  assert.equal(methods[0].parameterRegisterMap[1].register, 'p1');
  assert.equal(methods[0].parameterRegisterMap[2].register, 'p2');
});

test('False-condition analyzer detects if-eqz branch and generates 0x1 patch', () => {
  const report = analyzeFalseConditions(SAMPLE_SMALI);
  assert.equal(report.hasEvidence, true);
  assert.equal(report.branches.length, 1);
  assert.equal(report.branches[0].opcode, 'if-eqz');
  assert.deepEqual(report.branches[0].testedRegisters, ['v0']);
  assert.equal(report.branches[0].targetLabel, ':cond_premium');
  assert.equal(report.proposedPatchedCode.includes('const/4 v1, 0x1'), true);
});

test('Register analyzer warns when register exceeds declared .locals', () => {
  const badSmali = `.method public test()V
    .locals 1
    const/4 v0, 0x1
    const/4 v2, 0x0
    return-void
.end method`;
  const regReport = analyzeRegisters(badSmali);
  assert.equal(regReport.localsDeclared, 1);
  assert.equal(regReport.warnings.length > 0, true);
});

test('Syntax checker catches missing target labels', () => {
  const brokenSmali = `.method public broken()V
    .locals 1
    const/4 v0, 0x0
    if-eqz v0, :missing_label
    return-void
.end method`;
  const issues = checkSmaliSyntax(brokenSmali);
  assert.equal(issues.some((i) => i.message.includes(':missing_label')), true);
});

test('Logcat crash analyzer identifies VerifyError and stack frames', () => {
  const sampleCrash = `E/AndroidRuntime(14921): java.lang.VerifyError: Verifier rejected class com.app.MainActivity
    at com.app.MainActivity.checkLicense(MainActivity.java:42)`;
  const crash = analyzeLogcatCrash(sampleCrash);
  assert.equal(crash.exceptions.length, 1);
  assert.equal(crash.exceptions[0].type, 'java.lang.VerifyError');
  assert.equal(crash.stackFrames.length, 1);
  assert.equal(crash.stackFrames[0].methodName, 'checkLicense');
});

test('Diff engine calculates added and removed lines accurately', () => {
  const orig = 'const/4 v0, 0x0\nreturn v0';
  const mod = 'const/4 v0, 0x1\nreturn v0';
  const diff = computeLineDiff(orig, mod);
  assert.equal(diff.addedCount, 1);
  assert.equal(diff.removedCount, 1);
  assert.equal(diff.unchangedCount, 1);
});

test('Spoken summary strips fenced code blocks for natural speech', () => {
  const response =
    'Sir, line 8 par `const/4 v1, 0x0` false return kar raha hai.\n```smali\nconst/4 v1, 0x1\nreturn v1\n```\nIsse replace kar dijiye.';
  const spoken = buildSpokenSummary(response);
  assert.equal(spoken.includes('const/4 v1, 0x1'), false);
  assert.equal(spoken.includes('Sir, line 8 par'), true);
});

test('Smali to Java pseudocode generates readable logic', () => {
  const pseudo = convertSmaliToJavaPseudocode(SAMPLE_SMALI);
  assert.equal(pseudo.includes('if (v0 == 0 /* false */) goto :cond_premium;'), true);
});
