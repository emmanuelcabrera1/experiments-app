/**
 * Service Worker Registration
 * Moved to external file to comply with Content Security Policy
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use relative path for GitHub Pages subdirectory support
        const swPath = new URL('./sw.js?v=v1.0.4-DEBUG', window.location.href).href;
        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('[App] Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.error('[App] Service Worker registration failed:', error);
            });
    });
}
