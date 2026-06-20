// The cockpit state machine. Owns role + cases + selection + the message draft,
// persists cases to localStorage and role to sessionStorage, and syncs case state
// across browser windows (a 1100ms poll plus the `storage` event). This is the
// faithful port of the prototype's DCLogic lifecycle, frontend-only and SSR-safe.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { seedCases } from "@/lib/cockpit-seed";
import { api } from "@/lib/api";
import { alertToCase, DECISION_TO_ACTION } from "@/lib/alert-to-case";
import type { Case, Decision, Role } from "@/lib/cockpit-types";

const CASES_KEY = "dw_p1_cases_v2";
const ROLE_KEY = "dw_p1_role";
const POLL_MS = 1100;

// Opt-in live mode. Off by default, so the cockpit stays a self-contained mock demo;
// set NEXT_PUBLIC_USE_BACKEND=true to drive it from the FastAPI backend instead.
const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

// Pull the live alerts and adapt them to cockpit cases. Reuses an existing run if the
// backend already has alerts, so opening a second window for the handoff demo does not
// reset the store and wipe a decision. Returns null on any failure (or the 700ms
// timeout) so the caller keeps the local/seed state instead of hanging.
async function hydrateFromBackend(): Promise<Case[] | null> {
  try {
    let rows = await api.listAlerts();
    if (!rows.length) rows = (await api.runPipeline()).alerts;
    const alerts = await Promise.all(rows.map((r) => api.getAlert(r.id)));
    return alerts.map(alertToCase);
  } catch {
    return null;
  }
}

