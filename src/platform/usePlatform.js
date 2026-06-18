import { useAuth } from '../components/AuthContext.jsx';
import { useToast } from '../components/Toast/ToastContext.jsx';

const BOT = 'ritmevents_bot';

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

const buildShareText = (title, eventType, url) => {
  const type = Array.isArray(eventType) ? eventType.join(', ') : (eventType || '');
  return `Смотри, что нашёл рИТм!\n${type}\n${title}\n\n${url}`;
};

export const shareEventForPlatform = async (id, title, eventType, platform, showToast) => {
  if (platform === 'telegram') {
    const eventUrl = `https://t.me/${BOT}?startapp=event_${id}`;
    const text = buildShareText(title, eventType, eventUrl);
    const shareUrl = `https://t.me/share/url?${new URLSearchParams({ url: eventUrl, text })}`;
    window.Telegram?.WebApp?.openTelegramLink(shareUrl);
  } else if (platform === 'max') {
    const eventUrl = `https://max.ru/${BOT}?startapp=event_${id}`;
    await navigator.clipboard.writeText(buildShareText(title, eventType, eventUrl));
    showToast?.('Ссылка скопирована');
  } else {
    const eventUrl = `${window.location.origin}/events/${id}`;
    const text = buildShareText(title, eventType, eventUrl);
    if (navigator.share) {
      await navigator.share({ url: eventUrl, title: text });
    } else {
      await navigator.clipboard.writeText(text);
      showToast?.('Ссылка скопирована');
    }
  }
};

export function usePlatform() {
  const { platform } = useAuth();
  const showToast = useToast();
  return {
    platform,
    openLink: (url) => openLinkForPlatform(url, platform),
    showAlert: (msg) => showAlertForPlatform(msg, platform),
    expandApp: () => expandAppForPlatform(platform),
    shareEvent: (id, title, eventType) => shareEventForPlatform(id, title, eventType, platform, showToast),
  };
}
