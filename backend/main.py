from fastapi import FastAPI

from backend.schemas import TextRequest, TextResponse

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
