from enum import StrEnum


class TriggerType(StrEnum):
    REGISTRY_UPDATE = "registry_update"
    TRANSACTION_UPDATE = "transaction_update"
    NEWS_UPDATE = "news_update"
    WEBSITE_UPDATE = "website_update"
    FUNDING_UPDATE = "funding_update"
    BUSINESS_PROFILE_UPDATE = "business_profile_update"
    MANUAL_REFRESH = "manual_refresh"


# could be made smarter
TRIGGER_TO_CHECK_GROUPS = {
    TriggerType.REGISTRY_UPDATE: ["legal"],
    TriggerType.TRANSACTION_UPDATE: ["financial"],
    TriggerType.NEWS_UPDATE: ["news", "business"],
    TriggerType.WEBSITE_UPDATE: ["website", "business"],
    TriggerType.FUNDING_UPDATE: ["financial", "business"],
    TriggerType.BUSINESS_PROFILE_UPDATE: ["business"],
    TriggerType.MANUAL_REFRESH: ["legal", "financial", "news", "website", "business"],
}