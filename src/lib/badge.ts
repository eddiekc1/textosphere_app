export function parseBadgeCount(rawValue: unknown): number {
  if (rawValue == null) {
    return 0;
  }

  let value = rawValue;
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return 0;
    }

    try {
      value = JSON.parse(trimmed);
    } catch {
      value = trimmed;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const payload = value as Record<string, unknown>;
    return parseBadgeCount(payload.count ?? payload.badge ?? payload.unread);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? clampBadgeCount(Math.round(value)) : 0;
  }

  const normalized = String(value).replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
  );

  const plusMatch = normalized.match(/\d+\s*\+/);
  if (plusMatch) {
    const number = plusMatch[0].match(/\d+/);
    return number ? clampBadgeCount(Number(number[0])) : 0;
  }

  const match = normalized.match(/-?\d+/);
  return match ? clampBadgeCount(Number(match[0])) : 0;
}

function clampBadgeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, 9999);
}

export const badgeObserverScript = `
(function () {
  if (window.__textosphereBadgeObserverInstalled) {
    if (window.__textosphereBadgePost) {
      window.__textosphereBadgePost();
    }
    true;
    return;
  }

  window.__textosphereBadgeObserverInstalled = true;

  function normalizeDigits(value) {
    return String(value || '').replace(/[０-９]/g, function (digit) {
      return String.fromCharCode(digit.charCodeAt(0) - 0xfee0);
    });
  }

  function parseCount(value) {
    var text = normalizeDigits(value).trim();
    if (!text) {
      return null;
    }

    var plus = text.match(/(\\d+)\\s*\\+/);
    if (plus) {
      return Number(plus[1]);
    }

    var number = text.match(/-?\\d+/);
    return number ? Math.max(0, Number(number[0])) : null;
  }

  function readFromElement(element) {
    if (!element) {
      return null;
    }

    var attributes = [
      'data-notification-count',
      'data-unread-count',
      'data-badge-count',
      'data-count',
      'aria-label',
      'title'
    ];

    for (var i = 0; i < attributes.length; i += 1) {
      var count = parseCount(element.getAttribute(attributes[i]));
      if (count !== null) {
        return count;
      }
    }

    return parseCount(element.textContent);
  }

  function findUnreadCount() {
    if (window.TextosphereNativeBadgeCount !== undefined) {
      var explicitGlobal = parseCount(window.TextosphereNativeBadgeCount);
      if (explicitGlobal !== null) {
        return explicitGlobal;
      }
    }

    var meta = document.querySelector(
      'meta[name="textosphere-unread-count"], meta[name="notification-count"]'
    );
    var explicitMeta = readFromElement(meta);
    if (explicitMeta !== null) {
      return explicitMeta;
    }

    var selectors = [
      '[data-notification-count]',
      '[data-unread-count]',
      '[data-badge-count]',
      '[aria-label*="通知"]',
      '[aria-label*="未読"]',
      '[aria-label*="notification" i]',
      '[aria-label*="unread" i]',
      '.notification-badge',
      '.notifications-badge',
      '.unread-badge',
      '.badge-notification',
      '.badge-unread',
      '[class*="notification"][class*="badge" i]',
      '[class*="unread"][class*="badge" i]'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j += 1) {
        var count = readFromElement(nodes[j]);
        if (count !== null) {
          return count;
        }
      }
    }

    return 0;
  }

  function postCount(count) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ count: count }));
    }
  }

  window.TextosphereNativeBadge = {
    setCount: function (count) {
      var parsed = parseCount(count);
      postCount(parsed === null ? 0 : parsed);
    }
  };

  window.__textosphereBadgePost = function () {
    postCount(findUnreadCount());
  };

  var timer = null;
  function schedulePost() {
    window.clearTimeout(timer);
    timer = window.setTimeout(window.__textosphereBadgePost, 200);
  }

  new MutationObserver(schedulePost).observe(document.documentElement, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });

  window.__textosphereBadgePost();
  true;
})();
`;
