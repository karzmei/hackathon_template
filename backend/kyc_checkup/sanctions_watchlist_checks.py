from collections.abc import Collection

from schemas import Owner

from kyc_checkup.utils.normalization import normalize_legal_name


def has_sanctioned_owner(
    owners: list[Owner],
    sanctioned_names: Collection[str],
) -> bool:
    """Check owners against a sanctions list supplied by an external source."""
    normalized_sanctioned_names = {
        normalize_legal_name(name) for name in sanctioned_names
    }
    return any(
        normalize_legal_name(owner.name) in normalized_sanctioned_names
        for owner in owners
    )


def is_company_sanctioned(
    company_name: str,
    sanctioned_names: Collection[str],
) -> bool:
    """Check a company against a sanctions list supplied by an external source."""
    normalized_company_name = normalize_legal_name(company_name)
    return any(
        normalized_company_name == normalize_legal_name(name)
        for name in sanctioned_names
    )
