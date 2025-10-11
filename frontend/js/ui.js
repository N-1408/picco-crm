const toastContainerId = 'picco-toast-container';

function ensureToastContainer() {
  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement('div');
    container.id = toastContainerId;
    container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-3';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'success') {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `picco-toast picco-toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('picco-toast--exit');
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

export function renderEmptyState(container, message) {
  container.innerHTML = `<div class="picco-empty">${message}</div>`;
}

export function initBottomNavigation(currentPage) {
  const nav = document.querySelector('[data-bottom-nav]');
  if (!nav) return;

  const items = Array.from(nav.querySelectorAll('[data-nav-link]'));

  const applyState = (element, isActive) => {
    element.classList.toggle('is-active', isActive);
    if (isActive) {
      element.setAttribute('aria-current', 'page');
    } else {
      element.removeAttribute('aria-current');
    }

    const iconSpan = element.querySelector('[data-icon]');
    if (iconSpan) {
      iconSpan.classList.remove('material-icons', 'material-icons-outlined');
      iconSpan.classList.add(isActive ? 'material-icons' : 'material-icons-outlined', 'picco-bottom-nav__item-icon');
      const iconName = element.dataset.icon ?? iconSpan.textContent?.trim();
      if (iconName) {
        iconSpan.textContent = iconName;
      }
    }
  };

  items.forEach((item) => {
    const iconSpan = item.querySelector('[data-icon]');
    if (iconSpan) {
      const iconName = item.dataset.icon ?? iconSpan.textContent?.trim();
      if (iconName) {
        iconSpan.textContent = iconName;
      }
    }

    applyState(item, item.dataset.navLink === currentPage);

    const href = item.dataset.href;
    if (href && item.dataset.bound !== 'true') {
      item.addEventListener('click', () => {
        if (item.dataset.navLink === currentPage) return;
        window.location.href = href;
      });
      item.dataset.bound = 'true';
    }
  });
}
