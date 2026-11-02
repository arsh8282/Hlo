import unittest
from app.database import JarvisDatabase
from app.gemini_client import GeminiClient, redact_api_key
from app.smali_analyzer import SmaliAnalyzer, DiffEngine
from app.android_bridges import strip_code_for_speech


class TestJarvisPythonCore(unittest.TestCase):
    def test_database_settings_and_messages(self):
        db = JarvisDatabase(":memory:")
        db.set_setting("speech_enabled", "1")
        self.assertEqual(db.get_setting("speech_enabled"), "1")

        db.save_message("conv1", "user", "Explain if-eqz v0", "gemini-3.8-flash")
        db.save_message("conv1", "assistant", "Sir, if-eqz checks zero.", "gemini-3.8-flash")
        msgs = db.get_messages("conv1")
        self.assertEqual(len(msgs), 2)
        self.assertEqual(len(db.search_conversations("if-eqz")), 1)

    def test_gemini_payload_and_redaction(self):
        client = GeminiClient(api_key="AIzaSyDummyKeyForUnitTest123456789012345")
        payload = client.build_generate_payload(
            prompt="Check false condition",
            system_instruction="Address me as Sir",
        )
        self.assertIn("system_instruction", payload)
        self.assertEqual(payload["contents"][0]["role"], "user")
        redacted = redact_api_key("Error with key AIzaSyDummyKeyForUnitTest123456789012345")
        self.assertIn("[REDACTED_KEY]", redacted)

    def test_smali_false_condition_and_diff(self):
        analyzer = SmaliAnalyzer()
        sample = ".method public check()Z\n    .locals 1\n    const/4 v0, 0x0\n    if-eqz v0, :cond_1\n    return v0\n.end method"
        report = analyzer.analyze_false_conditions(sample)
        self.assertEqual(len(report["branches"]), 1)
        self.assertIn("const/4 v0, 0x1", report["patched_code"])

        diff = DiffEngine().unified_diff(sample, report["patched_code"])
        self.assertIn("-    const/4 v0, 0x0", diff)
        self.assertIn("+    const/4 v0, 0x1", diff)

    def test_strip_code_for_speech(self):
        text = "Sir, change this line:\n```smali\nconst/4 v0, 0x1\n```\nDone."
        spoken = strip_code_for_speech(text)
        self.assertNotIn("const/4 v0, 0x1", spoken)
        self.assertIn("Sir, change this line", spoken)


if __name__ == "__main__":
    unittest.main()
