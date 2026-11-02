import clsx from "clsx";
import { severityForPercent } from "../lib/format";

interface Props {
  percent: number;
  variant?: "ink" | "accent" | "severity" | "ok" | "warn" | "crit";
  thin?: boolean;
}

export function Bar({ percent, variant = "ink", thin }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const sev = variant === "severity" ? severityForPercent(clamped) : null;
  return (
    <div className={clsx("sp-bar", thin && "sp-bar--thin")}>
      <div
        className={clsx(
          "sp-bar__fill",
          variant === "accent" && "sp-bar__fill--accent",
          variant === "ok" && "sp-bar__fill--ok",
          variant === "warn" && "sp-bar__fill--warn",
          variant === "crit" && "sp-bar__fill--crit",
          sev === "ok" && "sp-bar__fill--ok",
          sev === "warn" && "sp-bar__fill--warn",
          sev === "crit" && "sp-bar__fill--crit"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
