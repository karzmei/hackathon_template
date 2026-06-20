"use client";

import { useEffect } from "react";
import { useCockpit } from "@/lib/use-cockpit";
import { buildView } from "@/lib/cockpit-view";
import type { Decision } from "@/lib/cockpit-types";
import { LoginScreen } from "@/components/cockpit/LoginScreen";
import { AppHeader } from "@/components/cockpit/AppHeader";
import { Sidebar } from "@/components/cockpit/Sidebar";
import { CaseList } from "@/components/cockpit/CaseList";
import { CaseDetail } from "@/components/cockpit/CaseDetail";

const DECISIONS: Decision[] = ["re_kyc", "doc_request", "watchlist", "mlro", "dismiss"];

// The cockpit. A single page owning the state machine (via useCockpit) and routing
// detail-pane button keys to the matching action. Renders the seat picker until a
// role is chosen, then the role-aware app shell.
export default function Cockpit() {
  const c = useCockpit();
  const view = buildView({ role: c.role, cases: c.cases, selectedId: c.selectedId, msgTo: c.msgTo });

  // Dispatch a CaseDetail actor-button key to the corresponding hook action.
  function onAction(key: string) {
    if (key === "escalate") return c.escalateCompliance();
    if (key === "handover") return c.handover();
    if (key === "handback") return c.handback();
    if (key === "reviewed") return c.markReviewed();
    if ((DECISIONS as string[]).includes(key)) return c.decide(key as Decision);
  }

  // Land the user on the top-ranked case so the cockpit opens populated, not empty.
  // selectInitial only shows the case; it does not start a review or clear unread,
  // so merely opening the cockpit never writes to the audit trail.
  useEffect(() => {
    if (c.ready && c.role && !c.selectedId && view.list.length > 0) {
      c.selectInitial(view.list[0].id);
    }
  }, [c.ready, c.role, c.selectedId, view.list, c.selectInitial]);

  if (!c.ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div
          className="dw-pulse font-mono text-xs font-medium"
          style={{ letterSpacing: "0.30em", color: "oklch(0.5 0 0)" }}
        >
          DRIFTWATCH
        </div>
      </div>
    );
  }

  if (view.isLogin) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <LoginScreen onPick={c.pick} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <AppHeader view={view} onLogout={c.logout} />
      <div className="flex min-h-0 flex-1">
        <Sidebar nav={view.nav} />
        <div className="flex min-w-0 flex-1">
          <CaseList view={view} onSelect={c.select} />
          <div className="min-w-0 flex-1 overflow-y-auto bg-white">
            {view.hasDetail && view.detail ? (
              <CaseDetail
                detail={view.detail}
                recipients={view.msgRecipients}
                msgDraft={c.msgDraft}
                msgPlaceholder={view.msgPlaceholder}
                onAction={onAction}
                onConfirmInstruction={c.confirmInstruction}
                onPickRecipient={c.setMsgTo}
                onMsgChange={c.setMsgDraft}
                onSend={c.sendMsg}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "oklch(0.62 0 0)" }}>
                Select a case to open it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
