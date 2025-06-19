// External Libraries are loaded in index.html:
// - marked.js: For Markdown parsing
// - highlight.js: For syntax highlighting

// --- 1. CONFIGURATION & STATE MANAGEMENT ---
const config = {
    defaultLogLevel: 'info',
    dbName: 'gChatDB',
    dbVersion: 1, // Remember to increment this if you change DB schema with new stores/indexes
    geminiApiUrl: 'https://esm.run/@google/generative-ai'
};

const state = {
    currentChatId: null,
    isGenerating: false,
    settings: {},
    chats: [], // This will hold all chat metadata from the DB
    activeItemMenu: null,
    editingPromptId: null, // To track which prompt is being edited
};

// --- 2. UTILS & HELPERS ---

const logger = {
    debug: (...args) => state.settings.logLevel === 'debug' && console.log('[DEBUG]', ...args),
    info: (...args) => ['debug', 'info'].includes(state.settings.logLevel) && console.info('[INFO]', ...args),
    warn: (...args) => ['debug', 'info', 'warn'].includes(state.settings.logLevel) && console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};

// DOM Elements
const dom = {
    // Main layout
    appContainer: document.querySelector('.app-container'),
    sidebar: document.querySelector('.sidebar'),
    mainContent: document.querySelector('.main-content'),
    configPanel: document.querySelector('.config-panel'),
    
    // Chat
    chatWindow: document.querySelector('.chat-window'),
    userInput: document.getElementById('userInput'),
    sendButton: document.getElementById('sendButton'),
    newChatBtn: document.getElementById('new-chat-btn'),
    
    // Sidebar
    chatHistoryContainer: document.getElementById('chat-history-container'),
    searchChatsInput: document.getElementById('search-chats-input'),

    // Main chat header controls
    copyChatBtn: document.getElementById('copy-chat-btn'),
    exportChatBtn: document.getElementById('export-chat-btn'),
    exportOptions: document.getElementById('export-options'),
    
    // Config Panel
    configToggleBtn: document.getElementById('config-toggle-btn'),
    closeConfigPanelBtn: document.getElementById('close-config-panel-btn'),
    systemPromptSelect: document.getElementById('system-prompt-select'),
        customSystemPromptText: document.getElementById('custom-system-prompt-text'),
    apiKeySelect: document.getElementById('api-key-select'),
    modelSelect: document.getElementById('model-select'),
    temperatureSlider: document.getElementById('temperature-slider'),
    tempValueDisplay: document.getElementById('temp-value'),
    topPSlider: document.getElementById('top-p-slider'),
    topPValueDisplay: document.getElementById('top-p-value'),
    maxLengthInput: document.getElementById('max-length-input'),
    googleSearchSwitcher: document.getElementById('google-search-switcher'),
    urlContextSwitcher: document.getElementById('url-context-switcher'),
    thinkingSwitcher: document.getElementById('thinking-switcher'),
    dynamicThinkingSwitcher: document.getElementById('dynamic-thinking-switcher'),
    thinkingBudgetSlider: document.getElementById('thinking-budget-slider'),
    thinkingBudgetValueDisplay: document.getElementById('thinking-budget-value'),

    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsNav: document.querySelector('.modal-nav'),
    settingsTabs: document.querySelectorAll('.modal-tab'),

    // Settings - General
    themeSelect: document.getElementById('theme-select'),
    contextSizeSlider: document.getElementById('context-window-slider'),
    contextSizeLabel: document.getElementById('context-window-label'),
    unlimitedContextCheckbox: document.getElementById('unlimited-context-checkbox'),
    apiKeyList: document.getElementById('api-key-list'),
    addApiKeyBtn: document.getElementById('add-api-key-btn'),
    newApiKeyName: document.getElementById('new-api-key-name'),
    newApiKeyValue: document.getElementById('new-api-key-value'),
    
    // Settings - Models
    fetchModelsBtn: document.getElementById('fetch-models-btn'),
    modelList: document.getElementById('model-list'),

    // Settings - Prompts
    promptTitleInput: document.getElementById('prompt-title'),
    promptTextInput: document.getElementById('prompt-text'),
    savePromptBtn: document.getElementById('save-prompt-btn'),
    cancelEditPromptBtn: document.getElementById('cancel-edit-prompt-btn'),
    promptList: document.getElementById('prompt-list'),

    // Settings - Chats
    addFolderBtn: document.getElementById('add-folder-btn'),
    newFolderNameInput: document.getElementById('new-folder-name'),
    folderList: document.getElementById('folder-list'),
    deleteAllChatsBtn: document.getElementById('delete-all-chats-btn'),

    // Notification
    notificationContainer: document.querySelector('.notification-container'),
};

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `toast-notification ${type}`;
    notification.textContent = message;
    dom.notificationContainer.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
    }, duration);
}

// --- 3. DATABASE (IndexedDB) ---
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(config.dbName, config.dbVersion);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('chats')) {
                db.createObjectStore('chats', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('messages')) {
                const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                messageStore.createIndex('chatId', 'chatId', { unique: false });
            }
            if (!db.objectStoreNames.contains('system_prompts')) {
                db.createObjectStore('system_prompts', { keyPath: 'id' });
            }
        };
        request.onsuccess = event => {
            db = event.target.result;
            logger.info('Database initialized successfully.');
            resolve(db);
        };
        request.onerror = event => {
            logger.error('Database error:', event.target.errorCode);
            reject(event.target.error);
        };
    });
}

const dbManager = {
    add: (storeName, data) => performDBTransaction(storeName, 'readwrite', store => store.add(data)),
    put: (storeName, data) => performDBTransaction(storeName, 'readwrite', store => store.put(data)),
    get: (storeName, id) => performDBTransaction(storeName, 'readonly', store => store.get(id)),
    getAll: (storeName) => performDBTransaction(storeName, 'readonly', store => store.getAll()),
    delete: (storeName, id) => performDBTransaction(storeName, 'readwrite', store => store.delete(id)),
    clear: (storeName) => performDBTransaction(storeName, 'readwrite', store => store.clear()),
    getMessagesForChat: (chatId) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('messages', 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('chatId');
            const request = index.getAll(chatId);
            request.onsuccess = () => resolve(request.result.sort((a, b) => a.timestamp - b.timestamp));
            request.onerror = (event) => reject(event.target.error);
        });
    }
};

