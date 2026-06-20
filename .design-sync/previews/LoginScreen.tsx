import { LoginScreen } from "driftwatch-frontend";

// Full-screen seat picker; flex-1 inside the app shell, so give it a sized frame.
export function SeatPicker() {
  return (
    <div style={{ height: 680, display: "flex", background: "oklch(0.97 0 0)" }}>
      <LoginScreen onPick={() => {}} />
    </div>
  );
}
