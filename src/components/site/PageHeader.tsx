import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
}) {
  return (
    <section className="relative pt-40 pb-20 border-b border-champagne/10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, var(--color-champagne) 0%, transparent 60%)",
        }}
      />
      <div className="container-luxe text-center max-w-3xl relative">
        <div className="eyebrow mb-5">{eyebrow}</div>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-vanilla">{title}</h1>
        {intro && (
          <p className="mt-6 text-base md:text-lg text-vanilla/65 leading-relaxed">{intro}</p>
        )}
        <div className="mt-8 flex justify-center"><span className="hairline" /></div>
      </div>
    </section>
  );
}
