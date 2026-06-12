import json

import requests
import streamlit as st

BACKEND_URL = "http://localhost:8000/analyze"

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
