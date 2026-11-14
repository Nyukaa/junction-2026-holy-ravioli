import { Capybara } from "./Capybara";

export function CoachHeader({
  eyebrow,
  title,
  copy,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  compact?: boolean;
}) {
  return (
    <header className="flex items-start gap-3 px-5 pt-5">
      <Capybara size={compact ? 42 : 54} />
      <div className="flex-1">
        {eyebrow && (
          <div className="text-[11px] font-bold tracking-[0.14em] text-brand-green">
            {eyebrow}
          </div>
        )}
        <h1
          className={
            compact
              ? "mt-1 text-lg leading-snug font-bold text-slate-900"
              : "mt-1 text-2xl leading-tight font-bold text-slate-900"
          }
        >
          {title}
        </h1>
        {copy && (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{copy}</p>
        )}
      </div>
    </header>
  );
}
