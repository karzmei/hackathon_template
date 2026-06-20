from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ClientRecordModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IndustryCode(ClientRecordModel):
    scheme: str
    code: str
    description: str
    primary: bool


class Listing(ClientRecordModel):
    exchange: str
    ticker: str
    primary: bool


class Identification(ClientRecordModel):
    legal_name: str
    trade_names: list[str]
    registration_number: str
    legal_form: str
    jurisdiction_of_incorporation: str
    incorporation_date: date
    industry_codes: list[IndustryCode]
    sectors: list[str]
    is_publicly_listed: bool
    listings: list[Listing]


class KycBaseline(ClientRecordModel):
    expected_business_model: str
    business_activity_tags: list[str]
    expected_countries_of_operation: list[str]
    expected_monthly_txn_volume_chf: Decimal = Field(ge=0)
    expected_monthly_txn_count: int = Field(ge=0)
    expected_avg_txn_size_chf: Decimal = Field(ge=0)
    expected_counterparty_countries: list[str]
    source_of_funds: list[str]
    source_of_funds_other: str | None
    source_of_wealth: list[str]
    source_of_wealth_other: str | None
    customer_risk_rating: str
    risk_rating_factors: list[str]
    risk_rating_notes: str
    onboarding_date: date
    last_kyc_review_date: date
    next_kyc_review_due: date


class BeneficialOwner(ClientRecordModel):
    name: str
    ownership_pct: float = Field(ge=0, le=100)
    nationalities: list[str]
    is_pep: bool


class Shareholder(ClientRecordModel):
    name: str
    ownership_pct: float = Field(ge=0, le=100)


class DirectorOfficer(ClientRecordModel):
    name: str
    roles: list[str]


class Ownership(ClientRecordModel):
    beneficial_owners: list[BeneficialOwner]
    shareholders_on_file: list[Shareholder]
    directors_officers: list[DirectorOfficer]
    ownership_structure_complexity: str


class AccountInfo(ClientRecordModel):
    account_type: str
    account_open_date: date
    products_held: list[str]
    relationship_manager: str


class ScreeningStatus(ClientRecordModel):
    sanctions_match: bool
    pep_status: bool
    last_screened_date: date


class AmlMonitoring(ClientRecordModel):
    recent_monthly_txn_volume_chf: Decimal = Field(ge=0)
    recent_monthly_txn_count: int = Field(ge=0)
    cross_border_txn_ratio_pct: float = Field(ge=0, le=100)
    top_counterparty_countries: list[str]
    txn_velocity_30d_vs_baseline_pct: float = Field(ge=0)
    large_single_txn_count_30d: int = Field(ge=0)
    structuring_pattern_flag: bool
    dormancy_status: str
    days_since_last_activity: int = Field(ge=0)
    screening_status: ScreeningStatus


class ComplianceStatus(ClientRecordModel):
    edd_required: bool
    edd_reasons: list[str]
    open_investigations: int = Field(ge=0)
    sars_filed_count_lifetime: int = Field(ge=0)
    account_restrictions: list[str]


class InternalRecord(ClientRecordModel):
    identification: Identification
    kyc_baseline: KycBaseline
    ownership: Ownership
    account_info: AccountInfo
    aml_monitoring: AmlMonitoring
    compliance_status: ComplianceStatus


class LegalRegistry(ClientRecordModel):
    current_legal_name: str
    current_legal_form: str
    registered_address: str
    registry_source: str
    last_registry_check: date
    shareholders_on_record: list[str]
    filing_status: str


class EntityMatch(ClientRecordModel):
    matched_on: list[str]
    confirmed: bool


class NewsConclusion(ClientRecordModel):
    action: str
    reason: str


class NewsEvent(ClientRecordModel):
    event_date: date
    news_table_ids: list[int]
    sources: list[str]
    summary: str
    impact: str
    news_categories: list[str]
    impact_categories: list[str]
    entity_match: EntityMatch
    conclusion: NewsConclusion


class WebPresence(ClientRecordModel):
    current_domain: str
    domain_registration_date: date
    last_domain_change_date: date | None
    website_content_hash: str
    last_content_change_date: date
    whois_registrant_org: str
    hosting_country: str


class CorporateEvent(ClientRecordModel):
    event_type: str
    date: date
    description: str
    source: str
    amount_chf: Decimal | None


class LinkedEntity(ClientRecordModel):
    person: str
    roles: list[str]
    linked_entity_name: str
    linked_entity_country: str
    sectors: list[str]
    ownership_pct: float = Field(ge=0, le=100)
    flag_reason: str
    source: str
    discovered_date: date


class GeopoliticalSignal(ClientRecordModel):
    date: date
    topic: str
    jurisdictions: list[str]
    description: str
    impact: str
    source: str


class SanctionsAdverseMediaScreening(ClientRecordModel):
    ofac_match: bool
    eu_sanctions_match: bool
    un_sanctions_match: bool
    adverse_media_hits_30d: int = Field(ge=0)
    last_screened: date


class MarketSignals(ClientRecordModel):
    employee_count_estimate: int = Field(ge=0)
    employee_count_trend_90d_pct: float
    social_media_activity_level: str
    linkedin_url: str
    headquarters_location_reported: str


class ExternalRecord(ClientRecordModel):
    legal_registry: LegalRegistry
    news: list[NewsEvent]
    web_presence: WebPresence
    corporate_events: list[CorporateEvent]
    linked_entities: list[LinkedEntity]
    geopolitical_signals: list[GeopoliticalSignal]
    sanctions_adverse_media_screening: SanctionsAdverseMediaScreening
    market_signals: MarketSignals


class PolicyReference(ClientRecordModel):
    exclusion_id: str
    label: str
    severity: str
    board_reference: str


class TriggerEvidence(ClientRecordModel):
    method: str
    rule_or_model: str
    score: float | None
    threshold: float | None
    reasoning: str
    policy_refs: list[PolicyReference] = Field(default_factory=list)
    matched_values: list[str] = Field(default_factory=list)
    supporting_trigger: TriggerEvidence | None = None


class DigestFact(ClientRecordModel):
    fact_id: str
    fact: str
    impact: str
    severity: str
    policy_violation: bool
    categories: list[str]
    source: str
    url: str | None
    first_observed_date: date
    relevant_to: list[str]
    trigger: TriggerEvidence


class SuggestedAction(ClientRecordModel):
    action_type: str
    description: str
    based_on_facts: list[str]
    status: str


class EvaluatedNoAlert(ClientRecordModel):
    signal: str
    rule_or_model: str
    score: float
    threshold: float
    result: str


class PipelineRun(ClientRecordModel):
    stage_reached: int = Field(ge=0)
    tokens_input: int = Field(ge=0)
    tokens_output: int = Field(ge=0)
    model_calls: int = Field(ge=0)
    processed_in_region: str
    processing_time_ms: int = Field(ge=0)
    evaluated_no_alert: list[EvaluatedNoAlert]


class DerivedRecord(ClientRecordModel):
    digest_facts: list[DigestFact]
    suggested_actions: list[SuggestedAction]
    watchlist_status: str
    digest_batch_id: str
    digest_date: date
    pipeline_run: PipelineRun


class ClientRecord(ClientRecordModel):
    client_id: str
    entity_type: Literal["corporate"]
    record_version: int = Field(ge=1)
    last_updated: datetime
    internal: InternalRecord
    external: ExternalRecord
    derived: DerivedRecord
