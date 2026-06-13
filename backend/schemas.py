from pydantic import BaseModel, Field
from typing import Literal, Optional


class TextRequest(BaseModel):
    text: str = Field(..., title="Input text", min_length=1)


class TextResponse(BaseModel):
    original_text: str = Field(..., title="Original text")
    word_count: int = Field(..., title="Word count")
    character_count: int = Field(..., title="Character count")


# LLM schemas
LLMTask = Literal["summarize", "extract_keywords", "continue", "rewrite_clearer"]


class LLMRequest(BaseModel):
    text: str = Field(..., title="Input text", min_length=1)
    task: LLMTask = Field(..., title="Analysis task")


class LLMResponse(BaseModel):
    task: LLMTask
    result: str
    provider: str
