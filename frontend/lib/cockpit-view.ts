// Pure view-model helpers for the cockpit. A faithful port of the prototype's
// renderVals()/statusPill()/recVM()/rowVM(), with no React and no event handlers:
// the components receive callbacks and dispatch by the string `key` carried here,
// which keeps all the presentation logic declarative and unit-testable.

import {
  ROLES,
  TONES,
  type Case,
  type CaseAuditEntry,
  type Decision,
  type RiskBand,
  type Role,
  type Tone,
  type ToneName,
} from "@/lib/cockpit-types";

export function bandToneName(b: RiskBand): ToneName {
  if (b === "LOW") return "success";
  if (b === "MEDIUM") return "warning";
  return "danger";
}

export interface Pill {
  text: string;
  bg: string;
  border: string;
  color: string;
}

function pill(text: string, tone: ToneName): Pill {
  const t = TONES[tone];
  return { text, bg: t.bg, border: t.border, color: t.text };
}

// Status -> the labelled pill shown on rows and in the detail header.
export function statusPill(c: Case): Pill {
  if (c.status === "decided") {
    if (c.decision === "re_kyc")
      return pill(c.instructionDone ? "Re-KYC initiated" : "Compliance: Re-KYC required", "warning");
    if (c.decision === "doc_request")
      return pill(c.instructionDone ? "Document provided" : "Compliance: document requested", "warning");
    if (c.decision === "watchlist") return pill("Compliance: Watchlisted", "danger");
    if (c.decision === "mlro") return pill("Compliance: Escalated to MLRO", "info");
    if (c.decision === "dismiss") return pill("Compliance: cleared, no action", "success");
  }
  if (c.status === "flagged_by_rm") return pill("Flagged · awaiting Compliance", "info");
  if (c.status === "in_compliance_review") return pill("In Compliance review", "info");
  if (c.status === "escalated_by_am") return pill("Escalated by AM · awaiting Compliance", "info");
  if (c.status === "handed_to_am") return pill("Reassigned to Account Manager", "info");
  if (c.status === "reviewed") return pill("Reviewed · no change", "neutral");
  if (c.quiet) return pill("No change overnight", "neutral");
  return pill("Needs review", "warning");
}

export interface RecVM {
  has: boolean;
  label?: string;
  rationale?: string;
  direction?: string;
  bg?: string;
  border?: string;
  tagBg?: string;
  tagColor?: string;
}

// The first-line recommendation card styling (escalate / handover / monitor).
export function recVM(c: Case): RecVM {
  if (!c.recAction) return { has: false };
  if (c.recAction === "escalate_compliance")
    return {
      has: true,
      label: c.recLabel,
      rationale: c.recRationale,
      direction: "1ST -> 2ND LINE",
      bg: "#fff8f6",
      border: "#f0c4be",
      tagBg: "#fcebeb",
      tagColor: "#501313",
    };
  if (c.recAction === "handover_am")
    return {
      has: true,
      label: c.recLabel,
      rationale: c.recRationale,
      direction: "1ST-LINE REASSIGN",
      bg: "#fdf9f1",
      border: "#ecd6ad",
      tagBg: "#faeeda",
      tagColor: "#412402",
    };
  if (c.recAction === "monitor")
    return {
      has: true,
      label: c.recLabel,
      rationale: c.recRationale,
      direction: "NO ACTION",
      bg: "oklch(0.98 0 0)",
      border: "oklch(0.9 0 0)",
      tagBg: "oklch(0.95 0 0)",
      tagColor: "oklch(0.45 0 0)",
    };
  return { has: false };
}

export interface RowVM {
  id: string;
  client: string;
  sector: string;
  domicile: string;
  bandLabel: RiskBand;
  accent: string;
  dotColor: string;
  pillText: string;
  pillBg: string;
  pillBorder: string;
  pillColor: string;
  materiality: number;
  unread: boolean;
  selected: boolean;
}

export function rowVM(c: Case, selectedId: string | null, role: Role): RowVM {
  const t = TONES[bandToneName(c.band)];
  const st = statusPill(c);
  return {
    id: c.id,
    client: c.client,
    sector: c.sector,
    domicile: c.domicile,
    bandLabel: c.band,
    accent: t.border,
    dotColor: t.border,
    pillText: st.text,
    pillBg: st.bg,
    pillBorder: st.border,
    pillColor: st.color,
    materiality: c.materiality,
    unread: (role === "compliance" && !!c.unread) || (role === "am" && !!c.amUnread),
    selected: c.id === selectedId,
  };
}

