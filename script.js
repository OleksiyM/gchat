// Main application JavaScript

// --- Logger Implementation (TS 5.3) ---
const appConfig = {
    logLevel: 'info' // Default log level: 'debug', 'info', or 'error'
};

const logger = {
    debug: (...args) => {
        if (appConfig.logLevel === 'debug') {
            console.log('[DEBUG]', new Date().toISOString(), ...args);
        }
    },
    info: (...args) => {
        if (appConfig.logLevel === 'debug' || appConfig.logLevel === 'info') {
            console.info('[INFO]', new Date().toISOString(), ...args);
        }
    },
    error: (...args) => {
        // Errors are always logged regardless of logLevel
        console.error('[ERROR]', new Date().toISOString(), ...args);
    },
    setConfig: (level) => {
        if (['debug', 'info', 'error'].includes(level)) {
            appConfig.logLevel = level;
            logger.info(`Log level set to: ${level}`);
        } else {
            logger.error(`Invalid log level: ${level}. Must be 'debug', 'info', or 'error'.`);
        }
    }
};
// --- End Logger Implementation ---

// Initial log to confirm script loading and logger functionality
logger.info("gChat script loaded. Logger initialized.");
logger.debug("This is a debug message and should only appear if logLevel is 'debug'.");

// Example of how to change log level (e.g., from settings or console)
// logger.setConfig('debug');
// logger.debug("Debug messages are now enabled.");

// --- Notification System (TS 5.3) ---
function showNotification(message, type = 'info', duration = 3000) {
    logger.debug(`Showing notification: "${message}", Type: ${type}, Duration: ${duration}`);

    const notificationArea = document.getElementById('notification-area') || createNotificationArea();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Optional: Add a close button to the notification
    const closeButton = document.createElement('span');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;'; // '×' character
    closeButton.onclick = () => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 500); // Allow time for hide animation
    };
    notification.appendChild(closeButton);

    notificationArea.appendChild(notification);

    // Trigger fade-in animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove notification
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 500); // Allow time for hide animation
    }, duration);
}

function createNotificationArea() {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'notification-area';
        document.body.appendChild(area);
        logger.info('Notification area created.');
    }
    return area;
}
// Initialize notification area on script load
document.addEventListener('DOMContentLoaded', createNotificationArea);

// --- End Notification System ---

// Example Usage (can be removed later):
// document.addEventListener('DOMContentLoaded', () => {
//     showNotification('Welcome to gChat!', 'success', 5000);
//     setTimeout(() => showNotification('This is an informational message.', 'info'), 1000);
//     setTimeout(() => showNotification('An error occurred!', 'error'), 2000);
// });

// --- API Key Management (FR3.1 & FR4.1) ---
const API_KEYS_STORAGE_KEY = 'gChatApiKeys';

// Initialize API keys from localStorage or create an empty array
function getApiKeys() {
    logger.debug('Attempting to retrieve API keys from localStorage.');
    try {
        const keysJson = localStorage.getItem(API_KEYS_STORAGE_KEY);
        if (keysJson) {
            const keys = JSON.parse(keysJson);
            logger.info('API keys loaded from localStorage:', keys);
            return keys;
        }
        logger.info('No API keys found in localStorage. Returning empty array.');
        return [];
    } catch (error) {
        logger.error('Error parsing API keys from localStorage:', error);
        showNotification('Error loading API keys. Check console for details.', 'error');
        return []; // Return empty array on error to prevent app crash
    }
}

// Save API keys to localStorage
function saveApiKeys(keys) {
    logger.debug('Attempting to save API keys to localStorage:', keys);
    try {
        // Ensure only one key is default
        const defaultKeyCount = keys.filter(key => key.isDefault).length;
        if (defaultKeyCount > 1) {
            logger.error('Multiple default keys found. Fixing...');
            let foundFirstDefault = false;
            keys.forEach(key => {
                if (key.isDefault) {
                    if (foundFirstDefault) key.isDefault = false;
                    else foundFirstDefault = true;
                }
            });
        }
        // If no default key and keys exist, make the first one default
        if (defaultKeyCount === 0 && keys.length > 0) {
           // Find first valid key to set as default
            const firstValidKeyIndex = keys.findIndex(k => k.name && k.key);
            if (firstValidKeyIndex !== -1) {
                 keys[firstValidKeyIndex].isDefault = true;
                 logger.info(`No default API key found. Set "${keys[firstValidKeyIndex].name}" as default.`);
            }
        }

        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
        logger.info('API keys saved to localStorage.');
        // Optionally, dispatch an event or call a function to update UI if it's displayed
        // document.dispatchEvent(new CustomEvent('apikeyschanged', { detail: keys }));
    } catch (error) {
        logger.error('Error saving API keys to localStorage:', error);
        showNotification('Error saving API keys. Check console for details.', 'error');
    }
}

