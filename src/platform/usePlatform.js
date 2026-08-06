import { useAuth } from '../components/AuthContext.jsx';
import { useToast } from '../components/Toast/ToastContext.jsx';

const BOT = 'ritmevents_bot';

export const buildCalendarReturnUrl = (provider, eventId, platform) => {
  if (platform === 'telegram') return `https://t.me/${BOT}?startapp=cal_${provider}_${eventId}`;
  if (platform === 'max') return `https://max.ru/${BOT}?startapp=cal_${provider}_${eventId}`;
  return `https://app.ritmevents.ru?calendar_connected=true&provider=${provider}`;
};

export const buildCalendarErrorReturnUrl = (provider, eventId, platform) => {
  if (platform === 'telegram') return `https://t.me/${BOT}?startapp=calerr_${provider}_${eventId}`;
  if (platform === 'max') return `https://max.ru/${BOT}?startapp=calerr_${provider}_${eventId}`;
  return `https://app.ritmevents.ru?calendar_error=true`;
};

const openLinkForPlatform = (url, platform) => {
  if (platform === 'telegram' && window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
};

const showAlertForPlatform = (msg, platform) => {
  if (platform === 'telegram' && window.Telegram?.WebApp?.showAlert) {
    window.Telegram.WebApp.showAlert(msg);
  } else {
    alert(msg);
  }
};

const expandAppForPlatform = (platform) => {
  if (platform === 'telegram' && window.Telegram?.WebApp?.expand) {
    window.Telegram.WebApp.expand();
  }
};

const buildShareLines = (title, url) => {
  const lines = ['Смотри, что нашёл рИТм!', '', title];
  if (url) lines.push('', url);
  return lines.join('\n');
};

// Asks our backend to prepare a Telegram inline message (via Bot API
// savePreparedInlineMessage, which needs the bot token and so must happen
// server-side) that Telegram.WebApp.shareMessage can then hand off to the
// native chat-picker sheet. Returns the prepared message id, or null if the
// native flow isn't available/fails, so callers can fall back to clipboard.
const tryNativeTelegramShare = async (id, token) => {
  const tg = window.Telegram?.WebApp;
  if (!tg?.shareMessage || !tg?.isVersionAtLeast?.('8.0') || !token) return false;

  try {
    const res = await fetch(`https://ritmevents.ru/api/v1/events/${id}/share-message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const { message_id } = await res.json();
    if (!message_id) return false;

    await new Promise((resolve) => tg.shareMessage(message_id, resolve));
    return true;
  } catch {
    return false;
  }
};

export const shareEventForPlatform = async (id, title, eventType, platform, showToast, token) => {
  if (platform === 'telegram') {
    if (await tryNativeTelegramShare(id, token)) return;

    const eventUrl = `https://t.me/${BOT}?startapp=event_${id}`;
    await navigator.clipboard.writeText(buildShareLines(title, eventUrl));
    showToast?.('Ссылка скопирована');
  } else if (platform === 'max') {
    const eventUrl = `https://max.ru/${BOT}?startapp=event_${id}`;
    await navigator.clipboard.writeText(buildShareLines(title, eventUrl));
    showToast?.('Ссылка скопирована');
  } else {
    const eventUrl = `${window.location.origin}/events/${id}`;
    const text = buildShareLines(title, eventUrl);
    if (navigator.share) {
      await navigator.share({ url: eventUrl, title: text });
    } else {
      await navigator.clipboard.writeText(text);
      showToast?.('Ссылка скопирована');
    }
  }
};

export function usePlatform() {
  const { platform, token } = useAuth();
  const showToast = useToast();
  return {
    platform,
    openLink: (url) => openLinkForPlatform(url, platform),
    showAlert: (msg) => showAlertForPlatform(msg, platform),
    expandApp: () => expandAppForPlatform(platform),
    shareEvent: (id, title, eventType) => shareEventForPlatform(id, title, eventType, platform, showToast, token),
    buildCalendarReturnUrl: (provider, eventId) => buildCalendarReturnUrl(provider, eventId, platform),
    buildCalendarErrorReturnUrl: (provider, eventId) => buildCalendarErrorReturnUrl(provider, eventId, platform),
  };
}
