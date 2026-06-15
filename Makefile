.PHONY: install backend frontend test venv

install:
	python3 -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

venv:
	bash -c ". .venv/bin/activate && bash"

backend:
	. .venv/bin/activate && uvicorn backend.main:app --reload --port 8000

frontend:
	. .venv/bin/activate && streamlit run frontend/app.py

test:
	. .venv/bin/activate && python -m unittest discover -s tests