// Add a new API key
function addApiKey(name, key) {
    logger.info(`Attempting to add new API key: Name: "${name}"`);
    if (!name || !key) {
        logger.error('API key name or value is missing.');
        showNotification('API key name and value are required.', 'error');
        return false;
    }
    const keys = getApiKeys();
    if (keys.find(k => k.name.toLowerCase() === name.toLowerCase())) {
        logger.warn(`API key with name "${name}" already exists.`);
        showNotification(`An API key with the name "${name}" already exists.`, 'error');
        return false;
    }
    const newKey = {
        id: `key_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`, // Unique ID
        name: name.trim(),
        key: key.trim(),
        isDefault: keys.length === 0 // Make first key default
    };
    keys.push(newKey);
    saveApiKeys(keys);
    showNotification(`API Key "${name}" added successfully.`, 'success');
    return true;
}

// Update an existing API key (by id)
function updateApiKey(id, updatedName, updatedKey) {
    logger.info(`Attempting to update API key with ID: "${id}"`);
    if (!updatedName || !updatedKey) {
        logger.error('Updated API key name or value is missing.');
        showNotification('API key name and value are required for update.', 'error');
        return false;
    }
    const keys = getApiKeys();
    const keyIndex = keys.findIndex(k => k.id === id);
    if (keyIndex === -1) {
        logger.error(`API key with ID "${id}" not found for update.`);
        showNotification('API key not found for update.', 'error');
        return false;
    }

    // Check if new name conflicts with another existing key
    if (keys.some(k => k.id !== id && k.name.toLowerCase() === updatedName.toLowerCase())) {
        logger.warn(`Another API key with name "${updatedName}" already exists.`);
        showNotification(`Another API key with the name "${updatedName}" already exists.`, 'error');
        return false;
    }

    keys[keyIndex].name = updatedName.trim();
    keys[keyIndex].key = updatedKey.trim();
    saveApiKeys(keys);
    showNotification(`API Key "${updatedName}" updated successfully.`, 'success');
    return true;
}

// Delete an API key (by id)
function deleteApiKey(id) {
    logger.info(`Attempting to delete API key with ID: "${id}"`);
    let keys = getApiKeys();
    const keyToDelete = keys.find(k => k.id === id);

    if (!keyToDelete) {
        logger.error(`API key with ID "${id}" not found for deletion.`);
        showNotification('API key not found for deletion.', 'error');
        return false;
    }

    keys = keys.filter(k => k.id !== id);

    // If the deleted key was default, and there are other keys, set a new default
    if (keyToDelete.isDefault && keys.length > 0) {
        // Find first valid key to set as default
        const firstValidKeyIndex = keys.findIndex(k => k.name && k.key);
        if (firstValidKeyIndex !== -1) {
             keys[firstValidKeyIndex].isDefault = true;
             logger.info(`Deleted default key. Set "${keys[firstValidKeyIndex].name}" as new default.`);
        } else if (keys.length > 0) {
            // This case should ideally not be reached if keys have names and values
            keys[0].isDefault = true;
            logger.info(`Deleted default key. Set first available key as new default.`);
        }
    }
    saveApiKeys(keys);
    showNotification(`API Key "${keyToDelete.name}" deleted successfully.`, 'success');
    return true;
}

// Set an API key as default (by id)
function setDefaultApiKey(id) {
    logger.info(`Attempting to set API key with ID: "${id}" as default.`);
    const keys = getApiKeys();
    const keyIndex = keys.findIndex(k => k.id === id);

    if (keyIndex === -1) {
        logger.error(`API key with ID "${id}" not found to set as default.`);
        showNotification('API key not found.', 'error');
        return false;
    }

    keys.forEach((key, index) => {
        key.isDefault = (index === keyIndex);
    });
    saveApiKeys(keys);
    showNotification(`API Key "${keys[keyIndex].name}" is now the default.`, 'success');
    return true;
}

// Get the default API key
function getDefaultApiKey() {
    const keys = getApiKeys();
    const defaultKey = keys.find(key => key.isDefault);
    if (defaultKey) {
        logger.info('Default API key retrieved:', defaultKey.name);
        return defaultKey;
    }
    // If no explicit default, and keys exist, return the first one.
    // saveApiKeys() should handle setting a default if none is set.
    if (keys.length > 0) {
        logger.warn('No explicit default API key found, returning first key as de-facto default.');
        // Ensure saveApiKeys logic has a chance to set a default if somehow missed
        saveApiKeys(keys); // This will re-evaluate and set a default if necessary
        const updatedKeys = getApiKeys(); // get updated keys
        return updatedKeys.find(key => key.isDefault) || updatedKeys[0];
    }
    logger.warn('No API keys available to be default.');
    return null;
}

