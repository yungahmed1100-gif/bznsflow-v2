// The opt-out boundary: a whole-message STOP is final, decided here and never by the model.
//
// NOTHING IN HERE MAY BE LOOSENED CASUALLY. This is a compliance boundary (Meta policy and
// consent): a customer who says stop is never messaged again by Layla or a broadcast.

const OPT_OUT = /^(please\s+)?(stop|unsubscribe|stopall|opt out|do not message me|توقف|إيقاف|ايقاف|لا تراسلني|إلغاء الاشتراك)[.!؟]*$/;
// WhatsApp's marketing "Stop promotions" quick reply, matched on the tapped title.
export const STOP_BUTTON = /^(stop promotions?|stop|unsubscribe|opt out|إيقاف العروض|ايقاف العروض|إيقاف|ايقاف|إلغاء الاشتراك|الغاء الاشتراك)$/i;

/** True when the whole message asks Layla to stop messaging. */
export const isOptOut = text => OPT_OUT.test(String(text ?? '').trim().toLowerCase());
