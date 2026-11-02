"""
JARVIS AI — Native Android Application (Python + Kivy)
Crimson Tactical Theme (#0A0406 background, #DC2626 / #EF4444 accents)
"""
import os
import threading
from kivy.app import App
from kivy.clock import mainthread
from kivy.core.window import Window
from kivy.lang import Builder
from kivy.properties import BooleanProperty, StringProperty, ListProperty
from kivy.uix.screenmanager import ScreenManager, Screen, FadeTransition

from app.database import JarvisDatabase
from app.gemini_client import GeminiClient
from app.smali_analyzer import SmaliAnalyzer, DiffEngine
from app.android_bridges import AndroidVoiceBridge, AndroidTTSBridge

# Mobile portrait red theme defaults
Window.clearcolor = (0.04, 0.015, 0.024, 1)

KV_LAYOUT = '''
#:kivy 2.3.0

<ChatScreen>:
    BoxLayout:
        orientation: 'vertical'
        padding: dp(10)
        spacing: dp(8)
        canvas.before:
            Color:
                rgba: 0.04, 0.015, 0.024, 1
            Rectangle:
                pos: self.pos
                size: self.size

        # Top Header Bar with Mandatory Speech Toggle
        BoxLayout:
            size_hint_y: None
            height: dp(48)
            spacing: dp(8)
            Label:
                text: "JARVIS AI · " + app.selected_model
                bold: True
                color: 0.98, 0.91, 0.93, 1
                halign: 'left'
                valign: 'middle'
                text_size: self.size
            Button:
                text: "Speech: ON" if app.speech_enabled else "Speech: OFF"
                size_hint_x: None
                width: dp(115)
                background_normal: ''
                background_color: (0.86, 0.15, 0.15, 1) if app.speech_enabled else (0.15, 0.05, 0.07, 1)
                color: 1, 1, 1, 1
                on_release: app.toggle_speech()

        # Scrollable Chat Transcript
        ScrollView:
            id: chat_scroll
            BoxLayout:
                orientation: 'vertical'
                size_hint_y: None
                height: self.minimum_height
                padding: dp(6)
                spacing: dp(8)
                Label:
                    text: app.chat_transcript
                    size_hint_y: None
                    height: self.texture_size[1] + dp(16)
                    text_size: self.width - dp(12), None
                    color: 0.98, 0.91, 0.93, 1
                    markup: True

        # Input Composer Bar
        BoxLayout:
            size_hint_y: None
            height: dp(52)
            spacing: dp(6)
            Button:
                text: "MIC"
                size_hint_x: None
                width: dp(54)
                background_normal: ''
                background_color: 0.22, 0.06, 0.09, 1
                on_release: app.start_voice_input()
            TextInput:
                id: prompt_input
                hint_text: "Ask JARVIS in Hinglish or paste Smali, Sir..."
                multiline: True
                background_color: 0.07, 0.02, 0.04, 1
                foreground_color: 1, 1, 1, 1
                cursor_color: 0.93, 0.26, 0.26, 1
            Button:
                text: "SEND"
                size_hint_x: None
                width: dp(72)
                background_normal: ''
                background_color: 0.86, 0.15, 0.15, 1
                bold: True
                on_release: app.send_prompt(prompt_input.text); prompt_input.text = ""

        # Bottom Navigation
        BoxLayout:
            size_hint_y: None
            height: dp(46)
            spacing: dp(4)
            Button:
                text: "Chat"
                background_normal: ''
                background_color: 0.86, 0.15, 0.15, 1
                on_release: app.switch_screen('chat')
            Button:
                text: "Smali Tools"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('tools')
            Button:
                text: "Editor"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('editor')
            Button:
                text: "Settings"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('settings')

<ToolsScreen>:
    BoxLayout:
        orientation: 'vertical'
        padding: dp(10)
        spacing: dp(8)
        Label:
            text: "SMALI FALSE-CONDITION & OPCODE ANALYZER"
            size_hint_y: None
            height: dp(36)
            bold: True
            color: 0.97, 0.44, 0.44, 1
        TextInput:
            id: smali_input
            text: app.sample_smali
            font_name: 'RobotoMono-Regular'
            background_color: 0.05, 0.01, 0.02, 1
            foreground_color: 0.99, 0.9, 0.92, 1
        BoxLayout:
            size_hint_y: None
            height: dp(42)
            spacing: dp(6)
            Button:
                text: "Analyze False Condition"
                background_normal: ''
                background_color: 0.86, 0.15, 0.15, 1
                on_release: app.run_false_condition_analysis(smali_input.text)
            Button:
                text: "Explain Opcodes"
                background_normal: ''
                background_color: 0.22, 0.06, 0.09, 1
                on_release: app.run_opcode_explainer(smali_input.text)
            Button:
                text: "Back to Chat"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('chat')
        ScrollView:
            Label:
                text: app.smali_analysis_output
                size_hint_y: None
                height: self.texture_size[1] + dp(12)
                text_size: self.width - dp(12), None
                color: 0.98, 0.91, 0.93, 1

<EditorScreen>:
    BoxLayout:
        orientation: 'vertical'
        padding: dp(10)
        spacing: dp(8)
        Label:
            text: "INTEGRATED SMALI EDITOR & DIFF APPROVAL"
            size_hint_y: None
            height: dp(36)
            bold: True
            color: 0.97, 0.44, 0.44, 1
        TextInput:
            id: editor_box
            text: app.editor_code
            on_text: app.editor_code = self.text
            background_color: 0.05, 0.01, 0.02, 1
            foreground_color: 0.99, 0.9, 0.92, 1
        BoxLayout:
            size_hint_y: None
            height: dp(42)
            spacing: dp(6)
            Button:
                text: "Propose True Patch"
                background_normal: ''
                background_color: 0.86, 0.15, 0.15, 1
                on_release: app.propose_editor_patch()
            Button:
                text: "Apply Patch"
                background_normal: ''
                background_color: 0.2, 0.5, 0.25, 1
                on_release: app.apply_editor_patch()
            Button:
                text: "Back"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('chat')
        Label:
            text: app.diff_preview_text
            size_hint_y: None
            height: dp(110)
            text_size: self.width - dp(12), None
            color: 0.95, 0.75, 0.78, 1

<SettingsScreen>:
    BoxLayout:
        orientation: 'vertical'
        padding: dp(10)
        spacing: dp(8)
        Label:
            text: "SETTINGS · GEMINI API & CUSTOM INSTRUCTIONS"
            size_hint_y: None
            height: dp(36)
            bold: True
            color: 0.97, 0.44, 0.44, 1
        TextInput:
            id: api_key_box
            text: app.api_key
            password: True
            hint_text: "Enter Google Gemini API Key..."
            size_hint_y: None
            height: dp(44)
            background_color: 0.06, 0.02, 0.03, 1
            foreground_color: 1, 1, 1, 1
        TextInput:
            id: instructions_box
            text: app.custom_instructions
            hint_text: "Custom JARVIS instructions..."
            background_color: 0.06, 0.02, 0.03, 1
            foreground_color: 1, 1, 1, 1
        BoxLayout:
            size_hint_y: None
            height: dp(44)
            spacing: dp(6)
            Button:
                text: "Save & Validate Key"
                background_normal: ''
                background_color: 0.86, 0.15, 0.15, 1
                on_release: app.save_settings(api_key_box.text, instructions_box.text)
            Button:
                text: "Back to Chat"
                background_normal: ''
                background_color: 0.15, 0.05, 0.07, 1
                on_release: app.switch_screen('chat')
'''


