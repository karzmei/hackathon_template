import { AppHeader } from "driftwatch-frontend";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";

const cases = seedCases();

function frame(node: React.ReactNode) {
  return <div style={{ width: 1080, maxWidth: "100%" }}>{node}</div>;
}

export function Compliance() {
  // Compliance role shows the inbox pill with the unread pulse.
  const view = buildView({ role: "compliance", cases, selectedId: null, msgTo: null });
  return frame(<AppHeader view={view} onLogout={() => {}} />);
}

export function RelationshipManager() {
  const view = buildView({ role: "rm", cases, selectedId: null, msgTo: null });
  return frame(<AppHeader view={view} onLogout={() => {}} />);
}
