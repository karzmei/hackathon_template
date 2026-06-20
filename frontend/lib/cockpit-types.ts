// Shared types and constant maps for the three-role cockpit. Ported from the
// "01 Cockpit" design prototype; this is a self-contained, frontend-only model
// (the case state lives in localStorage, not the backend).

export type Role = "rm" | "am" | "compliance";

// Who owns the client on the first line (RM by default; can be handed to AM).
export type Owner = "rm" | "am";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

// Case lifecycle. Drives the status pill and which actions are offered.
export type CaseStatus =
  | "open"
  | "flagged_by_rm"
  | "in_compliance_review"
  | "escalated_by_am"
  | "handed_to_am"
  | "reviewed"
  | "decided";

// A Compliance (2nd-line) decision; the only path that "acts".
export type Decision =
  | "re_kyc"
  | "doc_request"
  | "watchlist"
  | "mlro"
  | "dismiss";

// First-line recommendation surfaced on the case before any action is taken.
export type RecAction = "escalate_compliance" | "handover_am" | "monitor";

export interface DriftSignal {
  label: string;
  pts: number;
}

export interface CaseChange {
  dir: "negative" | "positive" | "neutral";
  text: string;
  src: string;
}

export interface CaseMessage {
  from: Role;
  to: Role;
  text: string;
  ts: string;
}

export interface CaseAuditEntry {
  ts: string;
  actor: string;
  action: string;
}

export interface Case {
  id: string;
  owner: Owner;
  client: string;
  lei: string;
  domicile: string;
  sector: string;
  band: RiskBand;
  prevBand: RiskBand;
  status: CaseStatus;
  decision: Decision | null;
  instructionDone: boolean;
  unread: boolean;
  amUnread?: boolean;
  quiet?: boolean;
  materiality: number;
  headline: string;
  signals: DriftSignal[];
  changes: CaseChange[];
  facts: string[];
  recAction: RecAction;
  recLabel: string;
  recRationale: string;
  compRec: Decision | null;
  messages: CaseMessage[];
  audit: CaseAuditEntry[];
}

// Semantic tone -> the colour triplet used across pills, accents and banners.
// Matches the --color-*-{info,success,warning,danger} tokens in globals.css.
export type ToneName = "info" | "success" | "warning" | "danger" | "neutral";

export interface Tone {
  bg: string;
  border: string;
  text: string;
}

export const TONES: Record<ToneName, Tone> = {
  info: { bg: "#e0ebff", border: "#4f7ce6", text: "#1e3a8a" },
  success: { bg: "#eaf3de", border: "#97c459", text: "#173404" },
  warning: { bg: "#faeeda", border: "#ef9f27", text: "#412402" },
  danger: { bg: "#fcebeb", border: "#e24b4a", text: "#501313" },
  neutral: {
    bg: "oklch(0.97 0 0)",
    border: "oklch(0.9 0 0)",
    text: "oklch(0.45 0 0)",
  },
};

export interface RoleMeta {
  name: string;
  title: string;
  avatar: string;
  short: string;
  avBg: string;
  avColor: string;
  line: string;
  lineBg: string;
  lineColor: string;
}

export const ROLES: Record<Role, RoleMeta> = {
  rm: {
    name: "Lena Brunner",
    title: "Relationship Manager",
    avatar: "LB",
    short: "Lena (RM)",
    avBg: "#e0ebff",
    avColor: "#1e3a8a",
    line: "1ST LINE · BUSINESS",
    lineBg: "#e0ebff",
    lineColor: "#1e3a8a",
  },
  am: {
    name: "Marco Reuss",
    title: "Account Manager",
    avatar: "MR",
    short: "Marco (AM)",
    avBg: "#faeeda",
    avColor: "#412402",
    line: "1ST LINE · BUSINESS",
    lineBg: "#faeeda",
    lineColor: "#412402",
  },
  compliance: {
    name: "Sofia Keller",
    title: "Compliance Officer",
    avatar: "SK",
    short: "Sofia (Compliance)",
    avBg: "#fcebeb",
    avColor: "#501313",
    line: "2ND LINE · CONTROL",
    lineBg: "#fcebeb",
    lineColor: "#501313",
  },
};
