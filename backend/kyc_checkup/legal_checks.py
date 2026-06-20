from kyc_checkup.utils.normalization import normalize_legal_name, normalize_registry_value


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

    return normalize_registry_value(previous_legal_form) != normalize_registry_value(
        current_legal_form
    )


def has_jurisdiction_changed(
    previous_jurisdiction: str | None,
    current_jurisdiction: str | None,
) -> bool:
    if not previous_jurisdiction or not current_jurisdiction:
        return False

    return normalize_registry_value(previous_jurisdiction) != normalize_registry_value(
        current_jurisdiction
    )


def has_registered_address_changed(
    previous_address: str | None,
    current_address: str | None,
) -> bool:
    if not previous_address or not current_address:
        return False

    return normalize_registry_value(previous_address) != normalize_registry_value(
        current_address
    )


def has_registry_status_changed(
    previous_status: str | None,
    current_status: str | None,
) -> bool:
    if not previous_status or not current_status:
        return False

    return normalize_registry_value(previous_status) != normalize_registry_value(current_status)


def has_legal_identifier_changed(
    previous_identifier: str | None,
    current_identifier: str | None,
) -> bool:
    if not previous_identifier or not current_identifier:
        return False

    return normalize_registry_value(previous_identifier) != normalize_registry_value(
        current_identifier
    )
