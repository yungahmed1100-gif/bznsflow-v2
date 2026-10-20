import { STRING_KEYS } from '../../../lib/dashboard/strings';

/** Rasil's own wording for a refusal, else the dashboard's shared one. */
/** Why a campaign stopped or paused, in words when there are any, else the code itself. */
export const stopReason = (s, code) => (STRING_KEYS.includes(`rasil_reason_${code}`) ? s.t(`rasil_reason_${code}`) : code);

export const emailReason =(s, code) => (STRING_KEYS.includes(`rasil_err_${code}`) ? s.t(`rasil_err_${code}`) : s.reason(code));