export interface NavItemVM {
  label: string;
  count: number;
  hasCount: boolean;
  active: boolean;
  weight: string;
  bg: string;
  border: string;
  color: string;
  countBg: string;
  countColor: string;
}

export function navItem(
  label: string,
  count: number,
  active: boolean,
  showCount: boolean,
  countTone?: ToneName,
): NavItemVM {
  const ct = countTone ? TONES[countTone] : null;
  return {
    label,
    count,
    hasCount: showCount,
    active,
    weight: active ? "500" : "400",
    bg: active ? "#fff" : "transparent",
    border: active ? "1px solid oklch(0.9 0 0)" : "1px solid transparent",
    color: active ? "oklch(0.205 0 0)" : "oklch(0.5 0 0)",
    countBg: ct ? ct.bg : "oklch(0.205 0 0)",
    countColor: ct ? ct.text : "#fff",
  };
}

export interface ActorButton {
  key: string; // dispatched by the component: escalate|handover|handback|reviewed|<decision>
  label: string;
  sub: string;
  bg: string;
  color: string;
  border: string;
  subColor: string;
}

export interface SignalBar {
  label: string;
  pts: number;
  pct: string;
  barColor: string;
  textColor: string;
}

export interface ChangeRow {
  text: string;
  src: string;
  dot: string;
  textColor: string;
}

export interface ThreadMessage {
  avatar: string;
  avBg: string;
  avColor: string;
  who: string;
  toLabel: string;
  ts: string;
  text: string;
  align: "flex-start" | "flex-end";
  bubbleBg: string;
  bubbleBorder: string;
}

export interface DetailVM {
  client: string;
  lei: string;
  sector: string;
  domicile: string;
  headline: string;
  band: RiskBand;
  prevBand: RiskBand;
  showDelta: boolean;
  bandBg: string;
  bandBorder: string;
  bandColor: string;
  statusText: string;
  statusBg: string;
  statusBorder: string;
  statusColor: string;
  ownerLabel: string;
  materiality: number;
  matPct: string;
  signals: SignalBar[];
  changes: ChangeRow[];
  facts: string[];
  rec: RecVM;
  hasActorButtons: boolean;
  actionHeading: string;
  actorButtons: ActorButton[];
  instructionPending: boolean;
  instructionLabel: string;
  instructionDetail: string;
  instructionCta: string;
  instructionDone: boolean;
  instructionDoneText: string;
  decidedBanner: boolean;
  outcomeLabel: string;
  outcomeTail: string;
  outcomeBg: string;
  outcomeBorder: string;
  outcomeColor: string;
  thread: ThreadMessage[];
  threadEmpty: boolean;
  peerHint: string;
  audit: CaseAuditEntry[];
  auditEmpty: boolean;
}

export interface RecipientVM {
  key: Role;
  label: string;
  avatar: string;
  avBg: string;
  avColor: string;
  active: boolean;
  bg: string;
  color: string;
  border: string;
}

export interface CockpitView {
  isLogin: boolean;
  isApp: boolean;
  role: Role | null;
  isRM: boolean;
  isAM: boolean;
  isCompliance: boolean;
  roleName: string;
  roleTitle: string;
  roleAvatar: string;
  roleAvBg: string;
  roleAvColor: string;
  roleLine: string;
  roleLineBg: string;
  roleLineColor: string;
  nav: NavItemVM[];
  list: RowVM[];
  listKicker: string;
  listTitle: string;
  listSubtitle: string;
  listEmpty: boolean;
  listEmptyText: string;
  inboxCount: number;
  hasInboxUnread: boolean;
  hasDetail: boolean;
  noDetail: boolean;
  detail: DetailVM | null;
  msgRecipients: RecipientVM[];
  msgPlaceholder: string;
}

const PRIMARY = { bg: "oklch(0.205 0 0)", color: "#fff", border: "none", subColor: "oklch(0.75 0 0)" };
const SEC = { bg: "#fff", color: "oklch(0.25 0 0)", border: "1px solid oklch(0.85 0 0)", subColor: "oklch(0.6 0 0)" };
const GHOST = { bg: "#fff", color: "oklch(0.45 0 0)", border: "1px solid oklch(0.9 0 0)", subColor: "oklch(0.65 0 0)" };

function toLabel(r: Role): string {
  return r === "rm" ? "RM" : r === "am" ? "AM" : "Compliance";
}

// Compliance inbox eligibility: which cases surface in the 2nd-line queue.
function inboxElig(c: Case): boolean {
  return (
    c.status === "flagged_by_rm" ||
    c.status === "in_compliance_review" ||
    c.status === "escalated_by_am" ||
    c.status === "decided" ||
    (c.status === "open" && c.materiality >= 40)
  );
}

