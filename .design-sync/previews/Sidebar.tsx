import { Sidebar, buildView, seedCases } from "driftwatch-frontend";

const cases = seedCases();

function frame(node: React.ReactNode) {
  return <div style={{ height: 520, display: "flex" }}>{node}</div>;
}

export function RelationshipManager() {
  const view = buildView({ role: "rm", cases, selectedId: null, msgTo: null });
  return frame(<Sidebar nav={view.nav} />);
}

export function Compliance() {
  const view = buildView({ role: "compliance", cases, selectedId: null, msgTo: null });
  return frame(<Sidebar nav={view.nav} />);
}
