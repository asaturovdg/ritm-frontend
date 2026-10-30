const STORAGE_KEY = 'referral_code';
const CLAIM_URL = 'https://ritmevents.ru/api/v1/referrals/claim';

// Telegram startapp only allows [A-Za-z0-9_-], and "_" is our separator.
const CODE_RE = /^[A-Za-z0-9]{1,48}$/;
const EVENT_PARAM_RE = /^event_(\d+)(?:_ref_([A-Za-z0-9]+))?$/;
const REF_PARAM_RE = /^ref_([A-Za-z0-9]+)$/;

export const isValidReferralCode = (code) => typeof code === 'string' && CODE_RE.test(code);

export const buildEventStartParam = (eventId, code) =>
  isValidReferralCode(code) ? `event_${eventId}_ref_${code}` : `event_${eventId}`;

export const buildAppStartParam = (code) => `ref_${code}`;

// Returns { eventId, code } for `event_<id>[_ref_<code>]`, otherwise null.
export const parseEventStartParam = (param) => {
  const match = EVENT_PARAM_RE.exec(param || '');
  return match ? { eventId: match[1], code: match[2] || null } : null;
};

// Returns the code for `ref_<code>`, otherwise null.
export const parseRefStartParam = (param) => REF_PARAM_RE.exec(param || '')?.[1] || null;

export const storeReferralCode = (code) => {
  if (!isValidReferralCode(code)) return;
  try {
    // First referrer wins: a later link must not overwrite the one that brought the user.
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage unavailable — the referral is simply not tracked
  }
};

export const readReferralCode = () => {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return isValidReferralCode(code) ? code : null;
  } catch {
    return null;
  }
};

export const clearReferralCode = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

// The start param is read after the SDK loads, which can be before or after auth finishes,
// so App calls this from both places; the in-flight flag keeps it to one request.
// Background call: never surfaces errors to the user. The stored code is dropped once the
// backend has given a final answer (claimed / ignored / unknown code / malformed code);
// on 401, 5xx or network errors it is kept so the next app start retries.
let claimInFlight = false;

export const claimStoredReferral = async (token) => {
  const code = readReferralCode();
  if (!code || !token || claimInFlight) return;

  claimInFlight = true;
  try {
    const res = await fetch(CLAIM_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok || res.status === 404 || res.status === 422) clearReferralCode();
  } catch {
    // retry on next start
  } finally {
    claimInFlight = false;
  }
};
