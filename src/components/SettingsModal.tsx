import { useState } from "react";
import { Switch } from "./Switch";

interface Props {
  open: boolean;
  intervalMs: number;
  alwaysOnTop: boolean;
  onClose: () => void;
  onApply: (intervalMs: number, alwaysOnTop: boolean) => void;
}

export function SettingsModal({ open, intervalMs, alwaysOnTop, onClose, onApply }: Props) {
  const [interval, setInterval] = useState(intervalMs);
  const [onTop, setOnTop] = useState(alwaysOnTop);
  if (!open) return null;

  return (
    <div className="sp-modal__backdrop" onClick={onClose}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal__title">SETTINGS</div>

        <div className="sp-field">
          <label className="sp-label">Refresh interval</label>
          <select
            className="sp-input"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          >
            <option value={500}>500 ms (fast)</option>
            <option value={1000}>1 second</option>
            <option value={2000}>2 seconds</option>
            <option value={5000}>5 seconds (low CPU)</option>
          </select>
        </div>

        <div className="sp-field">
          <Switch checked={onTop} onChange={setOnTop} label="Always on top" />
        </div>

        <div className="sp-row sp-row--between" style={{ marginTop: 4 }}>
          <button className="sp-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="sp-btn sp-btn--accent"
            onClick={() => {
              onApply(interval, onTop);
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
