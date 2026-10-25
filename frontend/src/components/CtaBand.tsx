import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export function CtaBand({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="cta-band">
      <Reveal className="container cta-band__inner">
        <div>
          <h2 className="cta-band__title">{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-band__actions">{children}</div>
      </Reveal>
    </section>
  );
}