// Initialize keys on load (this will also ensure a default is set if keys exist but no default is marked)
document.addEventListener('DOMContentLoaded', () => {
    const keys = getApiKeys();
    if (keys.length > 0) {
        saveApiKeys(keys); // This call helps ensure default logic is applied on first load
    }
    logger.info('API Key management system initialized.');
});

// --- End API Key Management ---

// --- IndexedDB Setup for Chat History (FR3.2) ---
const DB_NAME = 'gChatDB';
const DB_VERSION = 1;
const CONVERSATIONS_STORE_NAME = 'conversations';
let db; // Will hold the database instance

function initializeDB() {
    logger.info(`Initializing IndexedDB: Name=${DB_NAME}, Version=${DB_VERSION}`);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            logger.error('IndexedDB error:', event.target.error);
            showNotification('Error opening database. Chat history may not be available.', 'error');
            reject('Error opening IndexedDB: ' + event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            logger.info('IndexedDB initialized successfully.');
            showNotification('Database initialized.', 'success', 1500); // Short notification
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            logger.info('IndexedDB upgrade needed.');
            db = event.target.result;
            const transaction = event.target.transaction; // Get transaction from event

            if (!db.objectStoreNames.contains(CONVERSATIONS_STORE_NAME)) {
                logger.info(`Creating object store: ${CONVERSATIONS_STORE_NAME}`);
                const store = db.createObjectStore(CONVERSATIONS_STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                // Index for sorting/querying by timestamp
                store.createIndex('timestamp_idx', 'timestamp', { unique: false });
                // Index for searching by conversation ID (if we decide to group messages by conversation later)
                // store.createIndex('conversationId_idx', 'conversationId', { unique: false });
                logger.info(`Object store "${CONVERSATIONS_STORE_NAME}" created with 'id' as keyPath and 'timestamp_idx'.`);
            } else {
                logger.info(`Object store "${CONVERSATIONS_STORE_NAME}" already exists.`);
            }

            // Example of handling future upgrades:
            // if (event.oldVersion < 2) {
            //   // Perform upgrades for version 2
            //   const store = transaction.objectStore(CONVERSATIONS_STORE_NAME);
            //   store.createIndex('new_feature_idx', 'new_feature_field', { unique: false });
            // }

            transaction.oncomplete = () => {
                logger.info("Database upgrade or creation complete.");
            };

            transaction.onerror = (event) => {
                logger.error("Error during database upgrade or creation:", event.target.error);
                showNotification('Error setting up database structure.', 'error');
            };
        };
    });
}

// Call initializeDB when the DOM is ready.
// We'll await this promise where DB operations are needed.
let dbInitializationPromise;
document.addEventListener('DOMContentLoaded', () => {
    dbInitializationPromise = initializeDB();
    dbInitializationPromise.catch(error => {
        logger.error("Failed to initialize database on DOMContentLoaded:", error);
        // The error should have already been shown to the user by initializeDB()
    });
});

// --- End IndexedDB Setup ---

// --- Chat Interface - Message Display (FR1.1 & TS 5.3) ---
const messagesContainer = document.getElementById('messages-container');
const messageTemplate = document.getElementById('chat-message-template');

function displayMessage(messageObject) {
    logger.debug('Displaying message:', messageObject);
    if (!messagesContainer) {
        logger.error('Messages container not found.');
        return;
    }
    if (!messageTemplate) {
        logger.error('Chat message template not found.');
        return;
    }

    try {
        const messageClone = messageTemplate.content.cloneNode(true);
        const messageDiv = messageClone.querySelector('.message');
        const senderDiv = messageClone.querySelector('.message-sender');
        const contentDiv = messageClone.querySelector('.message-content');
        const timestampSpan = messageClone.querySelector('.message-timestamp');
        const modelSpan = messageClone.querySelector('.message-model');
        // const actionsDiv = messageClone.querySelector('.message-actions'); // For later use

        // Set role and visual distinction
        messageDiv.classList.add(messageObject.role === 'user' ? 'user-message' : 'ai-message');

        if (senderDiv) {
            // Sender text can be more dynamic if needed, e.g. showing user name or AI name
            senderDiv.textContent = messageObject.role === 'user' ? 'You' : 'AI';
        }

        // Safely set content (TS 5.3 - avoid innerHTML for user/AI content)
        contentDiv.textContent = messageObject.content; // For now, plain text. Markdown later.

        if (timestampSpan) {
            timestampSpan.textContent = formatTimestamp(messageObject.timestamp);
        }

        if (modelSpan && messageObject.role === 'model' && messageObject.modelUsed) {
            modelSpan.textContent = ` (${messageObject.modelUsed})`;
        } else if (modelSpan) {
            modelSpan.style.display = 'none'; // Hide if not applicable
        }

        // TODO: Add interaction controls (FR1.4) to actionsDiv later

        messagesContainer.appendChild(messageClone);
        scrollToBottom(messagesContainer);

        logger.info(`Message from ${messageObject.role} displayed.`);
    } catch (error) {
        logger.error('Error displaying message:', error, messageObject);
        showNotification('Failed to display a message.', 'error');
    }
}

function formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return '';
    try {
        const date = new Date(isoTimestamp);
        // FR1.1: Precise timestamp (e.g., "YYYY-MM-DD HH:MM:SS")
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        logger.error("Error formatting timestamp:", e);
        return isoTimestamp; // fallback to original if parsing fails
    }
}

function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

// Example Usage (for testing - can be removed later):
// document.addEventListener('DOMContentLoaded', () => {
//     if (messagesContainer.children.length === 0) { // Check if it's empty
//        messagesContainer.innerHTML = ''; // Clear any placeholder like "No messages yet"
//        displayMessage({
//            id: '1',
//            role: 'user',
//            content: 'Hello AI!',
//            timestamp: new Date().toISOString()
//        });
//        setTimeout(() => {
//            displayMessage({
//                id: '2',
//                role: 'model',
//                content: 'Hello User! How can I help you today?',
//                timestamp: new Date().toISOString(),
//                modelUsed: 'gemini-1.0-pro'
//            });
//        }, 1000);
//        setTimeout(() => {
//            displayMessage({
//                id: '3',
//                role: 'user',
//                content: 'Tell me a fun fact.',
//                timestamp: new Date().toISOString()
//            });
//        }, 2000);
//         setTimeout(() => {
//            displayMessage({
//                id: '4',
//                role: 'model',
//                content: 'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible!',
//                timestamp: new Date().toISOString(),
//                modelUsed: 'gemini-1.5-flash'
//            });
//        }, 3000);
//     }
// });
// --- End Chat Interface - Message Display ---

// --- Chat Interface - User Input (FR1.2) ---
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const attachFileButton = document.getElementById('attach-file-button'); // For later use

function handleUserInput() {
    const text = userInput.value.trim();
    if (text === '') {
        logger.info('User input is empty, not sending.');
        return;
    }

    logger.info('User input received:', text);

    const userMessage = {
        // id will be assigned by IndexedDB
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
        // No modelUsed for user messages
    };

    displayMessage(userMessage);

    // TODO: Save userMessage to IndexedDB (will be part of Step 16)
    // TODO: Send message to AI and display AI response (will be part of Step 13)

    userInput.value = ''; // Clear the textarea
    adjustTextareaHeight(userInput); // Reset height after clearing
    userInput.focus(); // Keep focus on textarea
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto'; // Temporarily shrink to get accurate scrollHeight
    let newHeight = textarea.scrollHeight;

    // Get max-height from CSS (e.g., "100px" -> 100)
    const maxHeightStyle = window.getComputedStyle(textarea).maxHeight;
    const maxHeight = parseInt(maxHeightStyle, 10);

    if (maxHeight && newHeight > maxHeight) {
        newHeight = maxHeight;
        textarea.style.overflowY = 'auto'; // Show scrollbar if content exceeds max height
    } else {
        textarea.style.overflowY = 'hidden'; // Hide scrollbar if content is less than max height
    }
    textarea.style.height = newHeight + 'px';
}


if (sendButton) {
    sendButton.addEventListener('click', () => {
        logger.debug('Send button clicked.');
        handleUserInput();
    });
} else {
    logger.error('Send button not found.');
}

if (userInput) {
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default Enter behavior (new line)
            logger.debug('Enter key pressed without Shift.');
            handleUserInput();
        }
    });
    userInput.addEventListener('input', () => {
        adjustTextareaHeight(userInput);
    });
    // Adjust height on initial load as well, in case there's pre-filled text (e.g. from browser cache)
    document.addEventListener('DOMContentLoaded', () => adjustTextareaHeight(userInput) );

} else {
    logger.error('User input textarea not found.');
}

if (attachFileButton) {
    attachFileButton.addEventListener('click', () => {
        // Functionality for FR1.2 (File attachment) will be implemented later
        logger.info('Attach file button clicked. Functionality pending.');
        showNotification('File attachment functionality will be added soon!', 'info');
    });
} else {
    logger.warn('Attach file button not found.'); // Warn because it's part of FR1.2 but less critical for now
}

// --- End Chat Interface - User Input ---
