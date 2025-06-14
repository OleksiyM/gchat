const appConfig = {
    logLevel: 'info' // Default log level: 'debug', 'info', or 'error'
};

const logger = {
    debug: (...args) => appConfig.logLevel === 'debug' && console.log('[DEBUG]', ...args),
    info: (...args) => ['debug', 'info'].includes(appConfig.logLevel) && console.info('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args), // Errors are always logged
};

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.zIndex = '1001'; // Above settings modal
    notification.style.transition = 'opacity 0.5s ease'; // For fade out effect

    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'green';
            break;
        case 'error':
            notification.style.backgroundColor = 'red';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = 'blue';
            break;
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0'; // Start fade out
        setTimeout(() => {
            notification.remove();
        }, 500); // Remove after fade out animation
    }, duration);
}

document.addEventListener('DOMContentLoaded', () => {
    logger.info('gChat App Initialized');

    // --- Example: Settings Modal Toggle ---
    const settingsButton = document.getElementById('open-settings-btn'); // In sidebar-actions
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-btn');
    const settingsTabButtons = document.querySelectorAll('.settings-tab-btn');
    const settingsTabPanes = document.querySelectorAll('.settings-tab-pane');

    // Open Settings Modal
    if (settingsButton && settingsModal) {
        settingsButton.addEventListener('click', () => {
            settingsModal.style.display = 'flex'; // Use flex as per new CSS
            logger.info('Settings modal shown');
            showNotification('Settings opened.', 'info', 2000);
        });
    } else {
        logger.error('Main settings button (#open-settings-btn) or modal (#settings-modal) not found.');
    }

    // Close Settings Modal
    if (closeSettingsButton && settingsModal) {
        closeSettingsButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
            logger.info('Settings modal hidden');
        });
    } else {
        logger.error('Close settings button (#close-settings-btn) not found.');
    }

    // Settings Tab Switching
    if (settingsTabButtons.length > 0 && settingsTabPanes.length > 0) {
        settingsTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Deactivate all buttons and panes
                settingsTabButtons.forEach(btn => btn.classList.remove('active'));
                settingsTabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    pane.style.display = 'none';
                });

                // Activate clicked button and corresponding pane
                button.classList.add('active');
                const targetPane = document.getElementById(`settings-${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                    targetPane.style.display = 'block';
                    logger.info(`Switched to settings tab: ${targetTab}`);
                } else {
                    logger.error(`Settings tab pane for ${targetTab} not found.`);
                }
            });
        });
    } else {
        logger.warn('Settings tab buttons or panes not found. Tab functionality will be missing.');
    }

    // --- Example Test Notifications (remove later) ---
    // showNotification('This is an info message.');
    // showNotification('Action successful!', 'success', 5000);
    // showNotification('An error occurred!', 'error');
    // appConfig.logLevel = 'debug';
    // logger.debug('This is a debug message.');
    // appConfig.logLevel = 'info';

    registerServiceWorker(); // Register the service worker
});

// --- Service Worker Registration ---
// Note: The logger used here is the main app's logger, not the SW's logger.
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          logger.info('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(err => {
          logger.error('ServiceWorker registration failed: ', err);
        });
    });
  } else {
    logger.info('Service workers are not supported in this browser.');
  }
};
