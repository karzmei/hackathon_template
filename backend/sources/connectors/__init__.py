"""Public-plane connectors: one module per external source.

Each module exposes `fetch(client_id: str) -> list[Signal]` and maps that source's
data to normalised `Signal` records. Adding a source means adding a file here and
registering it in `sources/public_source.py`; no other file needs to change.

Data-plane rule: nothing in this package may import the private baseline source.
"""
