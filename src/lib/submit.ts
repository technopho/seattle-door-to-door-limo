// Lead/booking submission. Set PUBLIC_LEAD_ENDPOINT (e.g. a GoHighLevel inbound webhook,
// Zapier/Make hook, Formspree form URL) at build time — see README "Booking requests".
// With no endpoint configured, submitLead() returns { ok: false, reason: 'no-endpoint' } so the
// UI can fall back to phone / SMS / email instead of pretending the request was sent.

export type LeadKind = 'booking' | 'contact';
export type SubmitResult = { ok: true } | { ok: false; reason: 'no-endpoint' | 'network' | 'rejected'; status?: number };

const ENDPOINT: string | undefined = import.meta.env.PUBLIC_LEAD_ENDPOINT;

export const hasLeadEndpoint = () => Boolean(ENDPOINT);

export async function submitLead(kind: LeadKind, data: Record<string, unknown>): Promise<SubmitResult> {
  // Honeypot: bots fill every field, people never see this one.
  if (typeof data.company_website === 'string' && data.company_website.trim() !== '') return { ok: true };
  if (!ENDPOINT) return { ok: false, reason: 'no-endpoint' };

  const payload = {
    kind,
    source: 'seattledoortodoorlimo.com',
    page: location.pathname,
    submittedAt: new Date().toISOString(),
    ...data,
  };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, reason: 'rejected', status: res.status };
    (window as Window & { dataLayer?: unknown[] }).dataLayer?.push({ event: `${kind}_submitted` });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Plain-text summary for SMS/email fallbacks, e.g. "Pickup: …\nDate: …". */
export function toPlainText(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '' && k !== 'company_website')
    .map(([k, v]) => `${k.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join('\n');
}
