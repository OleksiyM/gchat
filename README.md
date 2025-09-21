# gChat - Gemini API Chat

<div align="center">

[![gChat](/icons/icon-192x192.png)](/icons/icon-192x192.png)

</div>

**gChat** is a feature-rich, customizable web chat application for Google's Gemini API. It operates as a Progressive Web App (PWA), storing all your chats, settings, and API keys locally in your browser. This ensures your data remains private and accessible even offline (for the app shell and cached resources).

## Running the Application

1.  Clone this repository.
2.  Since this project is designed to run without a build step, you can serve the files using a simple HTTP server.
    *   If you have Python installed, you can run `python -m http.server 8000` in the project's root directory.
    *   Alternatively, you can use a VS Code extension like "Live Server".
3.  Open your browser and navigate to the server address (e.g., `http://localhost:8000`).

**Note:** This application requires a modern web browser with support for ES Modules, Service Workers (for PWA functionality), and IndexedDB.

## Features

gChat offers a comprehensive set of features to enhance your interaction with the Gemini API:

### Chat Interface
*   **Rich Text Display:** Messages from the AI are rendered as Markdown, supporting various formatting options.
*   **Code Highlighting:** Code blocks within chat messages are automatically syntax-highlighted with a convenient "Copy" button.
*   **Message Management:** Edit or delete your previous messages in the chat.
*   **Copy & Export Chat:** Easily copy the current chat content to your clipboard (Markdown format) or export it as a Markdown (.md) or JSON (.json) file.
*   **Configurable AI Parameters:** Fine-tune your requests with adjustable parameters directly in the chat view:
    *   Select different AI **Models**.
    *   Control **Temperature** and **Top-P** for response creativity.
    *   Set **Max Output Tokens** for response length.
    *   Enable/disable **Google Search Grounding** for factual grounding.
    *   Enable/disable **URL Context** to provide web page context.
    *   Configure **Thinking Parameters** for models that support it.

### Chat Management & Organization
*   **Persistent Chat History:** All your conversations are saved locally using IndexedDB.
*   **Chat Search:** Quickly find specific chats using a keyword search.
*   **Chat Folders:** Organize your chats into custom folders.
*   **Pin & Archive Chats:** Pin important chats for easy access or archive less relevant ones.
*   **Import/Export All Chats:** Backup all your chat conversations to a JSON file or import them back into the app.
*   **Delete All Chats:** Option to clear all chat history from the application.

### Customization & Settings
*   **System Prompts:** Define and manage a library of custom system prompts to guide the AI's behavior. Select a default or a custom prompt in the configuration panel.
*   **API Key Management:** Securely store multiple Google AI API keys. Add new keys, delete old ones, and set a default key.
*   **Model Management:** Fetch the latest available models from Google. Activate/deactivate models, mark favorites for quick access, and manage your local model list.
*   **Theme Selection:** Choose between system, light, or dark themes for the application interface.
*   **Context Window Configuration:** Adjust the number of past messages sent to the AI or enable unlimited context.
*   **Import/Export Settings:** Backup your application settings (API keys, model preferences, etc.) or import them into a new setup.

### Progressive Web App (PWA) & Data Storage
*   **Installable:** Install gChat as a standalone application on your desktop or mobile device for a native-like experience.
*   **Offline Access:** The application shell and cached resources are available offline thanks to the service worker.
*   **Local Data Storage:** All your data, including chats, messages, API keys, and settings, is stored privately and securely in your browser's IndexedDB and localStorage. No data is sent to any server other than the Google Gemini API during requests.

## Project Structure

*   `index.html`: The main HTML file for the application structure.
*   `style.css`: CSS styles for the application's appearance and layout.
*   `script.js`: Core JavaScript logic for application functionality, including API interaction, chat management, UI rendering, and settings.
*   `sw.js`: Service worker script for Progressive Web App (PWA) functionality like caching and offline access.
*   `manifest.json`: PWA manifest file describing the application for installation.
*   `icons/`: Directory containing application icons for different resolutions.
    *   `icon-192x192.png`: Icon used for PWA and Android.
    *   `icon-512x512.png`: Larger icon used for PWA and other platforms.
*   `gChat_app.jpg`: Screenshot of the application, used in the README.
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore.

## Key Technologies Used

*   **HTML5, CSS3, Vanilla JavaScript (ES Modules):** For the core application structure, styling, and functionality.
*   **IndexedDB:** Used for storing all chat data, user settings, and API keys directly in the browser.
*   **Service Workers:** Enable PWA features, background caching of application assets, and offline availability.
*   **Google Gemini API:** Powers the AI chat responses.
*   **Marked.js:** A library for parsing Markdown and rendering it as HTML.
*   **Highlight.js:** A library for syntax highlighting of code blocks.

## Configuration

1.  **API Key Setup:**
    *   You need a Google AI API key to use this application. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Once you have your key, open gChat, go to `Settings` (button in the bottom-left of the sidebar) -> `General` tab.
    *   Under the "API Keys" heading, enter a name for your key (e.g., "My Gemini Key") and paste the key value. Click "Add Key".
    *   The first key added will automatically become the default. You can manage multiple keys and change the default from this settings page.
    *   For individual requests, you can also select which configured API key to use from the right-hand "Configuration" panel in the main chat interface.

2.  **Other Settings:**
    *   The `Settings` panel (accessible from the sidebar) allows you to customize various aspects of the application, including:
        *   Managing available AI **Models** (fetching, activating, favoriting).
        *   Creating and managing custom **System Prompts**.
        *   Adjusting the **Theme** and **Context Window Size**.
        *   Managing **Chat Folders**.
        *   Importing/Exporting application **Settings** and **Chat Data**.
    *   The right-hand "Configuration" panel in the main chat interface allows per-request adjustments for the AI model, temperature, Top-P, max tokens, and other generation-specific settings.

## Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or fix: `git checkout -b feature/my-new-feature` or `fix/issue-description`.
3.  **Make your changes.** Ensure your code is clear and well-commented where necessary.
4.  **Test your changes thoroughly.**
5.  **Commit your changes:** `git commit -am 'Add some feature'`
6.  **Push to the branch:** `git push origin feature/my-new-feature`
7.  **Submit a pull request** for review.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details, or refer to the standard MIT License terms.

---

<div align="center">

**gChat** - A lightweight chat interface for Gemini models

</div>

