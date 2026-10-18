"use client";

import { useMemo } from "react";
import { designFromTemplate, type InviteContent, type InviteDesign } from "@/lib/domain/invite-studio";
import { InviteCard } from "./invite-card";

/** A small, static preview of a card on its envelope colour. */
export function CardThumb({ content, design, className }: { content: InviteContent; design: InviteDesign; className?: string }) {
  return (
    <div className={`grid place-items-center overflow-hidden ${className ?? ""}`} style={{ background: `linear-gradient(160deg, ${design.colors.background}, ${design.colors.envelope})` }}>
      <InviteCard content={content} design={design} className="h-[86%] w-auto drop-shadow-[0_10px_18px_rgba(40,20,10,.22)]" />
    </div>
  );
}

export function TemplateThumb({ templateId, content, className }: { templateId: string; content: InviteContent; className?: string }) {
  const design = useMemo(() => designFromTemplate(templateId), [templateId]);
  return <CardThumb content={content} design={design} className={className} />;
}
