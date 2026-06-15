import json

import requests
import streamlit as st

BACKEND_URL = "http://localhost:8000/analyze"

st.title("Hackathon Demo Starter")
st.write("Paste messy notes and get a structured markdown summary.")

text_input = st.text_area("Input text", height=200)
output_type = st.selectbox("Output type", options=["summary"], index=0)
tone = st.selectbox("Tone", options=["neutral", "concise", "client-friendly"], index=0)

if st.button("Generate Summary"):
    if not text_input.strip():
        st.warning("Please enter some text before submitting.")
    else:
        with st.spinner("Calling OpenRouter..."):
            try:
                response = requests.post(
                    BACKEND_URL,
                    json={
                        "text": text_input,
                        "output_type": output_type,
                        "tone": tone,
                    },
                    timeout=60,
                )
                response.raise_for_status()
                data = response.json()
                st.success("Summary generated")
                st.markdown(data.get("result", ""))
            except requests.RequestException as exc:
                st.error(f"Backend request failed: {exc}")
            except json.JSONDecodeError:
                st.error("Failed to decode backend response.")
