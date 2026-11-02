"""
PyJNIus Android Native Bridges for SpeechRecognizer, TextToSpeech, MediaProjection, and Floating Overlay.
Gracefully degrades on non-Android host platforms during unit testing.
"""
import re
from typing import Callable, Optional

try:
    from jnius import autoclass
    IS_ANDROID = True
except Exception:
    IS_ANDROID = False


def strip_code_for_speech(text: str) -> str:
    if not text:
        return ""
    without_blocks = re.sub(r"```[\s\S]*?```", " Code block shown on screen, Sir. ", text)
    cleaned = re.sub(r"[`#*_>-]+", " ", without_blocks)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:280]


class AndroidTTSBridge:
    def __init__(self):
        self._tts = None
        if IS_ANDROID:
            try:
                PythonActivity = autoclass("org.kivy.android.PythonActivity")
                TextToSpeech = autoclass("android.speech.tts.TextToSpeech")
                self._tts = TextToSpeech(PythonActivity.mActivity, None)
            except Exception:
                self._tts = None

    def speak_concise(self, text: str) -> str:
        summary = strip_code_for_speech(text)
        if self._tts and IS_ANDROID:
            try:
                TextToSpeech = autoclass("android.speech.tts.TextToSpeech")
                self._tts.speak(summary, TextToSpeech.QUEUE_FLUSH, None, "jarvis_utt")
            except Exception:
                pass
        return summary

    def stop(self) -> None:
        if self._tts and IS_ANDROID:
            try:
                self._tts.stop()
            except Exception:
                pass


class AndroidVoiceBridge:
    def __init__(self, on_result_callback: Optional[Callable[[str], None]] = None):
        self.on_result_callback = on_result_callback

    def start_listening(self) -> bool:
        if not IS_ANDROID:
            return False
        try:
            Intent = autoclass("android.content.Intent")
            RecognizerIntent = autoclass("android.speech.RecognizerIntent")
            PythonActivity = autoclass("org.kivy.android.PythonActivity")
            intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN")
            PythonActivity.mActivity.startActivityForResult(intent, 9001)
            return True
        except Exception:
            return False
