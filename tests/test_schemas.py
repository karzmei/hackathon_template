import pytest
from pydantic import ValidationError

from backend.schemas import LLMRequest


def test_llm_request_rejects_empty_text():
    with pytest.raises(ValidationError):
        LLMRequest(text="", task="summarize")


def test_llm_request_accepts_valid():
    req = LLMRequest(text="Hello", task="summarize")
    assert req.text == "Hello"
    assert req.task == "summarize"
