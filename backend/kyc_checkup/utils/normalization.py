import re
import unicodedata


def normalize_legal_name(name: str) -> str:
    name = unicodedata.normalize("NFKC", name)
    name = name.casefold()
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def normalize_registry_value(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"[^\w]", "", value)
