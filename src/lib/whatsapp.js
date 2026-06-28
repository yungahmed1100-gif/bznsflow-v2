// WhatsApp is the primary conversion channel. Build click-to-chat deep links with
// a context-specific prefilled message so the visitor lands in a warm conversation.
export const WHATSAPP_NUMBER = '201036755930';

export function waLink(message) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