class ChatScreen(Screen):
    pass


class ToolsScreen(Screen):
    pass


class EditorScreen(Screen):
    pass


class SettingsScreen(Screen):
    pass


class JarvisAIApp(App):
    speech_enabled = BooleanProperty(True)
    selected_model = StringProperty("gemini-3.8-flash")
    api_key = StringProperty("")
    custom_instructions = StringProperty(
        "You are JARVIS, my personal AI assistant. Address me as Sir. Explain technical topics in simple Hinglish."
    )
    chat_transcript = StringProperty(
        "[b]JARVIS:[/b] Welcome back, Sir. Crimson Android Modding Assistant is online.\n"
    )
    sample_smali = StringProperty(
        ".method public isPremium()Z\n    .locals 1\n    const/4 v0, 0x0\n    if-eqz v0, :cond_ok\n    return v0\n    :cond_ok\n    const/4 v0, 0x1\n    return v0\n.end method"
    )
    smali_analysis_output = StringProperty("Tap Analyze False Condition or Explain Opcodes above.")
    editor_code = StringProperty("")
    proposed_patch = StringProperty("")
    diff_preview_text = StringProperty("No pending diff. Tap Propose True Patch to inspect changes.")

    def build(self):
        self.title = "JARVIS AI"
        db_path = os.path.join(self.user_data_dir, "jarvis_ai.sqlite3")
        self.db = JarvisDatabase(db_path)
        self.api_key = self.db.get_setting("api_key", "")
        self.selected_model = self.db.get_setting("selected_model", "gemini-3.8-flash")
        self.speech_enabled = self.db.get_setting("speech_enabled", "1") == "1"
        self.custom_instructions = self.db.get_setting(
            "custom_instructions", self.custom_instructions
        )
        self.editor_code = self.sample_smali

        self.gemini = GeminiClient(api_key=self.api_key)
        self.smali_analyzer = SmaliAnalyzer()
        self.diff_engine = DiffEngine()
        self.tts = AndroidTTSBridge()
        self.voice_input = AndroidVoiceBridge(on_result_callback=self.on_voice_recognized)

        Builder.load_string(KV_LAYOUT)
        self.sm = ScreenManager(transition=FadeTransition(duration=0.12))
        self.sm.add_widget(ChatScreen(name="chat"))
        self.sm.add_widget(ToolsScreen(name="tools"))
        self.sm.add_widget(EditorScreen(name="editor"))
        self.sm.add_widget(SettingsScreen(name="settings"))
        return self.sm

    def switch_screen(self, screen_name: str):
        self.sm.current = screen_name

    def toggle_speech(self):
        self.speech_enabled = not self.speech_enabled
        self.db.set_setting("speech_enabled", "1" if self.speech_enabled else "0")
        if not self.speech_enabled:
            self.tts.stop()

    def start_voice_input(self):
        self.voice_input.start_listening()

    @mainthread
    def on_voice_recognized(self, text: str):
        if text:
            self.send_prompt(text)

    def send_prompt(self, text: str):
        cleaned = (text or "").strip()
        if not cleaned:
            return
        self.chat_transcript += f"\n[b]Sir:[/b] {cleaned}\n"
        self.db.save_message("default", "user", cleaned, self.selected_model)

        def worker():
            reply = self.gemini.generate_response(
                prompt=cleaned,
                model=self.selected_model,
                system_instruction=self.custom_instructions,
            )
            self._deliver_reply(reply)

        threading.Thread(target=worker, daemon=True).start()

    @mainthread
    def _deliver_reply(self, reply: str):
        self.chat_transcript += f"\n[b]JARVIS:[/b] {reply}\n"
        self.db.save_message("default", "assistant", reply, self.selected_model)
        if self.speech_enabled:
            self.tts.speak_concise(reply)

    def run_false_condition_analysis(self, code: str):
        report = self.smali_analyzer.analyze_false_conditions(code)
        self.smali_analysis_output = report["summary"]

    def run_opcode_explainer(self, code: str):
        lines = self.smali_analyzer.explain_lines(code)
        self.smali_analysis_output = "\n".join(lines)

    def propose_editor_patch(self):
        report = self.smali_analyzer.analyze_false_conditions(self.editor_code)
        self.proposed_patch = report["patched_code"]
        self.diff_preview_text = self.diff_engine.unified_diff(
            self.editor_code, self.proposed_patch
        )

    def apply_editor_patch(self):
        if self.proposed_patch:
            self.editor_code = self.proposed_patch
            self.proposed_patch = ""
            self.diff_preview_text = "Patch applied, Sir."

    def save_settings(self, key: str, instructions: str):
        self.api_key = key.strip()
        self.custom_instructions = instructions.strip()
        self.gemini.set_api_key(self.api_key)
        self.db.set_setting("api_key", self.api_key)
        self.db.set_setting("custom_instructions", self.custom_instructions)


if __name__ == "__main__":
    JarvisAIApp().run()
