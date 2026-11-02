"""
Reusable Google Gemini API Client for Python / Kivy Android packaging.
Uses official v1beta Models and generateContent REST endpoints with key redaction.
"""
import re
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional


GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def redact_api_key(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"AIza[0-9A-Za-z\-_]{35}", "[REDACTED_KEY]", text)


class GeminiClient:
    def __init__(self, api_key: str = "", timeout: int = 25):
        self.api_key = (api_key or "").strip()
        self.timeout = timeout

    def set_api_key(self, api_key: str) -> None:
        self.api_key = (api_key or "").strip()

    def build_generate_payload(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        image_base64: Optional[str] = None,
        image_mime: str = "image/png",
    ) -> Dict[str, Any]:
        contents: List[Dict[str, Any]] = []
        if history:
            for item in history[-10:]:
                role = "model" if item.get("role") == "assistant" else "user"
                contents.append({"role": role, "parts": [{"text": item.get("content", "")}]})

        user_parts: List[Dict[str, Any]] = []
        if image_base64:
            clean_b64 = image_base64.split(",")[-1]
            user_parts.append({"inline_data": {"mime_type": image_mime, "data": clean_b64}})
        if prompt:
            user_parts.append({"text": prompt})

        contents.append({"role": "user", "parts": user_parts})

        payload: Dict[str, Any] = {"contents": contents}
        if system_instruction:
            payload["system_instruction"] = {"parts": [{"text": system_instruction}]}
        return payload

    def list_models(self) -> List[Dict[str, Any]]:
        if not self.api_key:
            raise ValueError("Sir, Google Gemini API key is required.")
        url = f"{GEMINI_API_BASE}/models?key={self.api_key}"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = []
                for m in data.get("models", []):
                    name = m.get("name", "").replace("models/", "")
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        models.append(
                            {
                                "id": name,
                                "displayName": m.get("displayName", name),
                                "description": m.get("description", ""),
                                "inputTokenLimit": m.get("inputTokenLimit", 1048576),
                                "outputTokenLimit": m.get("outputTokenLimit", 8192),
                            }
                        )
                return models
        except Exception as exc:
            raise RuntimeError(redact_api_key(str(exc))) from exc

    def generate_response(
        self,
        prompt: str,
        model: str = "gemini-3.8-flash",
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        if not self.api_key:
            return "Sir, please configure your Google Gemini API key in Settings first."
        clean_model = model.replace("models/", "")
        url = f"{GEMINI_API_BASE}/models/{clean_model}:generateContent?key={self.api_key}"
        payload = self.build_generate_payload(
            prompt=prompt,
            system_instruction=system_instruction,
            history=history,
            image_base64=image_base64,
        )
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if not candidates:
                    return "Sir, no response candidates were returned by the model."
                parts = candidates[0].get("content", {}).get("parts", [])
                texts = [p.get("text", "") for p in parts if "text" in p]
                return "\n".join(texts).strip()
        except Exception as exc:
            return f"Sir, Gemini API error: {redact_api_key(str(exc))}"
