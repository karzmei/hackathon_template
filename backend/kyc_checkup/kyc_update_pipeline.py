from __future__ import annotations

from collections.abc import Collection
from datetime import datetime

from schemas import AlertStatus, RecommendedAction, RiskBand
from kyc_checkup.kyc_schemas import (
    CheckType,
    KycBaselineProfile,
    TriggerAlert,
    TriggerRequest,
    WebsiteChangeRequest,
)
from kyc_checkup.legal_checks import (
    has_jurisdiction_changed,
    has_legal_form_changed,
    has_legal_identifier_changed,
    has_legal_name_changed,
    has_registered_address_changed,
    has_registry_status_changed,
)
from kyc_checkup.ownership_checks import (
    has_new_owner,
    has_owner_been_removed,
    has_ownership_percentage_changed,
)
from kyc_checkup.sanctions_watchlist_checks import (
    has_sanctioned_owner,
    is_company_sanctioned,
)
from kyc_checkup.website_domain_checks import analyze_website_change


def process_trigger(
    trigger: TriggerRequest,
    check_groups: list[CheckType],
    baseline: KycBaselineProfile,
    current: KycBaselineProfile,
    sanctioned_names: Collection[str] = (),
) -> list[TriggerAlert]:
    website_result = None
    if CheckType.WEBSITE_DOMAIN in check_groups:
        website_request = WebsiteChangeRequest.model_validate({
            **trigger.payload,
            "client_id": trigger.client_id,
            "trigger_type": trigger.trigger_type,
        })
        website_result = analyze_website_change(website_request)

    checks = {
        CheckType.LEGAL_ENTITY: [
            ("legal_name_changed", has_legal_name_changed(
                baseline.legal_name, current.legal_name
            )),
            ("legal_form_changed", has_legal_form_changed(
                baseline.legal_form, current.legal_form
            )),
            ("jurisdiction_changed", has_jurisdiction_changed(
                baseline.jurisdiction, current.jurisdiction
            )),
            ("registered_address_changed", has_registered_address_changed(
                baseline.registered_address, current.registered_address
            )),
            ("registry_status_changed", has_registry_status_changed(
                baseline.registry_status, current.registry_status
            )),
            ("legal_identifier_changed", has_legal_identifier_changed(
                baseline.legal_identifier, current.legal_identifier
            )),
        ],
        CheckType.OWNERSHIP: [
            ("new_owner", has_new_owner(baseline.owners, current.owners)),
            ("owner_removed", has_owner_been_removed(baseline.owners, current.owners)),
            ("ownership_percentage_changed", has_ownership_percentage_changed(
                baseline.owners, current.owners
            )),
        ],
        CheckType.SANCTIONS_WATCHLIST: [
            ("company_sanctioned", is_company_sanctioned(
                current.legal_name, sanctioned_names
            )),
            ("owner_sanctioned", has_sanctioned_owner(
                current.owners, sanctioned_names
            )),
        ],
        CheckType.ADVERSE_MEDIA: [],
        CheckType.BUSINESS_ACTIVITY: [],
        CheckType.WEBSITE_DOMAIN: [],
        CheckType.FINANCIAL_ACTIVITY: [],
    }

    alerts: list[TriggerAlert] = []
    for group in check_groups:
        for check_name, is_alert in checks.get(group, []):
            if not is_alert:
                continue

            is_sanctions_alert = group == CheckType.SANCTIONS_WATCHLIST
            alerts.append(
                TriggerAlert(
                    alert_id=f"alert-{trigger.trigger_id}-{check_name}",
                    trigger_id=trigger.trigger_id,
                    client_id=trigger.client_id,
                    type=group,
                    risk_level=RiskBand.high if is_sanctions_alert else RiskBand.medium,
                    recommended_action=(
                        RecommendedAction.escalate
                        if is_sanctions_alert
                        else RecommendedAction.re_kyc
                    ),
                    summary=check_name.replace("_", " ").capitalize(),
                    status=AlertStatus.new,
                    check_groups=[group],
                    created_at=datetime.utcnow().isoformat() + "Z",
                )
            )

    if website_result and website_result.alert_level != "none":
        is_high = website_result.alert_level == "high"
        alerts.append(
            TriggerAlert(
                alert_id=f"alert-{trigger.trigger_id}-website_change",
                trigger_id=trigger.trigger_id,
                client_id=trigger.client_id,
                type=CheckType.WEBSITE_DOMAIN,
                risk_level=RiskBand(website_result.alert_level),
                recommended_action=(
                    RecommendedAction.escalate
                    if is_high
                    else RecommendedAction.re_kyc
                ),
                summary=(
                    "Prohibited website activity detected"
                    if is_high
                    else "Possible business drift detected"
                ),
                details=website_result.explanation,
                status=AlertStatus.new,
                check_groups=[CheckType.WEBSITE_DOMAIN],
                created_at=datetime.utcnow().isoformat() + "Z",
            )
        )

    return alerts
