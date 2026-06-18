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

export const shareEventForPlatform = async (id, title, platform, showToast) => {
  if (platform === 'telegram') {
    const eventUrl = `https://t.me/${BOT}?startapp=event_${id}`;
    const shareUrl = `https://t.me/share/url?${new URLSearchParams({ url: eventUrl, text: title })}`;
    window.Telegram?.WebApp?.openTelegramLink(shareUrl);
  } else if (platform === 'max') {
    const eventUrl = `https://max.ru/${BOT}?startapp=event_${id}`;
    await navigator.clipboard.writeText(eventUrl);
    showToast?.('Ссылка скопирована');
  } else {
    const eventUrl = `${window.location.origin}/events/${id}`;
    if (navigator.share) {
      await navigator.share({ url: eventUrl, title });
    } else {
      await navigator.clipboard.writeText(eventUrl);
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
    shareEvent: (id, title) => shareEventForPlatform(id, title, platform, showToast),
  };
}
