from pydantic import BaseModel, Field


class TextRequest(BaseModel):
    text: str = Field(..., title="Input text", min_length=1)


class TextResponse(BaseModel):
    original_text: str = Field(..., title="Original text")
    word_count: int = Field(..., title="Word count")
    character_count: int = Field(..., title="Character count")
