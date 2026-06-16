This repo was created in close collaboration with github copilot and codex. :]

# Hackathon Demo Template

A minimal AI/data prototype starter with a Streamlit frontend and FastAPI backend.

## Quick start

Use `make` to manage the development environment:

```bash
make install    # One-time setup: create venv and install dependencies
make backend    # Terminal 1: start FastAPI backend
make frontend   # Terminal 2: start Streamlit frontend
make test       # Run smoke tests
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

## Environment

Copy `.env.example` to `.env` and set your OpenRouter credentials:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=your-openrouter-model
```

The API key is read only by the FastAPI backend and is never sent to the Streamlit frontend.

## Try It

Open `http://localhost:8501` in your browser. Paste messy notes, choose a tone, and click "Generate Summary".

Example input:

```text
Met Sarah from Acme. They need onboarding docs by Friday. Pricing is unclear.
Ask Alex about enterprise plan. Sarah cares about security review and timeline.
Next call maybe Tuesday afternoon.
```

The backend calls OpenRouter once and returns a markdown result with a summary and open questions.

## File structure

- `backend/schemas.py` — Pydantic request/response models
- `backend/main.py` — FastAPI app with `/analyze`
- `backend/llm_client.py` — OpenRouter chat-completions helper
- `frontend/app.py` — Streamlit app sending text to the backend
