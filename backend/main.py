
from fastapi import FastAPI, HTTPException

from backend.schemas import TextRequest, TextResponse, LLMRequest, LLMResponse
from backend.services.llm_service import LLMService


app = FastAPI(title="Hackathon Demo API")


@app.post("/analyze", response_model=TextResponse)
def analyze_text(request: TextRequest) -> TextResponse:
    text = request.text.strip()
    return TextResponse(
        original_text=text,
        word_count=len(text.split()) if text else 0,
        character_count=len(text),
    )


@app.get("/health")
def health():
    return {"status": "ok"}



@app.post("/llm/analyze", response_model=LLMResponse)
def llm_analyze(request: LLMRequest) -> LLMResponse:
    text = request.text or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="text must be non-empty")

    try:
        service = LLMService()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    result = service.analyze(text, request.task)
    # Ensure keys match LLMResponse
    return LLMResponse(**result)
