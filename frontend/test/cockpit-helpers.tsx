// Shared cockpit test helpers. Consolidates the small per-file helpers (find,
// viewFor, renderDetail, follows) plus a set of case-mutation builders, so the
// component and view-model tests stay terse and drive the real buildView/seedCases
// rather than hand-built mocks. Excluded from coverage via vitest.config.ts.

import { render } from "@testing-library/react";
import { CaseDetail, type CaseDetailProps } from "@/components/cockpit/CaseDetail";
import { buildView, type CockpitView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";
import type { Case, Decision, Role } from "@/lib/cockpit-types";

// A seed case by id, throwing if the id is wrong so a typo fails loudly.
export function find(id: string): Case {
  const c = seedCases().find((x) => x.id === id);
  if (!c) throw new Error(`no seed case ${id}`);
  return c;
}

// Build a full view for a role with a case open; msgTo defaults to a sensible peer.
export function viewFor(role: Role, selectedId: string | null, cases: Case[] = seedCases()): CockpitView {
  return buildView({ role, cases, selectedId, msgTo: role === "rm" ? "am" : "rm" });
}

const noop = () => {};

// Render CaseDetail from a view, with noop callbacks unless overridden.
export function renderDetail(view: CockpitView, overrides: Partial<CaseDetailProps> = {}) {
  if (!view.detail) throw new Error("view has no detail");
  return render(
    <CaseDetail
      detail={view.detail}
      recipients={view.msgRecipients}
      msgDraft=""
      msgPlaceholder={view.msgPlaceholder}
      onAction={noop}
      onConfirmInstruction={noop}
      onPickRecipient={noop}
      onMsgChange={noop}
      onSend={noop}
      {...overrides}
    />,
  );
}

// True when b comes after a in document order; used to assert section ordering.
export function follows(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

// Case-mutation builders: a fresh seed book with one case transformed into a
// target state. They replace the repeated inline cases.map(...) spreads.
function mutate(id: string, patch: Partial<Case>): Case[] {
  return seedCases().map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export const flagged = (id: string): Case[] => mutate(id, { status: "flagged_by_rm", unread: true });

export const decided = (id: string, decision: Decision, instructionDone = false): Case[] =>
  mutate(id, { status: "decided", decision, instructionDone, unread: false });

export const handedToAm = (id: string): Case[] =>
  mutate(id, { status: "handed_to_am", owner: "am", amUnread: true });

export const reviewed = (id: string): Case[] => mutate(id, { status: "reviewed" });

export const withMateriality = (id: string, materiality: number): Case[] => mutate(id, { materiality });
