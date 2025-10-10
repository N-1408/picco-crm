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
