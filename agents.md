# Project instructions for Codex

We are building a reusable hackathon app/demo template.

Main goal:
- Help me quickly build working AI/data/ML prototypes during a hackathon.
- Use a lightweight but reasonable architecture. Separate frontend, backend, schemas, and service logic clearly, but avoid production-level complexity unless it directly helps the demo.

Tech stack:
- Python
- FastAPI backend
- Streamlit frontend
- Pydantic for request/response schemas
- OpenAI/other LLM APIs through a small wrapper
- Pandas/DuckDB or SQLite for simple data handling
- PDF/text ingestion for RAG-style demos
- Plotly for simple charts

Project structure:
- backend/
  - main.py
  - schemas.py
  - services/
- frontend/
  - app.py
- examples/
- .env.example
- README.md
- Makefile or simple run scripts

Coding preferences:
- Keep dependencies minimal.
- Do not add heavy frameworks unless clearly useful.
- Use clear and informative function names and small files.
- Avoid overengineering.
- Prefer boring, robust solutions.
- Add comments only where they clarify non-obvious logic.
- Never hardcode API keys or secrets.
- Use environment variables and provide .env.example.
- When changing code, prefer minimal targeted edits over rewriting everything.

Workflow:
- Before implementing large changes, propose a short plan and file structure.
- After implementing, provide exact run commands.
- Mention likely failure points.
- When debugging, find the minimal fix first.
- Do not silently mock core functionality unless explicitly marked as mock/demo code.

Hackathon priorities:
1. Working demo
2. Clear user flow
3. Reliable enough for live presentation
4. Easy to modify quickly
5. Clean README