function now(): string {
  return (
    "20 Jun " +
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function defaultRecipient(role: Role): Role {
  return role === "rm" ? "am" : role === "am" ? "rm" : "rm";
}

function readCases(): Case[] | null {
  try {
    const raw = localStorage.getItem(CASES_KEY);
    return raw ? (JSON.parse(raw) as Case[]) : null;
  } catch {
    return null;
  }
}

export interface Cockpit {
  role: Role | null;
  cases: Case[];
  selectedId: string | null;
  msgTo: Role | null;
  msgDraft: string;
  ready: boolean;
  pick: (role: Role) => void;
  logout: () => void;
  select: (id: string) => void;
  setMsgTo: (to: Role) => void;
  setMsgDraft: (text: string) => void;
  escalateCompliance: () => void;
  handover: () => void;
  handback: () => void;
  markReviewed: () => void;
  decide: (decision: Decision) => void;
  confirmInstruction: () => void;
  sendMsg: () => void;
}

export function useCockpit(): Cockpit {
  const [role, setRole] = useState<Role | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgTo, setMsgToState] = useState<Role | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [ready, setReady] = useState(false);

  // Last serialized value we wrote or read, so sync skips redundant updates and
  // does not clobber a pending local change with an identical remote one.
  const lastRaw = useRef<string>("");
  // Mirror of cases for the actions, avoiding stale closures inside update().
  const casesRef = useRef<Case[]>([]);
  casesRef.current = cases;

  const persist = useCallback((next: Case[]) => {
    const raw = JSON.stringify(next);
    lastRaw.current = raw;
    try {
      localStorage.setItem(CASES_KEY, raw);
    } catch {
      // ignore quota / unavailable storage
    }
  }, []);

  const update = useCallback(
    (id: string, fn: (c: Case) => Case) => {
      const next = casesRef.current.map((c) => (c.id === id ? fn({ ...c }) : c));
      persist(next);
      setCases(next);
    },
    [persist],
  );

  const sync = useCallback(() => {
    try {
      const raw = localStorage.getItem(CASES_KEY);
      if (!raw || raw === lastRaw.current) return;
      lastRaw.current = raw;
      setCases(JSON.parse(raw) as Case[]);
    } catch {
      // ignore parse / unavailable storage
    }
  }, []);

  // Mount: seed or load cases, restore role, then start the cross-window sync.
  useEffect(() => {
    let loaded = readCases();
    if (!loaded || !loaded.length) {
      loaded = seedCases();
      persist(loaded);
    } else {
      lastRaw.current = JSON.stringify(loaded);
    }
    let restored: Role | null = null;
    try {
      restored = (sessionStorage.getItem(ROLE_KEY) as Role | null) || null;
    } catch {
      restored = null;
    }
    setCases(loaded);
    setRole(restored);
    setMsgToState(restored ? defaultRecipient(restored) : null);
    setReady(true);

    // Live mode: replace the local/seed state once the backend responds; on failure
    // or timeout the local state stands, so the demo never blocks on a dead backend.
    let cancelled = false;
    if (USE_BACKEND) {
      hydrateFromBackend().then((live) => {
        if (cancelled || !live || !live.length) return;
        persist(live);
        setCases(live);
      });
    }

    const poll = window.setInterval(sync, POLL_MS);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CASES_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("storage", onStorage);
    };
  }, [persist, sync]);

  const pick = useCallback((next: Role) => {
    try {
      sessionStorage.setItem(ROLE_KEY, next);
    } catch {
      // ignore
    }
    setRole(next);
    setSelectedId(null);
    setMsgToState(defaultRecipient(next));
    setMsgDraft("");
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(ROLE_KEY);
    } catch {
      // ignore
    }
    setRole(null);
    setSelectedId(null);
  }, []);

  const select = useCallback(
    (id: string) => {
      const c = casesRef.current.find((x) => x.id === id);
      setSelectedId(id);
      setMsgToState(role ? defaultRecipient(role) : null);
      setMsgDraft("");
      if (!c || !role) return;

      // Opening a case can: move a flagged case into Compliance review, clear the
      // case-level unread, and clear the unread dot on messages addressed to the
      // viewer. Apply them in one update; two sequential updates would each read the
      // pre-update mirror and clobber one another.
      const opensForReview =
        role === "compliance" && (c.status === "flagged_by_rm" || c.status === "escalated_by_am");
      const clearsCaseUnread = role === "compliance" && !opensForReview && c.unread;
      const clearsMsgUnread = (c.messages || []).some((m) => m.to === role && !m.read);
      if (!opensForReview && !clearsCaseUnread && !clearsMsgUnread) return;

      update(id, (x) => {
        if (opensForReview) {
          x.status = "in_compliance_review";
          x.unread = false;
          x.audit = [
            ...x.audit,
            { ts: now(), actor: "Sofia Keller · Compliance", action: "Opened case, review started" },
          ];
        } else if (clearsCaseUnread) {
          x.unread = false;
        }
        if (clearsMsgUnread) {
          x.messages = (x.messages || []).map((m) => (m.to === role ? { ...m, read: true } : m));
        }
        return x;
      });
    },
    [role, update],
  );

  // first line -> second line (up)
  const escalateCompliance = useCallback(() => {
    if (!selectedId || !role) return;
    const actor = role === "am" ? "Marco Reuss · AM" : "Lena Brunner · RM";
    const st = role === "am" ? "escalated_by_am" : "flagged_by_rm";
    update(selectedId, (x) => {
      x.status = st;
      x.unread = true;
      x.audit = [...x.audit, { ts: now(), actor, action: "Escalated to Compliance (1st -> 2nd line)" }];
      return x;
    });
  }, [selectedId, role, update]);

  // RM -> AM handover (sideways, within 1st line)
  const handover = useCallback(() => {
    if (!selectedId) return;
    update(selectedId, (x) => {
      x.status = "handed_to_am";
      x.owner = "am";
      x.amUnread = true;
      x.audit = [
        ...x.audit,
        { ts: now(), actor: "Lena Brunner · RM", action: "Handed over to Account Manager (1st-line reassignment)" },
      ];
      return x;
    });
  }, [selectedId, update]);

  // AM -> RM hand back
  const handback = useCallback(() => {
    if (!selectedId) return;
    update(selectedId, (x) => {
      x.status = "open";
      x.owner = "rm";
      x.audit = [
        ...x.audit,
        { ts: now(), actor: "Marco Reuss · AM", action: "Handed back to Relationship Manager" },
      ];
      return x;
    });
  }, [selectedId, update]);

  const markReviewed = useCallback(() => {
    if (!selectedId || !role) return;
    const actor = role === "am" ? "Marco Reuss · AM" : "Lena Brunner · RM";
    update(selectedId, (x) => {
      x.status = "reviewed";
      x.audit = [...x.audit, { ts: now(), actor, action: "Reviewed, no change" }];
      return x;
    });
  }, [selectedId, role, update]);

  // compliance decisions (the only path that "acts")
  const decide = useCallback(
    (decision: Decision) => {
      if (!selectedId) return;
      const labels: Record<Decision, string> = {
        re_kyc: "Required Re-KYC (instruction to 1st line)",
        doc_request: "Requested document (instruction to 1st line)",
        watchlist: "Added to watchlist",
        mlro: "Escalated to MLRO",
        dismiss: "Dismissed, no action",
      };
      // Live mode: persist the decision to the backend audit trail too. Fire and
      // forget with errors swallowed; the local update below is the demo source of
      // truth and must stand even if the backend is slow or offline.
      if (USE_BACKEND) {
        api.decide(selectedId, DECISION_TO_ACTION[decision], labels[decision]).catch(() => {});
      }
      update(selectedId, (x) => {
        x.status = "decided";
        x.decision = decision;
        x.instructionDone = false;
        x.unread = false;
        x.audit = [...x.audit, { ts: now(), actor: "Sofia Keller · Compliance", action: labels[decision] }];
        return x;
      });
    },
    [selectedId, update],
  );

  const confirmInstruction = useCallback(() => {
    if (!selectedId || !role) return;
    const c = casesRef.current.find((x) => x.id === selectedId);
    if (!c) return;
    const actor = role === "am" ? "Marco Reuss · AM" : "Lena Brunner · RM";
    const act = c.decision === "re_kyc" ? "Confirmed Re-KYC initiated" : "Confirmed document provided to Compliance";
    update(selectedId, (x) => {
      x.instructionDone = true;
      x.audit = [...x.audit, { ts: now(), actor, action: act }];
      return x;
    });
  }, [selectedId, role, update]);

  const sendMsg = useCallback(() => {
    if (!selectedId || !msgTo || !role) return;
    const text = msgDraft.trim();
    if (!text) return;
    update(selectedId, (x) => {
      x.messages = [...(x.messages || []), { from: role, to: msgTo, text, ts: now() }];
      return x;
    });
    setMsgDraft("");
  }, [selectedId, msgTo, role, msgDraft, update]);

  const setMsgTo = useCallback((to: Role) => setMsgToState(to), []);

  return {
    role,
    cases,
    selectedId,
    msgTo,
    msgDraft,
    ready,
    pick,
    logout,
    select,
    setMsgTo,
    setMsgDraft,
    escalateCompliance,
    handover,
    handback,
    markReviewed,
    decide,
    confirmInstruction,
    sendMsg,
  };
}
