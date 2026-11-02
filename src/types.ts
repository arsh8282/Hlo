export interface GeminiModelInfo {
  id: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedActions: string[];
  supportsVision: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  imagePreview?: string;
  isError?: boolean;
}

export interface ConversationRecord {
  id: string;
  title: string;
  updatedAt: string;
  model: string;
  messages: ChatMessage[];
}

export interface JarvisSettings {
  apiKey: string;
  selectedModel: string;
  speechEnabled: boolean;
  voiceLanguage: 'en-IN' | 'hi-IN' | 'en-US';
  screenAwarenessEnabled: boolean;
  floatingAssistantEnabled: boolean;
  customInstructions: string;
  responseDepth: 'concise' | 'balanced' | 'deep';
  preferredLanguage: 'Hinglish' | 'Hindi' | 'English';
  onboardingCompleted: boolean;
}

export const DEFAULT_CUSTOM_INSTRUCTIONS =
  'You are JARVIS, my personal AI assistant. Address me as Sir. Explain technical topics in simple Hinglish unless I request another language. Prioritize Android development, APK modding, Smali debugging, and accurate step-by-step explanations. Analyze the actual code before suggesting changes. Keep answers organized and explain what each important Smali instruction does.';

export const DEFAULT_SMALI_EDITOR_CODE = `.class public Lcom/jarvis/mod/SecurityValidator;
.super Ljava/lang/Object;
.source "SecurityValidator.java"

# instance fields
.field private isProActive:Z

.method public verifyDeviceAccess(Ljava/lang/String;I)Z
    .locals 3
    .param p1, "licenseToken"    # Ljava/lang/String;
    .param p2, "buildVersion"    # I

    const/4 v0, 0x0

    if-eqz p1, :cond_fail

    invoke-virtual {p1}, Ljava/lang/String;->length()I
    move-result v1

    const/16 v2, 0x10
    if-eq v1, v2, :cond_fail

    iget-boolean v0, p0, Lcom/jarvis/mod/SecurityValidator;->isProActive:Z
    if-eqz v0, :cond_fail

    const/4 v0, 0x1
    return v0

    :cond_fail
    const/4 v0, 0x0
    return v0
.end method`;

export const DEFAULT_SAMPLE_LOGCAT = `E/AndroidRuntime(28412): FATAL EXCEPTION: main
E/AndroidRuntime(28412): Process: com.target.modapp, PID: 28412
E/AndroidRuntime(28412): java.lang.VerifyError: Verifier rejected class com.jarvis.mod.SecurityValidator: boolean com.jarvis.mod.SecurityValidator.verifyDeviceAccess(java.lang.String, int) failed to verify: register v3 has type Undefined
E/AndroidRuntime(28412):     at com.target.modapp.MainActivity.onCreate(MainActivity.java:74)
E/AndroidRuntime(28412):     at android.app.Activity.performCreate(Activity.java:8591)`;