export interface ViewInput {
  role: Role | null;
  cases: Case[];
  selectedId: string | null;
  msgTo: Role | null;
}

// The single entry point: assemble the full view model for the current state.
export function buildView({ role, cases, selectedId, msgTo }: ViewInput): CockpitView {
  const isLogin = !role;
  const R = role ? ROLES[role] : null;

  // lists
  let list: RowVM[] = [];
  let listKicker = "";
  let listTitle = "";
  let listSubtitle = "";
  let listEmptyText = "";
  if (role === "rm") {
    const mine = cases.filter((c) => c.owner === "rm");
    const order = mine
      .slice()
      .sort((a, b) => (a.quiet ? 1 : 0) - (b.quiet ? 1 : 0) || b.materiality - a.materiality);
    list = order.map((c) => rowVM(c, selectedId, role));
    listKicker = "MORNING DIGEST · FRI 20 JUN";
    listTitle = "Your book";
    listSubtitle = "Ranked by materiality · click a client";
    listEmptyText = "No clients in your book.";
  } else if (role === "am") {
    const mine = cases.filter((c) => c.owner === "am");
    const order = mine.slice().sort((a, b) => b.materiality - a.materiality);
    list = order.map((c) => rowVM(c, selectedId, role));
    listKicker = "STRUCTURAL WATCH";
    listTitle = "Accounts you own";
    listSubtitle = "Complex structures & handovers";
    listEmptyText = "Nothing assigned to you yet.";
  } else if (role === "compliance") {
    const inbox = cases
      .filter(inboxElig)
      .sort(
        (a, b) =>
          (a.status === "decided" ? 1 : 0) - (b.status === "decided" ? 1 : 0) ||
          b.materiality - a.materiality,
      );
    list = inbox.map((c) => rowVM(c, selectedId, role));
    listKicker = "COMPLIANCE INBOX";
    listTitle = "Escalations · ranked";
    listSubtitle = "Decide each, outcome returns to 1st line";
    listEmptyText = "Inbox clear.";
  }

  // nav
  let nav: NavItemVM[] = [];
  if (role === "rm") {
    const flagged = cases.filter(
      (c) => c.owner === "rm" && (c.status === "flagged_by_rm" || c.status === "in_compliance_review"),
    ).length;
    const instr = cases.filter(
      (c) =>
        c.owner === "rm" &&
        c.status === "decided" &&
        (c.decision === "re_kyc" || c.decision === "doc_request") &&
        !c.instructionDone,
    ).length;
    nav = [
      navItem("Morning digest", 0, true, false),
      navItem("My clients", cases.filter((c) => c.owner === "rm").length, false, true),
      navItem("Escalated by me", flagged, false, flagged > 0, "info"),
      navItem("Compliance requests", instr, false, instr > 0, "warning"),
    ];
  } else if (role === "am") {
    const handed = cases.filter((c) => c.owner === "am" && c.status === "handed_to_am").length;
    const esc = cases.filter((c) => c.owner === "am" && c.status === "escalated_by_am").length;
    nav = [
      navItem("Structural watch", 0, true, false),
      navItem("Accounts I own", cases.filter((c) => c.owner === "am").length, false, true),
      navItem("Handed to me", handed, false, handed > 0, "info"),
      navItem("Escalated by me", esc, false, esc > 0, "info"),
    ];
  } else if (role === "compliance") {
    const need = cases.filter((c) => inboxElig(c) && c.status !== "decided").length;
    const review = cases.filter((c) => c.status === "in_compliance_review").length;
    const decided = cases.filter((c) => c.status === "decided").length;
    nav = [
      navItem("Inbox", need, true, true, "danger"),
      navItem("In review", review, false, review > 0, "info"),
      navItem("Decided", decided, false, decided > 0, "success"),
      navItem("Audit log", 0, false, false),
    ];
  }

  // detail
  const sel = cases.find((c) => c.id === selectedId) || null;
  const detail = sel && role ? buildDetail(sel, role) : null;

  // recipients
  const parties: [Role, string][] =
    role === "rm"
      ? [["am", "Account Manager"], ["compliance", "Compliance"]]
      : role === "am"
        ? [["rm", "Relationship Manager"], ["compliance", "Compliance"]]
        : [["rm", "Relationship Manager"], ["am", "Account Manager"]];
  const msgRecipients: RecipientVM[] = parties.map(([k, label]) => {
    const active = msgTo === k;
    const ar = ROLES[k];
    return {
      key: k,
      label,
      avatar: ar.avatar,
      avBg: ar.avBg,
      avColor: ar.avColor,
      active,
      bg: active ? "oklch(0.205 0 0)" : "#fff",
      color: active ? "#fff" : "oklch(0.4 0 0)",
      border: active ? "none" : "1px solid oklch(0.88 0 0)",
    };
  });
  const toName = msgTo ? ROLES[msgTo].short : "";

  return {
    isLogin,
    isApp: !isLogin,
    role,
    isRM: role === "rm",
    isAM: role === "am",
    isCompliance: role === "compliance",
    roleName: R?.name ?? "",
    roleTitle: R?.title ?? "",
    roleAvatar: R?.avatar ?? "",
    roleAvBg: R?.avBg ?? "",
    roleAvColor: R?.avColor ?? "",
    roleLine: R?.line ?? "",
    roleLineBg: R?.lineBg ?? "",
    roleLineColor: R?.lineColor ?? "",
    nav,
    list,
    listKicker,
    listTitle,
    listSubtitle,
    listEmpty: list.length === 0,
    listEmptyText,
    inboxCount: cases.filter((c) => c.unread).length,
    hasInboxUnread: cases.some((c) => c.unread),
    hasDetail: !!detail,
    noDetail: !detail,
    detail,
    msgRecipients,
    msgPlaceholder: "Message " + toName + "...",
  };
}

