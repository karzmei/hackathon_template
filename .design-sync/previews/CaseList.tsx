import { CaseList } from "driftwatch-frontend";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";

const cases = seedCases();

function frame(node: React.ReactNode) {
  return <div style={{ height: 620, display: "flex" }}>{node}</div>;
}

export function RMBook() {
  const view = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: null });
  return frame(<CaseList view={view} onSelect={() => {}} />);
}

export function ComplianceInbox() {
  const view = buildView({ role: "compliance", cases, selectedId: "castor", msgTo: null });
  return frame(<CaseList view={view} onSelect={() => {}} />);
}
