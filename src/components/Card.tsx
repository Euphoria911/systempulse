import type { ReactNode } from "react";
import clsx from "clsx";

interface Props {
  title: string;
  meta?: string;
  children: ReactNode;
  compact?: boolean;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, meta, children, compact, className, action }: Props) {
  return (
    <section className={clsx("sp-card", compact && "sp-card--compact", className)}>
      <header className="sp-card__head">
        <div className="sp-row">
          <span className="sp-card__title">{title}</span>
          {meta && <span className="sp-card__meta">{meta}</span>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