const INSTR_MAP: Record<"re_kyc" | "doc_request", { label: string; detail: string; cta: string; done: string }> = {
  re_kyc: {
    label: "Re-KYC required for this client",
    detail:
      "Compliance has instructed the relationship owner to re-run KYC given the material drift. Complete it and confirm here.",
    cta: "Confirm Re-KYC initiated",
    done: "Re-KYC initiated by the relationship owner. Compliance notified.",
  },
  doc_request: {
    label: "Document requested",
    detail:
      "Compliance has requested supporting documentation (UBO chart / source-of-wealth) before deciding. Provide it and confirm.",
    cta: "Confirm document provided",
    done: "Document provided to Compliance. Awaiting their review.",
  },
};

function outcomeFor(c: Case): { label: string; tone: ToneName; tail: string } | null {
  const ownerName = c.owner === "am" ? "Account Manager" : "RM";
  switch (c.decision) {
    case "re_kyc":
      return { label: "Re-KYC required", tone: "warning", tail: ", sent to " + ownerName + "." };
    case "doc_request":
      return { label: "Document requested", tone: "warning", tail: ", sent to " + ownerName + "." };
    case "watchlist":
      return { label: "Added to watchlist", tone: "danger", tail: " and 1st line notified." };
    case "mlro":
      return { label: "Escalated to MLRO", tone: "info", tail: ", out of the first-line loop." };
    case "dismiss":
      return { label: "Dismissed, no action", tone: "success", tail: "; 1st line notified." };
    default:
      return null;
  }
}

