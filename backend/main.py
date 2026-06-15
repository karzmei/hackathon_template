from fastapi import FastAPI, HTTPException

from backend.llm_client import summarize_notes
from backend.schemas import AnalyzeRequest, AnalyzeResponse


app = FastAPI(title="Hackathon Demo API")


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_text(request: AnalyzeRequest) -> AnalyzeResponse:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must be non-empty")

    try:
        result = summarize_notes(
            text=text,
            output_type=request.output_type,
            tone=request.tone,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(**result)


@app.get("/health")
def health():
    return {"status": "ok"}
