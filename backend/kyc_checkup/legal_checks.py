import re
import unicodedata


def normalize_legal_name(name: str) -> str:
    name = unicodedata.normalize("NFKC", name)
    name = name.casefold()
    name = re.sub(r"[^\w\s]", " ", name)  # punctuation -> space
    name = re.sub(r"\s+", " ", name)      # collapse whitespace
    return name.strip()


def has_legal_name_changed(
    previous_legal_name: str | None,
    current_legal_name: str | None,
) -> bool:
    if not previous_legal_name or not current_legal_name:
        return False

    return normalize_legal_name(previous_legal_name) != normalize_legal_name(current_legal_name)


def has_legal_form_changed(
    previous_legal_form: str | None,
    current_legal_form: str | None,
) -> bool:
    if not previous_legal_form or not current_legal_form:
        return False

    return previous_legal_form.strip().casefold() != current_legal_form.strip().casefold()