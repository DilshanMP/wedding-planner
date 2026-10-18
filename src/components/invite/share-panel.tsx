"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, MessageCircle } from "lucide-react";
import { inviteLink, shareMessage, type InviteContent } from "@/lib/domain/invite-studio";
import { useToast } from "@/components/shell/toast";

/** Link, QR code, WhatsApp and copy for one published invitation. */
export function SharePanel({ slug, content }: { slug: string; content: InviteContent }) {
  const toast = useToast();
  const [qr, setQr] = useState<{ slug: string; url: string } | null>(null);
  // Only rendered in the browser (studio pages wait for the wedding to load).
  const link = inviteLink(typeof window === "undefined" ? "" : window.location.origin, slug);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#3B2A26", light: "#FFFFFF" } }).then(
      (url) => alive && setQr({ slug, url }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [link, slug]);
  const code = qr?.slug === slug ? qr.url : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied.");
    } catch {
      toast("Couldn't copy — select the link and copy it.", "danger");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-sunken px-3 py-2">
        <input readOnly value={link} aria-label="Invitation link" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="wos-btn wos-btn--secondary wos-btn--sm" onClick={copy}><Copy className="wos-icon" aria-hidden="true" />Copy</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className="wos-btn wos-btn--primary wos-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(shareMessage(content, link))}`} target="_blank" rel="noreferrer"><MessageCircle className="wos-icon" aria-hidden="true" />WhatsApp</a>
        <a className="wos-btn wos-btn--secondary wos-btn--sm" href={link} target="_blank" rel="noreferrer"><ExternalLink className="wos-icon" aria-hidden="true" />Open</a>
        {code && <a className="wos-btn wos-btn--secondary wos-btn--sm" href={code} download={`invitation-qr-${slug}.png`}><Download className="wos-icon" aria-hidden="true" />QR code</a>}
      </div>
      {code && (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={code} alt={`QR code for ${link}`} className="size-40 self-start rounded-[var(--radius-md)] border border-line bg-white p-2" />
      )}
    </div>
  );
}
