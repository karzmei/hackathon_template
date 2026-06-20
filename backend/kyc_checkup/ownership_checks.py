from schemas import Owner

from kyc_checkup.utils.normalization import normalize_legal_name


def _owners_by_name(owners: list[Owner]) -> dict[str, Owner]:
    return {normalize_legal_name(owner.name): owner for owner in owners}


def has_new_owner(
    previous_owners: list[Owner],
    current_owners: list[Owner],
) -> bool:
    previous_names = set(_owners_by_name(previous_owners))
    current_names = set(_owners_by_name(current_owners))
    return bool(current_names - previous_names)


def has_owner_been_removed(
    previous_owners: list[Owner],
    current_owners: list[Owner],
) -> bool:
    previous_names = set(_owners_by_name(previous_owners))
    current_names = set(_owners_by_name(current_owners))
    return bool(previous_names - current_names)


def has_ownership_percentage_changed(
    previous_owners: list[Owner],
    current_owners: list[Owner],
) -> bool:
    previous_by_name = _owners_by_name(previous_owners)
    current_by_name = _owners_by_name(current_owners)

    shared_names = previous_by_name.keys() & current_by_name.keys()
    return any(
        previous_by_name[name].pct != current_by_name[name].pct
        for name in shared_names
    )
