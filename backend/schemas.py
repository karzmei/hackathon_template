from typing import Literal

from pydantic import BaseModel, Field


OutputType = Literal["summary"]
Tone = Literal["neutral", "concise", "client-friendly"]


class AnalyzeRequest(BaseModel):
    text: str = Field(..., title="Input text", min_length=1)
    output_type: OutputType = Field("summary", title="Output type")
    tone: Tone = Field("neutral", title="Tone")


class AnalyzeResponse(BaseModel):
    output_type: OutputType
    tone: Tone
    result: str
    provider: str
    model: str
