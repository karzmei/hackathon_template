# Hackathon Demo Template

A minimal AI/data prototype starter with a Streamlit frontend and FastAPI backend.

## Quick start

Use `make` to manage the development environment:

```bash
make install    # One-time setup: create venv and install dependencies
make backend    # Terminal 1: start FastAPI backend
make frontend   # Terminal 2: start Streamlit frontend
make venv       # Show how to manually activate the virtual environment
```

## Manual run

If you prefer to set up manually:

1. Activate the virtual environment:

```bash
. .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the backend (Terminal 1):

```bash
uvicorn backend.main:app --reload --port 8000
```

4. Start the frontend (Terminal 2):

```bash
streamlit run frontend/app.py
```

## Testing

Open `http://localhost:8501` in your browser. Enter text, click "Analyze Text", and you should see a JSON response with word count and character count.

## File structure

- `backend/schemas.py` — Pydantic request/response models
- `backend/main.py` — FastAPI app with a single `/analyze` endpoint
- `frontend/app.py` — Streamlit app sending text to the backend
