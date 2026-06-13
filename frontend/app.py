import json

import requests
import streamlit as st

BACKEND_URL = "http://localhost:8000/analyze"
LLM_URL = "http://localhost:8000/llm/analyze"

st.title("Hackathon Demo Starter")
st.write("Enter text and submit it to the FastAPI backend for a structured response.")

text_input = st.text_area("Input text", height=200)

if st.button("Analyze Text"):
    if not text_input.strip():
        st.warning("Please enter some text before submitting.")
    else:
        with st.spinner("Sending text to backend..."):
            try:
                response = requests.post(BACKEND_URL, json={"text": text_input})
                response.raise_for_status()
                data = response.json()
                st.success("Response received")
                st.json(data)
            except requests.RequestException as exc:
                st.error(f"Backend request failed: {exc}")
            except json.JSONDecodeError:
                st.error("Failed to decode backend response.")


st.header("LLM Text Analysis")
st.write("Tasks: summarize, extract_keywords, continue, rewrite_clearer. Default provider is mock.")
llm_text = st.text_area("LLM input text", height=200, key="llm_text")
task = st.selectbox("Task", options=["summarize", "extract_keywords", "continue", "rewrite_clearer"], index=0)

if st.button("Run LLM Analysis"):
    if not llm_text.strip():
        st.warning("Please enter some text for LLM analysis.")
    else:
        with st.spinner("Calling LLM backend..."):
            try:
                resp = requests.post(LLM_URL, json={"text": llm_text, "task": task})
                resp.raise_for_status()
                data = resp.json()
                st.success("LLM response received")
                st.markdown(f"**Provider:** {data.get('provider')}")
                st.markdown(f"**Task:** {data.get('task')}")
                st.text_area("Result", value=data.get("result", ""), height=200)
            except requests.RequestException as exc:
                st.error(f"LLM backend request failed: {exc}")
            except json.JSONDecodeError:
                st.error("Failed to decode LLM backend response.")
