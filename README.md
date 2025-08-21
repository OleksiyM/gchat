# gChat - A Feature-Rich Web Client for the Google Gemini API

<div align="center">
  <img src="/gChat_app.jpg" alt="gChat Screenshot" width="800"/>
</div>

gChat is a powerful, customizable, and private web chat client for Google's Gemini API. It runs entirely in your browser as a Progressive Web App (PWA), storing all your chats, settings, and API keys locally. This ensures your data remains private and accessible even when you're offline.

## Key Principles

- **Privacy First:** All data (chats, settings, API keys) is stored in your browser's IndexedDB and localStorage. Nothing is sent to any server except for the direct API calls to Google.
- **No Build Step Required:** The application is built with vanilla HTML, CSS, and JavaScript, allowing you to run it immediately by serving the files with any simple HTTP server.
- **Full Configuration:** gChat exposes a rich set of configuration options for the Gemini API, giving you complete control over model behavior.

## Running the Application

1.  Clone this repository.
2.  Serve the files using a simple local HTTP server.
    -   If you have Python: `python -m http.server 8000`
    -   If you have Node.js: `npx http-server`
    -   Alternatively, use a VS Code extension like "Live Server".
3.  Open your browser and navigate to the server address (e.g., `http://localhost:8000`).

## Features

gChat offers a comprehensive set of features to enhance your interaction with the Gemini API.

### Core Chat Experience

-   **Live Response Status:** Get immediate feedback when you send a message. A "Working..." status with a running timer appears instantly and updates to "Thinking..." if the model starts a thinking process.
-   **Streaming Responses:** The AI's answers are streamed in real-time as they are generated.
-   **Streaming Thinking Process:** For supported models, you can see the AI's thought process stream in real-time within a collapsible "Thinking" block, providing insight into its reasoning.
-   **Rich Text & Markdown:** AI responses are rendered as Markdown, with full support for formatting, lists, tables, and more.
-   **Code Highlighting:** Code blocks are automatically syntax-highlighted with a convenient "Copy" button.
-   **Message Management:** Easily edit or delete any message in the conversation.
-   **Response Info:** View detailed metadata for any AI response (response time, token counts) by clicking the info icon.
-   **Copy & Export:** Copy the entire chat to Markdown or export it to a JSON or Markdown file directly from the header.

### AI & Model Configuration

-   **Per-Request Settings:** A collapsible right-hand panel allows you to fine-tune parameters for each individual request:
    -   Select any of your activated AI **Models**.
    -   Adjust **Temperature** and **Top-P** for creativity.
    -   Set a **Max Output Tokens** limit.
    -   Toggle **Google Search Grounding** for fact-based responses.
    -   Toggle **URL Context** to provide web page context.
-   **Advanced Thinking Controls:**
    -   Enable or disable the **Thinking** feature.
    -   Set a specific token **Thinking Budget** or enable a **Dynamic Budget**.
-   **Custom System Prompts:**
    -   Create, save, and manage a library of custom system prompts in the Settings panel.
    -   Select any saved prompt from the configuration panel.
    -   Modify the selected prompt's text on-the-fly for the current session without altering the saved version.

### Chat & Data Management

-   **Local, Persistent History:** All conversations are saved to your browser's IndexedDB.
-   **Chat Search:** Instantly search the titles of all your chats.
-   **Folders:** Organize your chats into custom-named folders.
-   **Pin & Archive:** Pin important chats to the top of your history or archive irrelevant ones into a separate, collapsed section.
-   **Full Data Portability:**
    -   **Export/Import All Chats:** Backup your entire chat history to a single JSON file and import it into any gChat instance.
    -   **Export/Import Settings:** Backup all application settings (API keys, model list, etc.) to a JSON file for easy setup on a new device.
    -   **Delete All Chats:** A "Danger Zone" option to permanently delete all chat data.

### Application & Customization

-   **Progressive Web App (PWA):** Install gChat as a standalone application on your desktop or mobile device for a native-like experience.
-   **API Key Management:** Securely store multiple Google AI API keys. Add new keys, delete old ones, and set a default key for general use.
-   **Model Management:** Fetch the latest available models from Google. Activate/deactivate models, mark favorites for quick access, and manage your local model list.
-   **Theme Selection:** Choose between system, light, or dark themes.
-   **Context Window Control:** Adjust the number of past messages sent to the AI or enable "unlimited" context.
-   **Responsive Design:** The interface is designed to be fully usable on both desktop and mobile devices.

## Configuration

1.  **Get an API Key:** Obtain a Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  **Add the Key:**
    -   Open gChat and click the "Settings" button in the sidebar.
    -   Go to the `General` tab.
    -   Under "API Keys," enter a name for your key and paste the key value.
    -   Click "Add Key." The first key is automatically set as the default.

---

<div align="center">

**gChat** - Your Private, Powerful, and Customizable Gemini Chat Client.

</div>