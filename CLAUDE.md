# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A minimal hackathon starter template for AI/data prototypes: a **Streamlit** frontend that posts free-text to a **FastAPI** backend, which calls **OpenRouter** (chat completions) once and returns structured markdown. The current demo turns messy notes into a summary + open questions. It is intentionally small and meant to be forked and extended quickly during a hackathon — favor minimal, targeted edits over rewrites.

## Commands

The `Makefile` targets assume a bash/POSIX shell (`. .venv/bin/activate`). On this Windows machine, run the underlying commands directly in PowerShell instead:

```powershell
python -m venv .venv                              # one-time
.\.venv\Scripts\Activate.ps1                      # activate venv (per shell)
pip install -r requirements.txt                   # install deps

uvicorn backend.main:app --reload --port 8000     # Terminal 1: backend (http://localhost:8000)
streamlit run frontend/app.py                     # Terminal 2: frontend (http://localhost:8501)

python -m unittest discover -s tests              # run all tests
python -m unittest tests.test_backend.BackendSmokeTest.test_health_returns_ok   # single test
```

`make install` / `make backend` / `make frontend` / `make test` work where bash is available.

## Environment

Copy `.env.example` to `.env` and set:

- `OPENROUTER_API_KEY` — `sk-or-v1-...`
- `OPENROUTER_MODEL` — an OpenRouter model id

The key is loaded via `load_dotenv()` in `backend/llm_client.py` and read **only** by the backend; it is never exposed to the Streamlit frontend. Both vars are required at call time — `summarize_notes` raises `RuntimeError` if either is missing, surfaced as an HTTP 500 with the message as `detail`.

## Architecture

Request flow: `frontend/app.py` → `POST /analyze` → `backend/main.py` → `summarize_notes` in `backend/llm_client.py` → OpenRouter → markdown back up the chain.

- **`backend/schemas.py`** — the contract. `OutputType` and `Tone` are `Literal` types; `AnalyzeRequest`/`AnalyzeResponse` are Pydantic models. When adding output types or tones, extend the `Literal`s here first, then the prompt and the frontend `selectbox` options must be kept in sync.
- **`backend/main.py`** — thin FastAPI layer. `/analyze` validates non-empty text and maps `RuntimeError` → `HTTPException(500)`. `/health` returns `{"status": "ok"}`.
- **`backend/llm_client.py`** — the only place that talks to OpenRouter. `build_prompt` constructs the markdown-shaping prompt; `summarize_notes` does a single `requests.post` (temperature 0.2, 60s timeout) and returns a dict matching `AnalyzeResponse` fields. The result `dict` keys must stay aligned with `AnalyzeResponse`.
- **`frontend/app.py`** — Streamlit UI; hardcodes `BACKEND_URL = http://localhost:8000/analyze`. `format_backend_error` unwraps the backend's JSON `detail` for display.

## Conventions

- Keep dependencies minimal (see `requirements.txt`) — no heavy frameworks unless clearly useful.
- Small files, clear function names, comments only for non-obvious logic.
- Tests are smoke-level (`@smoke` style): they call the FastAPI route functions directly (`analyze_text`, `health`) rather than spinning up a server, and patch `os.environ` to test failure paths without hitting OpenRouter.
