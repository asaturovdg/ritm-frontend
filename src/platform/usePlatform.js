import { useAuth } from '../components/AuthContext.jsx';

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

export function usePlatform() {
  const { platform } = useAuth();
  return {
    platform,
    openLink: (url) => openLinkForPlatform(url, platform),
    showAlert: (msg) => showAlertForPlatform(msg, platform),
    expandApp: () => expandAppForPlatform(platform),
  };
}
