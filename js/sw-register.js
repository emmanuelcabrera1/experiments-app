/**
 * Service Worker Registration
 * Handles registration, updates, and notifications
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use relative path for GitHub Pages subdirectory support
        const swPath = new URL('./sw.js', window.location.href).href;

        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('[App] Service Worker registered:', registration.scope);

                // Check for updates immediately
                registration.update();

                // Check for updates every 5 minutes
                setInterval(() => {
                    registration.update();
                }, 5 * 60 * 1000);

                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[App] New service worker installing...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            console.log('[App] New version available!');
                            showUpdateNotification(registration);
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[App] Service Worker registration failed:', error);
            });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[App] New service worker activated, reloading...');
            window.location.reload();
        });
    });
}

/**
 * Show update notification to user
 */
function showUpdateNotification(registration) {
    // If App.showToast is available, use it
    if (window.App && typeof window.App.showToast === 'function') {
        // Create a custom toast with update action
        const toastEl = document.createElement('div');
        toastEl.className = 'toast';
        toastEl.innerHTML = `
            <span>Update available!</span>
            <button class="toast-undo" id="update-now-btn">Update Now</button>
        `;
        toastEl.style.cssText = 'position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--text-primary); color: var(--bg-color); padding: 12px 20px; border-radius: 12px; z-index: 1000; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';

        document.body.appendChild(toastEl);

        // Handle update button click
        document.getElementById('update-now-btn').addEventListener('click', () => {
            // Tell the waiting SW to skip waiting and activate
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            toastEl.remove();
        });

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (toastEl.parentElement) {
                toastEl.style.opacity = '0';
                toastEl.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toastEl.remove(), 300);
            }
        }, 10000);
    } else {
        // Fallback: auto-update after short delay
        console.log('[App] Auto-updating in 2 seconds...');
        setTimeout(() => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }, 2000);
    }
}
