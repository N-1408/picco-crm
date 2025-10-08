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
  const background = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type] ?? 'bg-gray-800';

  toast.className = `text-white px-4 py-3 rounded shadow-lg ${background} animate-slide-in`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

export function renderEmptyState(container, message) {
  container.innerHTML = `
    <div class="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-lg">
      ${message}
    </div>
  `;
}
