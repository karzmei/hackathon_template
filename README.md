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

## Try It

Open `http://localhost:8501` in your browser. Enter text, click "Analyze Text", and you should see a JSON response with word count and character count.

## LLM Analysis

The project includes a small LLM analysis endpoint at `POST /llm/analyze` with the following supported tasks:

- `summarize`
- `extract_keywords`
- `continue`
- `rewrite_clearer`

By default the backend uses a deterministic `mock` provider and requires no API keys. You can also copy `.env.example` to `.env` and adjust the values there. To use OpenAI as the provider, set the environment variables before starting the backend:

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY="your_api_key_here"
# optional
export OPENAI_MODEL="gpt-4o-mini"
uvicorn backend.main:app --reload --port 8000
```

Then use the Streamlit "LLM Text Analysis" UI to pick a task and run it. If `LLM_PROVIDER` is not set or is `mock`, the app will run locally without any API keys.

## File structure

- `backend/schemas.py` — Pydantic request/response models
- `backend/main.py` — FastAPI app with `/analyze` and `/llm/analyze` endpoints
- `backend/services/llm_service.py` — small mock/OpenAI LLM wrapper
- `frontend/app.py` — Streamlit app sending text to the backend
