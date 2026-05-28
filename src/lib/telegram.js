/**
 * Telegram WebApp SDK Wrapper
 * Provides safe access to window.Telegram.WebApp with fallbacks for development
 */

const tg = window.Telegram?.WebApp;

export const telegram = {
  get raw() {
    return tg;
  },

  get isAvailable() {
    return !!tg;
  },

  get initData() {
    return tg?.initData || '';
  },

  get initDataUnsafe() {
    return tg?.initDataUnsafe || {};
  },

  get user() {
    return tg?.initDataUnsafe?.user || null;
  },

  get userId() {
    return tg?.initDataUnsafe?.user?.id || null;
  },

  get username() {
    return tg?.initDataUnsafe?.user?.username || 'Guest';
  },

  get firstName() {
    return tg?.initDataUnsafe?.user?.first_name || 'Player';
  },

  get lastName() {
    return tg?.initDataUnsafe?.user?.last_name || '';
  },

  get languageCode() {
    return tg?.initDataUnsafe?.user?.language_code || 'en';
  },

  get colorScheme() {
    return tg?.colorScheme || 'dark';
  },

  get platform() {
    return tg?.platform || 'unknown';
  },

  get viewportHeight() {
    return tg?.viewportHeight || window.innerHeight;
  },

  get viewportStableHeight() {
    return tg?.viewportStableHeight || window.innerHeight;
  },

  /** Initialize the Mini App */
  init() {
    if (!tg) {
      console.warn('[Telegram] WebApp SDK not available — running in dev mode');
      return;
    }
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0a0e1a');
    tg.setBackgroundColor('#0a0e1a');
    tg.enableClosingConfirmation();
  },

  /** Haptic feedback */
  haptic: {
    impact(style = 'medium') {
      tg?.HapticFeedback?.impactOccurred(style);
    },
    notification(type = 'success') {
      tg?.HapticFeedback?.notificationOccurred(type);
    },
    selection() {
      tg?.HapticFeedback?.selectionChanged();
    },
  },

  /** Back button */
  backButton: {
    show() {
      tg?.BackButton?.show();
    },
    hide() {
      tg?.BackButton?.hide();
    },
    onClick(callback) {
      tg?.BackButton?.onClick(callback);
    },
    offClick(callback) {
      tg?.BackButton?.offClick(callback);
    },
  },

  /** Main button */
  mainButton: {
    show(text, color) {
      if (!tg?.MainButton) return;
      tg.MainButton.text = text;
      if (color) tg.MainButton.color = color;
      tg.MainButton.show();
    },
    hide() {
      tg?.MainButton?.hide();
    },
    onClick(callback) {
      tg?.MainButton?.onClick(callback);
    },
    offClick(callback) {
      tg?.MainButton?.offClick(callback);
    },
    showProgress() {
      tg?.MainButton?.showProgress();
    },
    hideProgress() {
      tg?.MainButton?.hideProgress();
    },
  },

  /** Open invoice for Telegram Stars payment */
  openInvoice(url) {
    return new Promise((resolve) => {
      if (!tg) {
        resolve('failed');
        return;
      }
      tg.openInvoice(url, (status) => resolve(status));
    });
  },

  /** Open a Telegram link */
  openTelegramLink(url) {
    tg?.openTelegramLink(url);
  },

  /** Open external link */
  openLink(url) {
    tg?.openLink(url);
  },

  /** Show popup */
  showPopup(params) {
    return new Promise((resolve) => {
      if (!tg) {
        resolve(null);
        return;
      }
      tg.showPopup(params, (buttonId) => resolve(buttonId));
    });
  },

  /** Show alert */
  showAlert(message) {
    return new Promise((resolve) => {
      if (!tg) {
        alert(message);
        resolve();
        return;
      }
      tg.showAlert(message, resolve);
    });
  },

  /** Show confirm */
  showConfirm(message) {
    return new Promise((resolve) => {
      if (!tg) {
        resolve(confirm(message));
        return;
      }
      tg.showConfirm(message, resolve);
    });
  },

  /** Share via Telegram */
  shareUrl(url, text = '') {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    tg?.openTelegramLink(shareUrl);
  },

  /** Cloud storage */
  cloudStorage: {
    getItem(key) {
      return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
          resolve(localStorage.getItem(key));
          return;
        }
        tg.CloudStorage.getItem(key, (err, value) => resolve(err ? null : value));
      });
    },
    setItem(key, value) {
      return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
          localStorage.setItem(key, value);
          resolve(true);
          return;
        }
        tg.CloudStorage.setItem(key, value, (err) => resolve(!err));
      });
    },
  },

  /** Event listeners */
  on(event, callback) {
    tg?.onEvent(event, callback);
  },
  off(event, callback) {
    tg?.offEvent(event, callback);
  },

  /** Close Mini App */
  close() {
    tg?.close();
  },

  /** Get start param from deep link */
  get startParam() {
    return tg?.initDataUnsafe?.start_param || null;
  },
};

export default telegram;
