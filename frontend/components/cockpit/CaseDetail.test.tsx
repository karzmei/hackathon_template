import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseDetail } from "./CaseDetail";
import { buildView, type CockpitView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";
import type { Case, Role } from "@/lib/cockpit-types";

const noop = () => {};

function renderDetail(view: CockpitView, overrides: Partial<Parameters<typeof CaseDetail>[0]> = {}) {
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

function viewFor(role: Role, selectedId: string, cases: Case[] = seedCases()) {
  return buildView({ role, cases, selectedId, msgTo: role === "rm" ? "am" : "rm" });
}

function follows(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("CaseDetail", () => {
  it("renders the client header with the risk band delta", () => {
    renderDetail(viewFor("rm", "helvetia"));
    expect(screen.getByRole("heading", { name: "Helvetia Capital AG" })).toBeInTheDocument();
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument(); // struck-through previous band
  });

  it("keeps the sections in order: signals, what changed, key facts, conversation, audit", () => {
    renderDetail(viewFor("rm", "helvetia"));
    const signals = screen.getByText("DRIFT SIGNALS");
    const changed = screen.getByText("WHAT CHANGED");
    const facts = screen.getByText("KEY FACTS");
    const conversation = screen.getByText("CASE CONVERSATION");
    const audit = screen.getByText("AUDIT TRAIL");
    expect(follows(signals, changed)).toBe(true);
    expect(follows(changed, facts)).toBe(true);
    expect(follows(facts, conversation)).toBe(true);
    expect(follows(conversation, audit)).toBe(true);
  });

  it("shows the source-cited timeline entries and the audit trail", () => {
    renderDetail(viewFor("rm", "helvetia"));
    expect(screen.getByText(/Company filing · 18 Jun/)).toBeInTheDocument();
    expect(screen.getByText(/Escalated to Compliance/)).toBeInTheDocument();
  });

  it("offers the RM first-line actions and dispatches their keys", async () => {
    const onAction = vi.fn();
    renderDetail(viewFor("rm", "castor"), { onAction });
    const escalate = screen.getByRole("button", { name: /Escalate to Compliance/ });
    await userEvent.click(escalate);
    expect(onAction).toHaveBeenCalledWith("escalate");
  });

  it("offers the five Compliance decisions on a flagged case", () => {
    const cases = seedCases().map((c) =>
      c.id === "helvetia" ? { ...c, status: "flagged_by_rm" as const } : c,
    );
    renderDetail(viewFor("compliance", "helvetia", cases));
    expect(screen.getByRole("button", { name: /Require Re-KYC/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to watchlist/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dismiss/ })).toBeInTheDocument();
  });

  it("shows the instruction banner to the owner after a Re-KYC decision", async () => {
    const cases = seedCases().map((c) =>
      c.id === "helvetia"
        ? { ...c, status: "decided" as const, decision: "re_kyc" as const, instructionDone: false }
        : c,
    );
    const onConfirmInstruction = vi.fn();
    renderDetail(viewFor("rm", "helvetia", cases), { onConfirmInstruction });
    const confirm = screen.getByRole("button", { name: "Confirm Re-KYC initiated" });
    await userEvent.click(confirm);
    expect(onConfirmInstruction).toHaveBeenCalled();
  });

  it("sends a message through the conversation composer", async () => {
    const onSend = vi.fn();
    renderDetail(viewFor("rm", "bernina"), { onSend });
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalled();
  });
});