function buildDetail(sel: Case, role: Role): DetailVM {
  const t: Tone = TONES[bandToneName(sel.band)];
  const st = statusPill(sel);
  const rec = recVM(sel);
  const ownerLabel = sel.owner === "am" ? "Account Manager (Marco)" : "Relationship Manager (Lena)";

  // actor buttons (first-line owner) / compliance decisions
  let actorButtons: ActorButton[] = [];
  let actionHeading = "";
  if (role === "rm" && sel.owner === "rm" && (sel.status === "open" || sel.status === "reviewed")) {
    actionHeading = "YOUR MOVE · 1ST LINE";
    const escStyle = sel.recAction === "escalate_compliance" ? PRIMARY : SEC;
    const handStyle = sel.recAction === "handover_am" ? PRIMARY : SEC;
    actorButtons = [
      { key: "escalate", label: "Escalate to Compliance", sub: "up to 2nd line", ...escStyle },
      { key: "handover", label: "Hand over to Account Manager", sub: "1st-line reassign", ...handStyle },
      { key: "reviewed", label: "Reviewed · no change", sub: "close", ...GHOST },
    ];
  } else if (role === "am" && sel.owner === "am" && sel.status !== "decided" && sel.status !== "escalated_by_am") {
    actionHeading = "YOUR MOVE · 1ST LINE";
    const escStyle = sel.recAction === "escalate_compliance" ? PRIMARY : SEC;
    actorButtons = [
      { key: "escalate", label: "Escalate to Compliance", sub: "up to 2nd line", ...escStyle },
      { key: "handback", label: "Hand back to RM", sub: "1st-line reassign", ...SEC },
      { key: "reviewed", label: "Reviewed · no change", sub: "close", ...GHOST },
    ];
  } else if (role === "compliance" && sel.status !== "decided") {
    actionHeading = "COMPLIANCE DECISION · 2ND LINE";
    const cr = sel.compRec;
    const mk = (key: Decision, label: string, sub: string, tone: ToneName): ActorButton => {
      const tt = TONES[tone];
      const prim = cr === key;
      return {
        key,
        label,
        sub,
        bg: prim ? "oklch(0.205 0 0)" : tt.bg,
        color: prim ? "#fff" : tt.text,
        border: prim ? "none" : "1px solid " + tt.border,
        subColor: prim ? "oklch(0.75 0 0)" : tt.text,
      };
    };
    actorButtons = [
      mk("re_kyc", "Require Re-KYC", "down to 1st line", "warning"),
      mk("doc_request", "Request document", "down to 1st line", "warning"),
      mk("watchlist", "Add to watchlist", "log", "danger"),
      mk("mlro", "Escalate to MLRO", "up to 3rd line", "info"),
      mk("dismiss", "Dismiss", "no action", "neutral"),
    ];
  }

  // instruction-back-down (owner viewing a decided re_kyc/doc_request)
  const isInstrDecision = sel.decision === "re_kyc" || sel.decision === "doc_request";
  const instrPending = sel.status === "decided" && isInstrDecision && !sel.instructionDone && role === sel.owner;
  const instrDone = sel.status === "decided" && isInstrDecision && sel.instructionDone;
  const im = sel.decision === "re_kyc" || sel.decision === "doc_request" ? INSTR_MAP[sel.decision] : null;

  // decided banner (non-owner or instruction-less decisions)
  const out = outcomeFor(sel);
  const ot = out ? TONES[out.tone] : TONES.neutral;
  const showDecidedBanner = sel.status === "decided" && !instrPending && !instrDone;

  // signals
  const maxPts = Math.max.apply(null, sel.signals.length ? sel.signals.map((s) => s.pts) : [1]);
  const signals: SignalBar[] = sel.signals.map((s) => ({
    label: s.label,
    pts: s.pts,
    pct: Math.round((s.pts / maxPts) * 100) + "%",
    barColor: t.border,
    textColor: "oklch(0.3 0 0)",
  }));

  // changes
  const changes: ChangeRow[] = sel.changes.map((ch) => ({
    text: ch.text,
    src: ch.src,
    dot: ch.dir === "negative" ? "#e24b4a" : ch.dir === "positive" ? "#97c459" : "oklch(0.7 0 0)",
    textColor: ch.dir === "negative" ? "#501313" : "oklch(0.25 0 0)",
  }));

  // thread
  const thread: ThreadMessage[] = (sel.messages || []).map((m) => {
    const ar = ROLES[m.from];
    const mine = m.from === role;
    return {
      avatar: ar.avatar,
      avBg: ar.avBg,
      avColor: ar.avColor,
      who: ar.short,
      toLabel: toLabel(m.to),
      ts: m.ts,
      text: m.text,
      align: mine ? "flex-end" : "flex-start",
      bubbleBg: mine ? "#f3f6fc" : "#fff",
      bubbleBorder: mine ? "#dbe6f7" : "oklch(0.92 0 0)",
    };
  });

  return {
    client: sel.client,
    lei: sel.lei,
    sector: sel.sector,
    domicile: sel.domicile,
    headline: sel.headline,
    band: sel.band,
    prevBand: sel.prevBand,
    showDelta: sel.prevBand !== sel.band,
    bandBg: t.bg,
    bandBorder: t.border,
    bandColor: t.text,
    statusText: st.text,
    statusBg: st.bg,
    statusBorder: st.border,
    statusColor: st.color,
    ownerLabel,
    materiality: sel.materiality,
    matPct: sel.materiality + "%",
    signals,
    changes,
    facts: sel.facts,
    rec,
    hasActorButtons: actorButtons.length > 0,
    actionHeading,
    actorButtons,
    instructionPending: instrPending,
    instructionLabel: im ? im.label : "",
    instructionDetail: im ? im.detail : "",
    instructionCta: im ? im.cta : "",
    instructionDone: instrDone,
    instructionDoneText: im ? im.done : "",
    decidedBanner: showDecidedBanner,
    outcomeLabel: out ? out.label : "",
    outcomeTail: out ? out.tail : ".",
    outcomeBg: ot.bg,
    outcomeBorder: ot.border,
    outcomeColor: ot.text,
    thread,
    threadEmpty: thread.length === 0,
    peerHint: role === "compliance" ? "first line" : "Account Manager or Compliance",
    audit: sel.audit,
    auditEmpty: sel.audit.length === 0,
  };
}
