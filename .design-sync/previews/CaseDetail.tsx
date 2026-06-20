import { CaseDetail } from "driftwatch-frontend";
import { buildView, type CockpitView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";

const noop = () => {};

function render(view: CockpitView) {
  const d = view.detail!;
  return (
    <div style={{ width: 800, maxWidth: "100%", background: "#fff" }}>
      <CaseDetail
        detail={d}
        recipients={view.msgRecipients}
        msgDraft=""
        msgPlaceholder={view.msgPlaceholder}
        onAction={noop}
        onConfirmInstruction={noop}
        onPickRecipient={noop}
        onMsgChange={noop}
        onSend={noop}
      />
    </div>
  );
}

// Compliance (2nd line) viewing a flagged HIGH-risk case: full signals, the
// source-cited "what changed" timeline, the decision buttons and the thread.
export function ComplianceDecision() {
  const view = buildView({ role: "compliance", cases: seedCases(), selectedId: "helvetia", msgTo: "rm" });
  return render(view);
}

// First line (RM) on an open case: the "your move" escalate / hand over / reviewed actions.
export function FirstLineActions() {
  const view = buildView({ role: "rm", cases: seedCases(), selectedId: "castor", msgTo: null });
  return render(view);
}

// Owner viewing a Compliance decision sent back down: the amber instruction-to-confirm banner.
export function InstructionBackDown() {
  const base = seedCases().find((c) => c.id === "helvetia")!;
  const decided = { ...base, status: "decided" as const, decision: "re_kyc" as const, instructionDone: false };
  const view = buildView({ role: "rm", cases: [decided], selectedId: "helvetia", msgTo: null });
  return render(view);
}