function performDBTransaction(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized');
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = event => {
            logger.error(`DB transaction error on ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

// --- 4. SETTINGS MANAGEMENT (localStorage & Folders) ---
const settingsManager = {
    _defaults: {
        theme: 'system',
        contextWindowSize: 10,
        unlimitedContext: false,
        apiKeys: [],
        logLevel: 'info',
        models: { list: [] },
        folders: [],
        enableGoogleSearchGrounding: false,
        enableUrlContext: false,
        enableThinking: false,
        enableDynamicThinking: false,
        thinkingBudget: 0,
    },
    load() {
        let storedSettings = {};
        try {
            storedSettings = JSON.parse(localStorage.getItem('gChatSettings')) || {};
        } catch (e) {
            logger.error("Could not parse settings, resetting to default.", e);
            storedSettings = {};
        }
        state.settings = { ...this._defaults, ...storedSettings, models: { ...this._defaults.models, ...(storedSettings.models || {}) } };
        logger.info('Settings loaded:', state.settings);
    },
    save() {
        localStorage.setItem('gChatSettings', JSON.stringify(state.settings));
        logger.debug('Settings saved.');
    },
    get: (key) => state.settings[key],
    set(key, value) {
        state.settings[key] = value;
        this.save();
    },
    getApiKeys: () => settingsManager.get('apiKeys') || [],
    getDefaultApiKey: () => settingsManager.getApiKeys().find(k => k.isDefault) || settingsManager.getApiKeys()[0],
    addApiKey(name, key) {
        const keys = this.getApiKeys();
        const newKey = { id: crypto.randomUUID(), name, key, isDefault: keys.length === 0 };
        this.set('apiKeys', [...keys, newKey]);
        return newKey;
    },
    deleteApiKey(id) {
        let keys = this.getApiKeys().filter(k => k.id !== id);
        if (keys.length > 0 && !keys.some(k => k.isDefault)) keys[0].isDefault = true;
        this.set('apiKeys', keys);
    },
    setDefaultApiKey(id) {
        const keys = this.getApiKeys().map(k => ({ ...k, isDefault: k.id === id }));
        this.set('apiKeys', keys);
    },
    getModels: () => settingsManager.get('models').list || [],
    getActiveModels: () => settingsManager.getModels().filter(m => m.isActive),
    setModels(modelsList) {
        const newSettings = { ...state.settings.models, list: modelsList };
        this.set('models', newSettings);
    },
    getFolders: () => settingsManager.get('folders') || [],
    addFolder(name) {
        const folders = this.getFolders();
        const newFolder = { id: crypto.randomUUID(), name };
        this.set('folders', [...folders, newFolder]);
        return newFolder;
    },
    updateFolder(id, newName) {
        const folders = this.getFolders().map(f => f.id === id ? { ...f, name: newName } : f);
        this.set('folders', folders);
    },
    deleteFolder(id) {
        const folders = this.getFolders().filter(f => f.id !== id);
        this.set('folders', folders);
    }
};

// --- 5. UI RENDERING & DYNAMIC CONTENT ---

function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
    } else {
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }
}

function renderMarkdown(element, text) {
    if (window.marked && window.hljs) {
        element.innerHTML = window.marked.parse(text, { breaks: true, gfm: true });
        element.querySelectorAll('pre code').forEach((block) => {
            const pre = block.parentElement;
            if (pre.querySelector('.code-header')) return;
            const header = document.createElement('div');
            header.className = 'code-header';
            const langName = block.className.match(/language-(\w+)/)?.[1] || 'text';
            const langSpan = document.createElement('span');
            langSpan.textContent = langName;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(block.textContent);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            };
            header.append(langSpan, copyBtn);
            pre.prepend(header);
            window.hljs.highlightElement(block);
        });
    } else {
        logger.warn('marked.js or hljs not loaded. Cannot render markdown.');
        element.textContent = text;
    }
}

async function renderChat(chatId) {
    dom.chatWindow.innerHTML = '';
    if (!chatId) return;

    try {
        const messages = await dbManager.getMessagesForChat(chatId);
        const fragment = document.createDocumentFragment();
        messages.forEach(msg => {
            const msgEl = createMessageElement(msg);
            fragment.appendChild(msgEl);
        });
        dom.chatWindow.appendChild(fragment);
        dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
    } catch (err) {
        logger.error(`Failed to render chat ${chatId}:`, err);
        showNotification('Could not load messages for this chat.', 'error');
    }
}

// --- MESSAGE ELEMENT & CONTROLS ---

function createMessageElement(message) {
    const template = document.getElementById('message-template').content.cloneNode(true);
    const messageEl = template.querySelector('.message');
    const avatar = template.querySelector('.avatar');
    const messageBody = template.querySelector('.message-body');
    const timestampEl = template.querySelector('.timestamp');
    const modelNameEl = template.querySelector('.model-name');
    const editedIndicator = template.querySelector('.edited-indicator');
    const controlsContainer = template.querySelector('.message-controls');
    
    messageEl.dataset.messageId = message.id;
    messageEl.classList.add(message.role);
    avatar.textContent = message.role === 'user' ? 'U' : 'AI';

    if (message.role === 'model') {
        modelNameEl.textContent = message.modelUsed || 'gemini';
        renderMarkdown(messageBody, message.content);
    } else {
        messageBody.textContent = message.content;
        modelNameEl.remove();
    }
    
    const date = new Date(message.timestamp);
    timestampEl.textContent = date.toLocaleString();
    
    if (message.isEdited) {
        editedIndicator.textContent = '(edited)';
    }

    populateMessageControls(controlsContainer, message, messageEl);
    
    return messageEl;
}

function populateMessageControls(container, message, messageEl) {
    const copyBtn = document.createElement('button');
    copyBtn.title = 'Copy';
    copyBtn.innerHTML = '📋';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(message.content);
        showNotification('Copied to clipboard!', 'success');
    };

    const editBtn = document.createElement('button');
    editBtn.title = 'Edit';
    editBtn.innerHTML = '✏️';
    editBtn.onclick = () => enableMessageEditing(messageEl, message);

    const deleteBtn = document.createElement('button');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = async () => {
        if (confirm('Are you sure you want to delete this message?')) {
            await dbManager.delete('messages', message.id);
            messageEl.remove();
            showNotification('Message deleted.', 'info');
        }
    };

    container.append(copyBtn, editBtn, deleteBtn);
    
    if (message.role === 'model' && message.usage) {
        const infoBtn = document.createElement('button');
        infoBtn.title = 'Info';
        infoBtn.innerHTML = 'ℹ️';
        container.appendChild(infoBtn);
        
        const popupTemplate = document.getElementById('info-popup-template').content.cloneNode(true);
        const infoPopup = popupTemplate.querySelector('.info-popup');
        infoPopup.innerHTML = `
            Time: ${message.usage.responseTime}ms<br>
            Tokens: ${message.usage.tokenCount}<br>
            Speed: ${message.usage.tokensPerSecond} t/s
        `;
        messageEl.querySelector('.message-content-wrapper').appendChild(infoPopup);
        
        infoBtn.onclick = (e) => {
            e.stopPropagation();
            infoPopup.classList.toggle('visible');
        };
    }
}

function enableMessageEditing(messageEl, message) {
    const body = messageEl.querySelector('.message-body');
    const controls = messageEl.querySelector('.message-controls');
    const originalHeight = body.offsetHeight;

    body.innerHTML = '';
    controls.innerHTML = '';

    const textArea = document.createElement('textarea');
    textArea.className = 'message-edit-area';
    textArea.value = message.content;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.style.marginRight = '5px';
    saveBtn.onclick = async () => {
        const newContent = textArea.value.trim();
        if (newContent && newContent !== message.content) {
            const updatedMessage = { ...message, content: newContent, isEdited: true };
            await dbManager.put('messages', updatedMessage);
            const newElement = createMessageElement(updatedMessage);
            messageEl.replaceWith(newElement);
            showNotification('Message updated.', 'success');
        } else {
            const originalElement = createMessageElement(message);
            messageEl.replaceWith(originalElement);
        }
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-sm';
    cancelBtn.onclick = () => {
        const originalElement = createMessageElement(message);
        messageEl.replaceWith(originalElement);
    };

    body.appendChild(textArea);
    controls.style.display = 'flex';
    controls.append(saveBtn, cancelBtn);
    textArea.style.minHeight = `${originalHeight}px`;
    textArea.focus();
}

// ---- Settings Rendering Functions ----

function renderModelsList() {
    const models = settingsManager.getModels();
    dom.modelList.innerHTML = '';
    if (!models || models.length === 0) {
        dom.modelList.innerHTML = '<li>Click "Fetch..." to load available models.</li>';
        return;
    }

    const template = document.getElementById('model-item-template');
    models.forEach(model => {
        const item = template.content.cloneNode(true);
        const li = item.querySelector('.model-item');
        const nameLabel = item.querySelector('.model-name-label');
        nameLabel.textContent = model.name;

        if (model.status === 'new') li.classList.add('new-model');
        else if (model.status === 'stale') li.classList.add('stale-model');

        const favToggle = item.querySelector('.fav-toggle');
        if (model.isFavorite) favToggle.classList.add('favorited');
        favToggle.onclick = () => {
            model.isFavorite = !model.isFavorite;
            settingsManager.setModels(models);
            renderModelsList();
            updateModelDropdowns();
        };

        const activeToggleInput = item.querySelector('.active-toggle');
        activeToggleInput.checked = model.isActive;
        activeToggleInput.onchange = () => {
            model.isActive = activeToggleInput.checked;
            if (model.status === 'new' && model.isActive) model.status = 'ok';
            settingsManager.setModels(models);
            renderModelsList();
            updateModelDropdowns();
        };
        
        item.querySelector('.delete-model-btn').onclick = () => {
            if (confirm(`Delete model "${model.name}"?`)) {
                let updatedModels = settingsManager.getModels().filter(m => m.name !== model.name);
                settingsManager.setModels(updatedModels);
                renderModelsList();
                updateModelDropdowns();
            }
        };

        if (model.status === 'stale') {
            favToggle.disabled = true;
            activeToggleInput.disabled = true;
            li.title = 'This model was not found and may be deprecated.';
        }
        dom.modelList.appendChild(item);
    });
}

async function renderSystemPromptsList() {
    const prompts = await dbManager.getAll('system_prompts');
    dom.promptList.innerHTML = '';
    const template = document.getElementById('prompt-item-template');
    prompts.forEach(prompt => {
        const item = template.content.cloneNode(true);
        item.querySelector('.prompt-title-text').textContent = prompt.title;
        item.querySelector('.edit-prompt-btn').onclick = () => {
            state.editingPromptId = prompt.id;
            dom.promptTitleInput.value = prompt.title;
            dom.promptTextInput.value = prompt.text;
            dom.savePromptBtn.textContent = 'Update Prompt';
            dom.cancelEditPromptBtn.style.display = 'inline-block';
        };
        item.querySelector('.delete-prompt-btn').onclick = async () => {
            if (confirm(`Delete prompt "${prompt.title}"?`)) {
                await dbManager.delete('system_prompts', prompt.id);
                showNotification('Prompt deleted.', 'success');
                await renderSystemPromptsList();
                await updateSystemPromptDropdowns();
            }
        };
        dom.promptList.appendChild(item);
    });
}

function renderFolderListSettings() {
    const folders = settingsManager.getFolders();
    dom.folderList.innerHTML = '';
    const template = document.getElementById('folder-item-template');
    folders.forEach(folder => {
        const item = template.content.cloneNode(true);
        const nameSpan = item.querySelector('.folder-name-text');
        nameSpan.textContent = folder.name;

        item.querySelector('.edit-folder-btn').onclick = async () => {
            const newName = prompt('Enter new name for folder:', folder.name);
            if (newName && newName.trim() !== folder.name) {
                settingsManager.updateFolder(folder.id, newName.trim());
                await renderChatHistory();
                renderFolderListSettings();
            }
        };

        item.querySelector('.delete-folder-btn').onclick = async () => {
            if (confirm(`Delete folder "${folder.name}"? Chats in this folder will not be deleted.`)) {
                settingsManager.deleteFolder(folder.id);
                const chatsToUpdate = state.chats.filter(c => c.folderId === folder.id);
                for (const chat of chatsToUpdate) {
                    await dbManager.put('chats', { ...chat, folderId: null });
                }
                await renderChatHistory();
                renderFolderListSettings();
            }
        };
        dom.folderList.appendChild(item);
    });
}

function renderApiKeyList() {
    const keys = settingsManager.getApiKeys();
    dom.apiKeyList.innerHTML = '';
    if (keys.length === 0) {
        dom.apiKeyList.innerHTML = '<li>No API keys configured. Please add one.</li>';
        return;
    }

    const fragment = document.createDocumentFragment();
    keys.forEach(key => {
        const li = document.createElement('li');
        li.className = 'api-key-item';

        const radioLabel = document.createElement('label');
        radioLabel.style.flexGrow = 1;
        radioLabel.style.display = 'flex';
        radioLabel.style.alignItems = 'center';
        radioLabel.style.cursor = 'pointer';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'default-api-key';
        radio.value = key.id;
        radio.checked = key.isDefault;
        radio.style.marginRight = '10px';
        radio.onchange = () => {
            settingsManager.setDefaultApiKey(key.id);
            updateApiKeyDropdowns();
            showNotification(`"${key.name}" is now the default key.`, 'success');
        };

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${key.name} (...${key.key.slice(-4)})`;
        
        radioLabel.append(radio, nameSpan);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the key "${key.name}"?`)) {
                settingsManager.deleteApiKey(key.id);
                renderApiKeyList();
                updateApiKeyDropdowns();
                showNotification('API Key deleted.', 'info');
            }
        };

        actionsDiv.appendChild(deleteBtn);
        li.append(radioLabel, actionsDiv);
        fragment.appendChild(li);
    });

    dom.apiKeyList.appendChild(fragment);
}

function updateApiKeyDropdowns() {
    const keys = settingsManager.getApiKeys();
    dom.apiKeySelect.innerHTML = '';
    keys.forEach(key => {
        const option = document.createElement('option');
        option.value = key.id;
        option.textContent = `${key.name}${key.isDefault ? ' (Default)' : ''}`;
        dom.apiKeySelect.appendChild(option);
    });
}

function updateModelDropdowns() {
    let models = settingsManager.getActiveModels();
    dom.modelSelect.innerHTML = '';
    models.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = `${model.name}${model.isFavorite ? ' ★' : ''}`;
        dom.modelSelect.appendChild(option);
    });
}

async function updateSystemPromptDropdowns() {
    const prompts = await dbManager.getAll('system_prompts');
    dom.systemPromptSelect.innerHTML = '<option value="default">Default</option>';
    prompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt.id;
        option.textContent = prompt.title;
        dom.systemPromptSelect.appendChild(option);
    });

    // Add event listener for system prompt select change
    dom.systemPromptSelect.addEventListener('change', async (event) => {
        const selectedId = event.target.value;
        const customPromptTextArea = dom.customSystemPromptText;
        if (selectedId === 'default') {
            customPromptTextArea.value = '';
        } else {
            const prompt = await dbManager.get('system_prompts', selectedId);
            if (prompt) {
                customPromptTextArea.value = prompt.text;
            } else {
                customPromptTextArea.value = ''; // Should not happen if ID is from DB
            }
        }
    });
    // Dispatch change event to populate textarea initially after dropdowns are updated
    // This ensures the textarea is populated when the app loads or settings are updated.
    dom.systemPromptSelect.dispatchEvent(new Event('change'));
}

function updateSettingsUI() {
    // General Tab
    const theme = settingsManager.get('theme');
    dom.themeSelect.value = theme;
    const contextSize = settingsManager.get('contextWindowSize');
    const unlimited = settingsManager.get('unlimitedContext');
    dom.contextSizeSlider.value = contextSize;
    dom.contextSizeLabel.textContent = unlimited ? 'Unlimited' : contextSize;
    dom.unlimitedContextCheckbox.checked = unlimited;
    dom.contextSizeSlider.disabled = unlimited;
    renderApiKeyList();
    updateApiKeyDropdowns();
    // Models Tab
    renderModelsList();
    updateModelDropdowns();
    // Prompts Tab
    renderSystemPromptsList();
    updateSystemPromptDropdowns();
    // Chats Tab
    renderFolderListSettings();

    // FR?: New switchers in config panel
    if (dom.googleSearchSwitcher) { // Check if element exists
        dom.googleSearchSwitcher.checked = settingsManager.get('enableGoogleSearchGrounding');
    }
    if (dom.urlContextSwitcher) { // Check if element exists
        dom.urlContextSwitcher.checked = settingsManager.get('enableUrlContext');
    }

    // Thinking controls
    if (dom.thinkingSwitcher) {
        dom.thinkingSwitcher.checked = settingsManager.get('enableThinking');
    }
    if (dom.dynamicThinkingSwitcher) {
        dom.dynamicThinkingSwitcher.checked = settingsManager.get('enableDynamicThinking');
        dom.dynamicThinkingSwitcher.disabled = !settingsManager.get('enableThinking');
    }
    if (dom.thinkingBudgetSlider) {
        const budget = settingsManager.get('thinkingBudget');
        dom.thinkingBudgetSlider.value = budget;
        if (dom.thinkingBudgetValueDisplay) {
            dom.thinkingBudgetValueDisplay.textContent = budget;
        }
        dom.thinkingBudgetSlider.disabled = !settingsManager.get('enableThinking') || settingsManager.get('enableDynamicThinking');
    }
}

// --- 6. CORE LOGIC ---

async function handleSendMessage() {
    const content = dom.userInput.value.trim();
    if (!content || state.isGenerating) return;

    // Use the key selected in the config panel, fallback to default
    const selectedKeyId = dom.apiKeySelect.value;
    const keys = settingsManager.getApiKeys();
    let apiKeyData = keys.find(k => k.id === selectedKeyId) || settingsManager.getDefaultApiKey();

    if (!apiKeyData || !apiKeyData.key) {
        showNotification('Please select a valid API key in the config panel or set a default in Settings.', 'error');
        return;
    }

    state.isGenerating = true;
    dom.sendButton.disabled = true;
    
    const userMessage = {
        id: crypto.randomUUID(),
        chatId: state.currentChatId,
        role: 'user',
        content: content,
        timestamp: Date.now(),
    };

    try {
        await dbManager.add('messages', userMessage);
        dom.chatWindow.appendChild(createMessageElement(userMessage));
        dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
        dom.userInput.value = '';
        dom.userInput.style.height = 'auto';
        await getAIResponse(apiKeyData.key);
    } catch (err) {
        logger.error('Error sending message:', err);
        showNotification('Failed to send message.', 'error');
        state.isGenerating = false;
        dom.sendButton.disabled = false;
    }
}

async function getAIResponse(apiKey) {
    // Create a placeholder message for the AI response
    const modelUsed = dom.modelSelect.value;
    const aiMessage = {
        id: crypto.randomUUID(),
        chatId: state.currentChatId,
        role: 'model',
        content: '...',
        timestamp: Date.now(),
        modelUsed: modelUsed,
        usage: null
    };
    const aiMessageElement = createMessageElement(aiMessage);
    const aiMessageBody = aiMessageElement.querySelector('.message-body');
    dom.chatWindow.appendChild(aiMessageElement);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;

    try {
        // Dynamically import the SDK
        const { GoogleGenerativeAI } = await import(config.geminiApiUrl);
        const genAI = new GoogleGenerativeAI(apiKey);

        // Get generation config from UI
        const generationConfig = {
            temperature: parseFloat(dom.temperatureSlider.value),
            topP: parseFloat(dom.topPSlider.value),
            maxOutputTokens: parseInt(dom.maxLengthInput.value, 10),
        };

        const enableThinking = settingsManager.get('enableThinking');
        const enableDynamicThinking = settingsManager.get('enableDynamicThinking');
        const thinkingBudgetSetting = settingsManager.get('thinkingBudget');

        if (enableThinking) {
            const thConfig = {};
            if (enableDynamicThinking) {
                thConfig.thinkingBudget = -1; // Dynamic budget
            } else {
                thConfig.thinkingBudget = parseInt(thinkingBudgetSetting, 10);
            }
            generationConfig.thinkingConfig = thConfig;
        } else {
            // Explicitly turn thinking off if enableThinking is false
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        // Get system prompt from the text area
        const customPromptText = dom.customSystemPromptText.value.trim();
        let systemInstruction = null;
        if (customPromptText) {
            systemInstruction = { parts: [{ text: customPromptText }] };
            // Optionally, if you want to reflect that a custom/modified prompt is in use:
            // dom.systemPromptSelect.value = 'default'; // or add a specific <option> for "Custom"
        }
        
        let tools = [];
        if (settingsManager.get('enableGoogleSearchGrounding')) {
            tools.push({ "google_search": {} });
        }
        if (settingsManager.get('enableUrlContext')) {
            tools.push({ "url_context": {} });
        }

        const modelParams = {
            model: modelUsed,
            generationConfig,
            systemInstruction
        };

        if (tools.length > 0) {
            modelParams.tools = tools;
        }

        const model = genAI.getGenerativeModel(modelParams);

        // Prepare chat history for the API
        let dbHistory = await dbManager.getMessagesForChat(state.currentChatId);
        // Exclude the last user message, which is the current prompt, and the placeholder AI message
        dbHistory = dbHistory.slice(0, -1); 
        
        const contextLimit = settingsManager.get('contextWindowSize');
        const isUnlimited = settingsManager.get('unlimitedContext');
        if (!isUnlimited && dbHistory.length > contextLimit) {
            dbHistory = dbHistory.slice(-contextLimit);
        }

        const historyForApi = dbHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
        
        const chat = model.startChat({ history: historyForApi });
        const lastUserMessage = dom.userInput.value.trim() || (await dbManager.getMessagesForChat(state.currentChatId)).pop().content;
        const result = await chat.sendMessageStream(lastUserMessage);

        let fullResponse = '';
        const startTime = Date.now();
        aiMessageBody.textContent = ''; // Clear the "..."

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            aiMessageBody.textContent = fullResponse; // Render raw text for performance during stream
            dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
        }
        
        // Finalize response
        const response = await result.response;
        const endTime = Date.now();
        
        renderMarkdown(aiMessageBody, fullResponse); // Render final text as markdown

        // Update the message in DB with full content and usage stats
        aiMessage.content = fullResponse;
        const tokenCount = response.usageMetadata?.totalTokenCount || 0;
        const responseTime = endTime - startTime;
        aiMessage.usage = {
            tokenCount: tokenCount,
            responseTime: responseTime,
            tokensPerSecond: tokenCount > 0 ? (tokenCount / (responseTime / 1000)).toFixed(2) : 0,
        };
        await dbManager.put('messages', aiMessage);
        
        // Refresh the message element to include all controls and info
        const finalElement = createMessageElement(aiMessage);
        aiMessageElement.replaceWith(finalElement);

    } catch (error) {
        logger.error('Gemini API Error:', error);
        const errorMessage = error.toString();
        aiMessageBody.innerHTML = `<p style="color:var(--stale-color);"><strong>Error:</strong> ${errorMessage}</p>`;
        showNotification(`API Error: ${errorMessage}`, 'error', 5000);
    } finally {
        state.isGenerating = false;
        dom.sendButton.disabled = false;
        dom.userInput.focus();
    }
}


// --- 7. EVENT LISTENERS SETUP ---

function resetPromptForm() {
    state.editingPromptId = null;
    dom.promptTitleInput.value = '';
    dom.promptTextInput.value = '';
    dom.savePromptBtn.textContent = 'Add Prompt';
    dom.cancelEditPromptBtn.style.display = 'none';
    dom.promptTitleInput.focus();
}

function setupEventListeners() {
    dom.newChatBtn.addEventListener('click', createNewChat);
    dom.sendButton.addEventListener('click', handleSendMessage);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Search listener
    dom.searchChatsInput.addEventListener('input', (e) => renderChatHistory(e.target.value));

    // Main chat header controls
    dom.copyChatBtn.addEventListener('click', handleCopyChat);
    dom.exportOptions.addEventListener('click', (e) => {
        if (e.target.dataset.format) {
            handleExportChat(e.target.dataset.format);
        }
    });

    dom.configToggleBtn.addEventListener('click', () => dom.configPanel.classList.toggle('collapsed'));
    dom.openSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('visible'));
    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.remove('visible'));
    dom.settingsModal.addEventListener('click', (e) => e.target === dom.settingsModal && dom.settingsModal.classList.remove('visible'));

    if (dom.closeConfigPanelBtn) { // Ensure element exists
        dom.closeConfigPanelBtn.addEventListener('click', () => {
            dom.configPanel.classList.add('collapsed');
        });
    }
    
    dom.settingsNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tabId = e.target.dataset.tab;
            dom.settingsNav.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            dom.settingsTabs.forEach(tab => tab.classList.toggle('active', tab.id === tabId));
        }
    });

    document.addEventListener('click', (e) => {
        // Close info popups
        if (!e.target.closest('.message-controls')) {
            document.querySelectorAll('.info-popup.visible').forEach(popup => popup.classList.remove('visible'));
        }
        // Close chat item action menus
        if (state.activeItemMenu && !state.activeItemMenu.contains(e.target) && !e.target.closest('.chat-item-menu-btn')) {
            closeChatItemMenu();
        }
    });

    // Model Management
    dom.fetchModelsBtn.addEventListener('click', async () => {
        const apiKey = settingsManager.getDefaultApiKey()?.key;
        if (!apiKey) {
            return showNotification('Please set a default API key to fetch models.', 'error');
        }
        
        dom.fetchModelsBtn.textContent = 'Fetching...';
        dom.fetchModelsBtn.disabled = true;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const fetchedModelNames = data.models.map(m => m.name.replace('models/', ''));
            
            const storedModels = settingsManager.getModels();
            const newModelList = [...storedModels];

            // Mark existing models that are no longer fetched as 'stale'
            newModelList.forEach(model => {
                if (!fetchedModelNames.includes(model.name)) {
                    model.status = 'stale';
                    model.isActive = false;
                } else {
                     // If it was stale before but now it's found, mark it as ok
                    if (model.status === 'stale') model.status = 'ok';
                }
            });

            // Add new models not present in the stored list
            fetchedModelNames.forEach(name => {
                if (!newModelList.some(m => m.name === name)) {
                    newModelList.push({ name, isFavorite: false, isActive: false, status: 'new' });
                }
            });

            settingsManager.setModels(newModelList);
            renderModelsList();
            updateModelDropdowns();
            showNotification('Successfully fetched and updated models.', 'success');

        } catch (error) {
            logger.error('Failed to fetch models:', error);
            showNotification(`Failed to fetch models: ${error.message}`, 'error');
        } finally {
            dom.fetchModelsBtn.textContent = 'Fetch Available Models (Live)';
            dom.fetchModelsBtn.disabled = false;
        }
    });

    // Prompt Management
    dom.savePromptBtn.addEventListener('click', async () => {
        const title = dom.promptTitleInput.value.trim();
        const text = dom.promptTextInput.value.trim();

        if (!title || !text) {
            showNotification('Prompt title and text cannot be empty.', 'error');
            return;
        }

        try {
            if (state.editingPromptId) {
                // Update existing prompt
                const promptToUpdate = { id: state.editingPromptId, title, text };
                await dbManager.put('system_prompts', promptToUpdate);
                showNotification('Prompt updated!', 'success');
            } else {
                // Add new prompt
                const newPrompt = { id: crypto.randomUUID(), title, text };
                await dbManager.add('system_prompts', newPrompt);
                showNotification('Prompt added!', 'success');
            }
            resetPromptForm();
            await renderSystemPromptsList();
            await updateSystemPromptDropdowns();
        } catch (err) {
            logger.error('Failed to save prompt:', err);
            showNotification('Could not save prompt.', 'error');
        }
    });
    
    dom.cancelEditPromptBtn.addEventListener('click', () => {
        resetPromptForm();
    });
    
    if (dom.temperatureSlider && dom.tempValueDisplay) {
        dom.temperatureSlider.addEventListener('input', (event) => {
            dom.tempValueDisplay.textContent = event.target.value;
        });
    }

    if (dom.topPSlider && dom.topPValueDisplay) {
        dom.topPSlider.addEventListener('input', (event) => {
            dom.topPValueDisplay.textContent = event.target.value;
        });
    }

    // FR?: Event listeners for new switchers
    if (dom.googleSearchSwitcher) {
        dom.googleSearchSwitcher.addEventListener('change', (event) => {
            settingsManager.set('enableGoogleSearchGrounding', event.target.checked);
        });
    }

    if (dom.urlContextSwitcher) {
        dom.urlContextSwitcher.addEventListener('change', (event) => {
            settingsManager.set('enableUrlContext', event.target.checked);
        });
    }

    // Thinking controls listeners
    if (dom.thinkingSwitcher) {
        dom.thinkingSwitcher.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            settingsManager.set('enableThinking', isEnabled);
            if (dom.dynamicThinkingSwitcher) {
                dom.dynamicThinkingSwitcher.disabled = !isEnabled;
            }
            if (dom.thinkingBudgetSlider) {
                // Enable slider only if thinking is enabled AND dynamic thinking is NOT checked
                dom.thinkingBudgetSlider.disabled = !isEnabled || (dom.dynamicThinkingSwitcher && dom.dynamicThinkingSwitcher.checked);
            }
             // If thinking is disabled, also disable dynamic thinking
            if (!isEnabled && dom.dynamicThinkingSwitcher) {
                dom.dynamicThinkingSwitcher.checked = false;
                settingsManager.set('enableDynamicThinking', false);
            }
        });
    }

    if (dom.dynamicThinkingSwitcher) {
        dom.dynamicThinkingSwitcher.addEventListener('change', (event) => {
            const isDynamicEnabled = event.target.checked;
            settingsManager.set('enableDynamicThinking', isDynamicEnabled);
            if (dom.thinkingBudgetSlider) {
                // Disable budget slider if dynamic thinking is enabled
                dom.thinkingBudgetSlider.disabled = isDynamicEnabled;
            }
        });
    }

    if (dom.thinkingBudgetSlider && dom.thinkingBudgetValueDisplay) {
        dom.thinkingBudgetSlider.addEventListener('input', (event) => {
            const budget = event.target.value;
            dom.thinkingBudgetValueDisplay.textContent = budget;
            settingsManager.set('thinkingBudget', parseInt(budget, 10));
        });
    }

    setupGeneralAndChatSettingsListeners();
}

function setupGeneralAndChatSettingsListeners() {
    // Theme select
    dom.themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        settingsManager.set('theme', theme);
        applyTheme(theme);
    });

    // Context Window Slider
    dom.contextSizeSlider.addEventListener('input', () => {
        const size = dom.contextSizeSlider.value;
        dom.contextSizeLabel.textContent = size;
        settingsManager.set('contextWindowSize', parseInt(size, 10));
    });
    
    // Unlimited Context Checkbox
    dom.unlimitedContextCheckbox.addEventListener('change', () => {
        const isUnlimited = dom.unlimitedContextCheckbox.checked;
        dom.contextSizeSlider.disabled = isUnlimited;
        dom.contextSizeLabel.textContent = isUnlimited ? 'Unlimited' : dom.contextSizeSlider.value;
        settingsManager.set('unlimitedContext', isUnlimited);
    });

    // Add API Key button
    dom.addApiKeyBtn.addEventListener('click', () => {
        const name = dom.newApiKeyName.value.trim();
        const key = dom.newApiKeyValue.value.trim();

        if (!name || !key) {
            showNotification('Please provide both a name and a key.', 'error');
            return;
        }

        if (!key.startsWith('AIza')) {
            showNotification('Warning: Key does not look like a standard Google AI API key.', 'warn');
        }

        settingsManager.addApiKey(name, key);
        showNotification('API Key added successfully!', 'success');
        
        dom.newApiKeyName.value = '';
        dom.newApiKeyValue.value = '';

        renderApiKeyList();
        updateApiKeyDropdowns();
    });

    // Folder & Chat Tab Listeners
    dom.addFolderBtn.addEventListener('click', async () => {
        const name = dom.newFolderNameInput.value.trim();
        if (name) {
            settingsManager.addFolder(name);
            dom.newFolderNameInput.value = '';
            renderFolderListSettings();
            await renderChatHistory();
            showNotification('Folder added!', 'success');
        } else {
            showNotification('Folder name cannot be empty.', 'error');
        }
    });

    dom.deleteAllChatsBtn.addEventListener('click', async () => { 
        if(confirm('ARE YOU SURE you want to delete ALL chats? This is irreversible.')) {
            try {
                await dbManager.clear('messages');
                await dbManager.clear('chats');
                await renderChatHistory();
                await switchChat(null);
                showNotification('All chats have been deleted.', 'success');
            } catch (err) {
                logger.error('Failed to delete all chats:', err);
                showNotification('An error occurred while deleting chats.', 'error');
            }
        }
    });
}

// --- 8. INITIALIZATION & CHAT MANAGEMENT ---

async function initializeApp() {
    logger.info('gChat Initializing...');
    settingsManager.load();
    applyTheme(settingsManager.get('theme'));
    await initDB();
    await renderChatHistory(); // Initial render
    
    const lastChatId = localStorage.getItem('lastActiveChatId');
    const chatExists = state.chats.some(c => c.id === lastChatId);

    if (lastChatId && chatExists) {
        await switchChat(lastChatId);
    } else if (state.chats.length > 0) {
        await switchChat(state.chats[0].id); // Switch to the most recent chat
    } else {
        await createNewChat(); // Create a chat if none exist
    }
    
    setupEventListeners();
    updateSettingsUI();
    logger.info('App Initialized and Ready.');
}

async function createNewChat() {
    const newChat = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        createdAt: Date.now(),
        folderId: null,
        isPinned: false,
        isArchived: false,
    };
    await dbManager.add('chats', newChat);
    await renderChatHistory(); // This will fetch all chats again including the new one
    await switchChat(newChat.id);
    showNotification('New chat created.', 'success');
}

async function switchChat(chatId) {
    if (!chatId) {
        dom.chatWindow.innerHTML = '<div class="chat-window-empty" style="text-align: center; margin-top: 2rem; color: var(--icon-color);">Select a chat to begin or create a new one.</div>';
        state.currentChatId = null;
        return;
    }
    state.currentChatId = chatId;
    localStorage.setItem('lastActiveChatId', chatId);
    await renderChat(chatId);
    
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
    });
    logger.info(`Switched to chat: ${chatId}`);
}

async function renderChatHistory(searchTerm = '') {
    try {
        const allChats = await dbManager.getAll('chats');
        state.chats = allChats.sort((a, b) => b.createdAt - a.createdAt);
        
        let filteredChats = state.chats;
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filteredChats = state.chats.filter(c => c.title.toLowerCase().includes(lowerCaseSearch));
        }
        
        const folders = settingsManager.getFolders();
        dom.chatHistoryContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const pinnedChats = filteredChats.filter(c => c.isPinned && !c.isArchived);
        const archivedChats = filteredChats.filter(c => c.isArchived);
        
        // Group remaining chats by folder
        const chatsByFolder = new Map();
        const uncategorizedChats = [];
        filteredChats.forEach(chat => {
            if (chat.isPinned || chat.isArchived) return; // Already handled
            if (chat.folderId && folders.some(f => f.id === chat.folderId)) {
                if (!chatsByFolder.has(chat.folderId)) chatsByFolder.set(chat.folderId, []);
                chatsByFolder.get(chat.folderId).push(chat);
            } else {
                uncategorizedChats.push(chat);
            }
        });
        
        // --- RENDER SECTIONS ---
        if (pinnedChats.length > 0) fragment.appendChild(createHistorySection('Pinned', pinnedChats));
        
        folders.forEach(folder => {
            const folderChats = chatsByFolder.get(folder.id) || [];
            if (folderChats.length > 0 || !searchTerm) { // Always show folder if not searching
                 fragment.appendChild(createHistorySection(folder.name, folderChats, true));
            }
        });

        if (uncategorizedChats.length > 0) fragment.appendChild(createHistorySection('History', uncategorizedChats));
        if (archivedChats.length > 0) fragment.appendChild(createHistorySection('Archive', archivedChats, true, true));

        dom.chatHistoryContainer.appendChild(fragment);

        // Re-apply active state
        if (state.currentChatId) {
            const activeItem = dom.chatHistoryContainer.querySelector(`[data-chat-id="${state.currentChatId}"]`);
            if (activeItem) activeItem.classList.add('active');
        }

    } catch(err) {
        logger.error('Failed to render chat history:', err);
    }
}

function createHistorySection(title, chats, isCollapsible = false, isCollapsed = false) {
    const section = document.createElement('div');
    section.className = 'history-section';
    
    const chatList = document.createElement('ul');
    chats.forEach(chat => chatList.appendChild(createChatListItem(chat)));

    if (isCollapsible) {
        const details = document.createElement('details');
        details.open = !isCollapsed;
        const summary = document.createElement('summary');
        summary.textContent = title;
        details.appendChild(summary);
        details.appendChild(chatList);
        section.appendChild(details);
    } else {
        const header = document.createElement('h4');
        header.className = 'history-section-header';
        header.textContent = title;
        section.appendChild(header);
        section.appendChild(chatList);
    }
    return section;
}

function createChatListItem(chat) {
    const li = document.createElement('li');
    li.className = 'chat-history-item';
    li.dataset.chatId = chat.id;
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'chat-item-title';
    titleSpan.textContent = chat.title;
    li.appendChild(titleSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'chat-item-actions';
    const menuBtn = document.createElement('button');
    menuBtn.className = 'chat-item-menu-btn';
    menuBtn.innerHTML = '...';
    menuBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent li's click event
        showChatItemMenu(e.currentTarget, chat);
    };
    actionsDiv.appendChild(menuBtn);
    li.appendChild(actionsDiv);
    
    li.onclick = () => switchChat(chat.id);
    return li;
}

// --- CHAT ITEM ACTION MENU ---
function showChatItemMenu(button, chat) {
    closeChatItemMenu(); // Close any existing menu
    const template = document.getElementById('chat-item-menu-template');
    const menu = template.content.cloneNode(true).querySelector('.chat-item-menu');
    state.activeItemMenu = menu;

    // Configure menu based on chat state
    menu.querySelector('[data-action="pin"]').style.display = chat.isPinned ? 'none' : 'block';
    menu.querySelector('[data-action="unpin"]').style.display = chat.isPinned ? 'block' : 'none';

    // Populate "Move to" sub-menu
    const subMenu = menu.querySelector('.sub-menu');
    const folders = settingsManager.getFolders();
    if (folders.length > 0) {
        folders.forEach(folder => {
            if (chat.folderId !== folder.id) {
                const item = document.createElement('div');
                item.className = 'chat-item-menu-item';
                item.textContent = folder.name;
                item.onclick = () => handleChatItemAction('move', chat, { folderId: folder.id });
                subMenu.appendChild(item);
            }
        });
    }
    if (chat.folderId) {
        if(folders.length > 0) subMenu.appendChild(document.createElement('hr'));
        const unassignItem = document.createElement('div');
        unassignItem.className = 'chat-item-menu-item';
        unassignItem.textContent = 'Remove from Folder';
        unassignItem.onclick = () => handleChatItemAction('move', chat, { folderId: null });
        subMenu.appendChild(unassignItem);
    }
    
    // Attach event listeners
    menu.querySelector('[data-action="rename"]').onclick = () => handleChatItemAction('rename', chat);
    menu.querySelector('[data-action="pin"]').onclick = () => handleChatItemAction('pin', chat);
    menu.querySelector('[data-action="unpin"]').onclick = () => handleChatItemAction('unpin', chat);
    menu.querySelector('[data-action="archive"]').onclick = () => handleChatItemAction('archive', chat);
    menu.querySelector('[data-action="delete"]').onclick = () => handleChatItemAction('delete', chat);
    menu.querySelector('[data-action="export-md"]').onclick = () => handleChatItemAction('export-md', chat);
    menu.querySelector('[data-action="export-json"]').onclick = () => handleChatItemAction('export-json', chat);

    // Position and show menu
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom}px`;
    menu.style.left = `${rect.right - menu.offsetWidth}px`;
}

function closeChatItemMenu() {
    if (state.activeItemMenu) {
        state.activeItemMenu.remove();
        state.activeItemMenu = null;
    }
}

async function handleChatItemAction(action, chat, options = {}) {
    closeChatItemMenu();
    let chatUpdate = { ...chat };

    switch (action) {
        case 'rename':
            const newTitle = prompt('Enter new title for chat:', chat.title);
            if (newTitle && newTitle.trim() !== chat.title) chatUpdate.title = newTitle.trim();
            else return;
            break;
        case 'pin':
            chatUpdate.isPinned = true;
            break;
        case 'unpin':
            chatUpdate.isPinned = false;
            break;
        case 'archive':
            chatUpdate.isArchived = true;
            break;
        case 'move':
            chatUpdate.folderId = options.folderId;
            break;
        case 'delete':
            if (confirm(`Delete chat "${chat.title}"? This cannot be undone.`)) {
                await dbManager.delete('chats', chat.id);
                // Also delete associated messages
                const messages = await dbManager.getMessagesForChat(chat.id);
                for (const msg of messages) await dbManager.delete('messages', msg.id);
                showNotification('Chat deleted.', 'info');
                await renderChatHistory();
                if (state.currentChatId === chat.id) await switchChat(state.chats[0]?.id || null);
            }
            return;
        case 'export-md':
            handleExportChat('md', chat.id);
            return;
        case 'export-json':
            handleExportChat('json', chat.id);
            return;
    }
    await dbManager.put('chats', chatUpdate);
    await renderChatHistory();
}

// --- CHAT CONTENT ACTIONS ---
async function handleCopyChat() {
    if (!state.currentChatId) return;
    try {
        const content = await formatChatToMarkdown(state.currentChatId);
        await navigator.clipboard.writeText(content);
        showNotification('Chat content copied to clipboard!', 'success');
    } catch (err) {
        logger.error("Failed to copy chat:", err);
        showNotification('Could not copy chat content.', 'error');
    }
}

async function handleExportChat(format, chatId = state.currentChatId) {
    if (!chatId) return;
    const chat = await dbManager.get('chats', chatId);
    const safeTitle = chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    try {
        if (format === 'md') {
            const content = await formatChatToMarkdown(chatId);
            downloadFile(content, `${safeTitle}.md`, 'text/markdown');
        } else if (format === 'json') {
            const content = await formatChatToJson(chatId);
            downloadFile(content, `${safeTitle}.json`, 'application/json');
        }
    } catch (err) {
        logger.error(`Failed to export chat as ${format}:`, err);
        showNotification(`Could not export chat as ${format}.`, 'error');
    }
}

async function formatChatToMarkdown(chatId) {
    const messages = await dbManager.getMessagesForChat(chatId);
    return messages.map(msg => `**${msg.role === 'user' ? 'User' : `AI (${msg.modelUsed || 'gemini'})`}**\n\n${msg.content}\n\n---\n\n`).join('');
}

async function formatChatToJson(chatId) {
    const chat = await dbManager.get('chats', chatId);
    const messages = await dbManager.getMessagesForChat(chatId);
    const exportData = { ...chat, messages };
    return JSON.stringify(exportData, null, 2);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Start the application
initializeApp();