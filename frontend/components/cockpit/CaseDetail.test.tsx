import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderDetail, viewFor, follows, flagged, decided } from "@/test/cockpit-helpers";

describe("CaseDetail", () => {
  it("renders the client header with identifiers and the risk band delta", () => {
    renderDetail(viewFor("rm", "helvetia"));
    expect(screen.getByRole("heading", { name: "Helvetia Capital AG" })).toBeInTheDocument();
    expect(screen.getByText(/LEI 5493 00HEL VETIA 1A2/)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole("button", { name: /Escalate to Compliance/ }));
    await userEvent.click(screen.getByRole("button", { name: /Hand over to Account Manager/ }));
    await userEvent.click(screen.getByRole("button", { name: /Reviewed · no change/ }));
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(["escalate", "handover", "reviewed"]);
  });

  it("offers the AM a hand-back action and dispatches it", async () => {
    const onAction = vi.fn();
    renderDetail(viewFor("am", "nordwind"), { onAction });
    await userEvent.click(screen.getByRole("button", { name: /Hand back to RM/ }));
    expect(onAction).toHaveBeenCalledWith("handback");
  });

  it("dispatches every Compliance decision key on a flagged case", async () => {
    const onAction = vi.fn();
    renderDetail(viewFor("compliance", "helvetia", flagged("helvetia")), { onAction });
    await userEvent.click(screen.getByRole("button", { name: /Require Re-KYC/ }));
    await userEvent.click(screen.getByRole("button", { name: /Request document/ }));
    await userEvent.click(screen.getByRole("button", { name: /Add to watchlist/ }));
    await userEvent.click(screen.getByRole("button", { name: /Escalate to MLRO/ }));
    await userEvent.click(screen.getByRole("button", { name: /^Dismiss/ }));
    expect(onAction.mock.calls.map((c) => c[0])).toEqual([
      "re_kyc",
      "doc_request",
      "watchlist",
      "mlro",
      "dismiss",
    ]);
  });

  it("shows the instruction banner to the owner and confirms it", async () => {
    const onConfirmInstruction = vi.fn();
    renderDetail(viewFor("rm", "helvetia", decided("helvetia", "re_kyc", false)), { onConfirmInstruction });
    expect(screen.getByText("Re-KYC required for this client")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Re-KYC initiated" }));
    expect(onConfirmInstruction).toHaveBeenCalled();
  });

  it("shows the instruction-done banner once confirmed", () => {
    renderDetail(viewFor("rm", "helvetia", decided("helvetia", "re_kyc", true)));
    expect(screen.getByText(/Re-KYC initiated by the relationship owner/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Re-KYC initiated" })).toBeNull();
  });

  it("shows the decided banner with the outcome to the non-owner", () => {
    renderDetail(viewFor("compliance", "helvetia", decided("helvetia", "watchlist")));
    expect(screen.getByText(/Decided · Added to watchlist, written to audit log/)).toBeInTheDocument();
  });

  it("picks a recipient and marks the active one pressed", async () => {
    const onPickRecipient = vi.fn();
    renderDetail(viewFor("rm", "bernina"), { onPickRecipient });
    // Recipient chips are the only CaseDetail buttons carrying aria-pressed.
    const recipients = screen.getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"));
    const active = recipients.find((b) => b.getAttribute("aria-pressed") === "true");
    expect(active?.textContent).toContain("Account Manager"); // RM default peer
    const compliance = recipients.find((b) => /Compliance/.test(b.textContent || ""));
    await userEvent.click(compliance as HTMLElement);
    expect(onPickRecipient).toHaveBeenCalledWith("compliance");
  });

  it("reflects the message draft and sends it", async () => {
    const onMsgChange = vi.fn();
    const onSend = vi.fn();
    renderDetail(viewFor("rm", "bernina"), { msgDraft: "Please take this one.", onMsgChange, onSend });
    const box = screen.getByRole("textbox");
    expect(box).toHaveValue("Please take this one.");
    await userEvent.type(box, "!");
    expect(onMsgChange).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalled();
  });

  it("shows empty states for a case with no messages or audit", () => {
    renderDetail(viewFor("rm", "alpenrose"));
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
    expect(screen.getByText("Nothing logged yet.")).toBeInTheDocument();
  });
});
