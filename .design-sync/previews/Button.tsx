import { Button } from "driftwatch-frontend";
import { ArrowRight, Play, ShieldAlert } from "lucide-react";

// One cell per export. Realistic cockpit copy, not foo/bar.

export function Variants() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 16 }}>
      <Button variant="default">Open case</Button>
      <Button variant="brand">Run pipeline</Button>
      <Button variant="outline">Reviewed</Button>
      <Button variant="secondary">Hand over</Button>
      <Button variant="ghost">Dismiss</Button>
      <Button variant="destructive">Add to watchlist</Button>
      <Button variant="link">View evidence</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 16 }}>
      <Button variant="brand" size="xs">Run</Button>
      <Button variant="brand" size="sm">Run</Button>
      <Button variant="brand" size="default">Run pipeline</Button>
      <Button variant="brand" size="lg">Run pipeline</Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 16 }}>
      <Button variant="brand"><Play /> Run pipeline</Button>
      <Button variant="outline">Next case <ArrowRight /></Button>
      <Button variant="destructive"><ShieldAlert /> Escalate to MLRO</Button>
      <Button variant="ghost" size="icon" aria-label="Run"><Play /></Button>
    </div>
  );
}

export function States() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 16 }}>
      <Button variant="brand">Enabled</Button>
      <Button variant="brand" disabled>Disabled</Button>
      <Button variant="outline" disabled>Disabled</Button>
    </div>
  );
}
