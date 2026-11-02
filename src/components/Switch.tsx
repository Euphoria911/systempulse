import clsx from "clsx";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label
      className={clsx("sp-switch", checked && "sp-switch--on")}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <span className="sp-switch__box">
        <span className="sp-switch__dot" />
      </span>
      <span className="sp-label" style={{ color: "var(--ink)" }}>
        {label}
      </span>
    </label>
  );
}
