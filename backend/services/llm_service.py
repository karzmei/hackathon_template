import os

from dotenv import load_dotenv

from backend.schemas import LLMTask

load_dotenv()


class LLMService:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "mock")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if self.provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY not set for openai provider")
            try:
                from openai import OpenAI

                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                raise RuntimeError(f"Failed to import OpenAI SDK: {e}")
        else:
            self.client = None

    def analyze(self, text: str, task: LLMTask) -> dict:
        if self.provider == "openai":
            return self._analyze_openai(text, task)
        return self._analyze_mock(text, task)

    def _analyze_mock(self, text: str, task: LLMTask) -> dict:
        # Deterministic placeholder logic for demo / tests
        text = text.strip()
        if task == "summarize":
            # return first 120 chars or first sentence
            result = text.split(".\n")[0]
            if len(result) > 120:
                result = result[:117] + "..."
            return {"task": task, "result": result or "", "provider": "mock"}

        if task == "extract_keywords":
            words = [w.strip('.,!?()[]\n"').lower() for w in text.split() if w.isalpha() or w.isalnum()]
            # simple frequency
            freq = {}
            for w in words:
                freq[w] = freq.get(w, 0) + 1
            keywords = sorted(freq.keys(), key=lambda k: (-freq[k], k))[:5]
            return {"task": task, "result": ", ".join(keywords) if keywords else "", "provider": "mock"}

        if task == "continue":
            # append a deterministic phrase
            result = text + "\n\n[continued] " + (text[:60] + "...")
            return {"task": task, "result": result, "provider": "mock"}

        if task == "rewrite_clearer":
            # simple cleanups
            result = " ".join(text.split())
            return {"task": task, "result": result, "provider": "mock"}

        return {"task": task, "result": "", "provider": "mock"}

    def _analyze_openai(self, text: str, task: LLMTask) -> dict:
        prompt_map = {
            "summarize": f"Summarize the following text in a concise paragraph:\n\n{text}",
            "extract_keywords": f"Extract up to 10 keywords from the following text, separated by commas:\n\n{text}",
            "continue": f"Continue the following text coherently for a short paragraph:\n\n{text}",
            "rewrite_clearer": f"Rewrite the following text to be clearer and more concise:\n\n{text}",
        }
        prompt = prompt_map.get(task, text)
        try:
            resp = self.client.responses.create(model=self.model, input=prompt)
            # Use response.output_text when available
            result_text = getattr(resp, "output_text", None)
            if not result_text:
                # Fallback extraction
                parts = getattr(resp, "output", [])
                if parts and isinstance(parts, list):
                    # join text parts
                    texts = []
                    for item in parts:
                        for c in item.get("content", []):
                            if c.get("type") == "output_text":
                                texts.append(c.get("text", ""))
                    result_text = "\n".join(texts)
            if not result_text:
                result_text = ""
            return {"task": task, "result": result_text, "provider": "openai"}
        except Exception as e:
            return {"task": task, "result": f"openai_error: {e}", "provider": "openai"}
