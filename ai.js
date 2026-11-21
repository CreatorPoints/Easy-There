(function() {
    const CHATS_STORAGE_KEY = "easy_there_ai_chats";
    const ACTIVE_CHAT_KEY = "easy_there_ai_active_chat_id";
    const LEGACY_STORAGE_KEY = "easy_there_ai_chat_thread";
    const PERSONALITY_STORAGE_KEY = "easy_there_ai_personality";
    const CUSTOM_PERSONALITY_KEY = "easy_there_ai_custom_instructions";
    const MEMORIES_STORAGE_KEY = "easy_there_ai_memories";

    const chatsListEl = document.getElementById("ai-chats-list");
    const chatsCountEl = document.getElementById("ai-chats-count");
    const newChatBtn = document.getElementById("ai-new-chat-btn");
    const panelNewChatBtn = document.getElementById("ai-panel-new-chat-btn");
    const toggleChatsBtn = document.getElementById("ai-toggle-chats-btn");
    const closeChatsBtn = document.getElementById("ai-chats-panel-close");
    const chatsPanelEl = document.getElementById("ai-chats-panel");
    const chatsBackdropEl = document.getElementById("ai-chats-backdrop");

    const activeChatNameEl = document.getElementById("ai-active-chat-name");
    const activeRenameBtn = document.getElementById("ai-active-rename-btn");
    const activeDeleteBtn = document.getElementById("ai-active-delete-btn");
    const activeTitleGroup = document.getElementById("ai-active-title-group");
    const activeRenameForm = document.getElementById("ai-active-rename-form");
    const activeRenameInput = document.getElementById("ai-active-rename-input");
    const activeRenameCancel = document.getElementById("ai-active-rename-cancel");

    const settingsBtn = document.getElementById("ai-settings-btn");
    const settingsModal = document.getElementById("ai-settings-modal");
    const settingsOverlay = document.getElementById("ai-settings-overlay");
    const settingsCloseBtn = document.getElementById("ai-settings-close-btn");
    const settingsSaveBtn = document.getElementById("ai-settings-save-btn");
    const personalityBtns = document.querySelectorAll(".ai-personality-btn");
    const customPersonalityInput = document.getElementById("ai-custom-personality-input");
    const memoriesListEl = document.getElementById("ai-memories-list");
    const memoriesCountBadge = document.getElementById("ai-memories-count-badge");
    const addMemoryForm = document.getElementById("ai-add-memory-form");
    const memoryInputEl = document.getElementById("ai-memory-input");

    const attachBtn = document.getElementById("ai-attach-btn");
    const fileInput = document.getElementById("ai-file-input");
    const attachedPreviewEl = document.getElementById("ai-attached-file-preview");

    const suggestionsRow = document.getElementById("ai-suggestions-row");
    const threadEl = document.getElementById("ai-chat-thread");
    const formEl = document.getElementById("ai-chat-form");
    const inputEl = document.getElementById("ai-chat-input");
    const submitBtn = document.getElementById("ai-chat-submit");
    const sendIcon = submitBtn ? submitBtn.querySelector(".ai-chat-send-icon") : null;
    const spinner = document.getElementById("ai-chat-spinner");
    const searchToggleBtn = document.getElementById("ai-search-toggle-btn");
    let isWebSearchEnabled = localStorage.getItem("easy_there_ai_web_search") === "true";
    let currentUtterance = null;
    let currentSpeakingBtn = null;

    if (window.mermaid) {
        try {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                securityLevel: "loose"
            });
        } catch (e) {}
    }

    const insightToday = document.getElementById("ai-insight-today");
    const insightTasks = document.getElementById("ai-insight-tasks");
    const insightEvents = document.getElementById("ai-insight-events");
    const insightProjects = document.getElementById("ai-insight-projects");
    const insightTranscripts = document.getElementById("ai-insight-transcripts");
    const insightMemories = document.getElementById("ai-insight-memories");
    const insightMemoriesPill = document.getElementById("ai-insight-memories-pill");

    let chats = loadChats();
    let activeChatId = getInitialActiveChatId();
    let personality = loadPersonality();
    let customPersonality = loadCustomPersonality();
    let memories = loadMemories();
    let attachedFile = null;

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getTodayString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function getCurrentDayOfWeek() {
        return new Date().toLocaleDateString("en-US", { weekday: "long" });
    }

    function getTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        } catch (e) {
            return "UTC";
        }
    }

    function getCalendarEvents() {
        try {
            const raw = localStorage.getItem("easy_there_calendar_events");
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function getGcalEvents() {
        if (window.EasyThereFirebase && window.EasyThereFirebase.getGoogleCalendarEvents) {
            const events = window.EasyThereFirebase.getGoogleCalendarEvents();
            if (events && Object.keys(events).length > 0) return events;
        }
        try {
            const raw = localStorage.getItem("easy_there_gcal_events");
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function getTodos() {
        try {
            const raw = localStorage.getItem("easy_there_todos");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function getProjects() {
        try {
            const raw = localStorage.getItem("easy_there_projects");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function getTranscripts() {
        try {
            const raw = localStorage.getItem("easy_there_transcripts");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function loadPersonality() {
        return localStorage.getItem(PERSONALITY_STORAGE_KEY) || "helpful";
    }

    function loadCustomPersonality() {
        return localStorage.getItem(CUSTOM_PERSONALITY_KEY) || "";
    }

    function loadMemories() {
        try {
            const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveMemories() {
        try {
            localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
        } catch (e) {}
        saveSettingsToCloud();
    }

    function savePersonality() {
        try {
            localStorage.setItem(PERSONALITY_STORAGE_KEY, personality);
            localStorage.setItem(CUSTOM_PERSONALITY_KEY, customPersonality);
        } catch (e) {}
        saveSettingsToCloud();
    }

    function saveSettingsToCloud() {
        if (window.EasyThereFirebase && window.EasyThereFirebase.syncAiSettingsToCloud) {
            window.EasyThereFirebase.syncAiSettingsToCloud({
                personality: personality,
                customPersonality: customPersonality,
                memories: memories
            });
        }
    }

    function getStoredGitHubData() {
        try {
            const raw = localStorage.getItem("easy_there_github_data");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function getStoredSlackData() {
        try {
            const raw = localStorage.getItem("easy_there_slack_data");
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        const webhook = localStorage.getItem("easy_there_slack_webhook");
        if (webhook) {
            return { webhook: webhook, channel: "", purpose: "" };
        }
        return null;
    }

    function getStoredSlackWebhook() {
        const data = getStoredSlackData();
        return data ? data.webhook : (localStorage.getItem("easy_there_slack_webhook") || null);
    }

    function updateSearchToggleUI() {
        if (!searchToggleBtn) return;
        if (isWebSearchEnabled) {
            searchToggleBtn.classList.add("active");
        } else {
            searchToggleBtn.classList.remove("active");
        }
    }

    function resetSpeakBtn(btn) {
        if (!btn) return;
        btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span>Listen</span>
        `;
    }

    function toggleSpeech(text, btn) {
        if (!window.speechSynthesis) return;
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (currentSpeakingBtn) {
                resetSpeakBtn(currentSpeakingBtn);
            }
            if (currentSpeakingBtn === btn) {
                currentSpeakingBtn = null;
                return;
            }
        }
        const cleanText = String(text || "")
            .replace(/<[^>]+>/g, " ")
            .replace(/[`*#$]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        currentSpeakingBtn = btn;
        btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <span>Stop</span>
        `;
        utterance.onend = function() {
            resetSpeakBtn(btn);
            currentSpeakingBtn = null;
        };
        utterance.onerror = function() {
            resetSpeakBtn(btn);
            currentSpeakingBtn = null;
        };
        window.speechSynthesis.speak(utterance);
    }

    function renderRichAssistantContent(rawText, container) {
        if (!rawText || !container) return;

        const mathTokens = [];
        let processed = String(rawText).replace(/\$\$([\s\S]*?)\$\$/g, function(match, expr) {
            const token = `@@MATH_BLOCK_${mathTokens.length}@@`;
            mathTokens.push({ token: token, expr: expr.trim(), display: true });
            return token;
        });

        processed = processed.replace(/(^|[^\\])\$([^\s\$](?:[^\$]*?[^\s\$])?)\$/g, function(match, prefix, expr) {
            const token = `@@MATH_INLINE_${mathTokens.length}@@`;
            mathTokens.push({ token: token, expr: expr.trim(), display: false });
            return prefix + token;
        });

        let html = "";
        if (window.marked && typeof window.marked.parse === "function") {
            html = window.marked.parse(processed, { breaks: true, gfm: true });
        } else {
            html = escapeHtml(processed).replace(/\n/g, "<br>");
        }

        mathTokens.forEach(function(item) {
            let renderedMath = "";
            if (window.katex && typeof window.katex.renderToString === "function") {
                try {
                    renderedMath = window.katex.renderToString(item.expr, {
                        displayMode: item.display,
                        throwOnError: false
                    });
                } catch (e) {
                    renderedMath = escapeHtml(item.display ? `$$${item.expr}$$` : `$${item.expr}$`);
                }
            } else {
                renderedMath = escapeHtml(item.display ? `$$${item.expr}$$` : `$${item.expr}$`);
            }
            html = html.replace(item.token, renderedMath);
        });

        container.innerHTML = html;

        const mermaidCodes = container.querySelectorAll("pre code.language-mermaid, pre code[class*='language-mermaid']");
        if (mermaidCodes.length > 0) {
            mermaidCodes.forEach(function(codeEl) {
                const pre = codeEl.parentElement;
                const diagramCode = codeEl.textContent.trim();
                const mermaidDiv = document.createElement("div");
                mermaidDiv.className = "mermaid-diagram";
                mermaidDiv.textContent = diagramCode;
                if (pre && pre.parentNode) {
                    pre.parentNode.replaceChild(mermaidDiv, pre);
                }
            });

            if (window.mermaid && typeof window.mermaid.run === "function") {
                try {
                    window.mermaid.run({
                        nodes: container.querySelectorAll(".mermaid-diagram")
                    });
                } catch (err) {}
            }
        }

        container.querySelectorAll("pre").forEach(function(pre) {
            if (pre.parentElement && pre.parentElement.classList.contains("ai-code-wrapper")) return;
            const code = pre.querySelector("code");
            const rawCode = code ? code.textContent : pre.textContent;

            let lang = "code";
            if (code && code.className) {
                const match = code.className.match(/language-([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    lang = match[1];
                }
            }

            const wrapper = document.createElement("div");
            wrapper.className = "ai-code-wrapper";

            const header = document.createElement("div");
            header.className = "ai-code-header";

            const langBadge = document.createElement("span");
            langBadge.className = "ai-code-lang";
            langBadge.textContent = lang;

            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "ai-code-copy-btn";
            copyBtn.setAttribute("aria-label", "Copy code");
            copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
            `;

            copyBtn.addEventListener("click", function() {
                navigator.clipboard.writeText(rawCode).then(function() {
                    copyBtn.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Copied!</span>
                    `;
                    setTimeout(function() {
                        copyBtn.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                });
            });

            header.appendChild(langBadge);
            header.appendChild(copyBtn);

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(header);
            wrapper.appendChild(pre);
        });

        container.querySelectorAll("a").forEach(function(anchor) {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noopener noreferrer");
        });
    }

    function updateInsights() {
        const todayStr = getTodayString();
        if (insightToday) insightToday.textContent = todayStr;

        const todos = getTodos();
        const pending = todos.filter(function(t) { return !t.completed; }).length;
        if (insightTasks) insightTasks.textContent = pending;

        const cal = getCalendarEvents();
        const gcal = getGcalEvents();
        const todayCal = (cal[todayStr] || []).length;
        const todayGcal = (gcal[todayStr] || []).length;
        if (insightEvents) insightEvents.textContent = todayCal + todayGcal;

        const projs = getProjects();
        if (insightProjects) insightProjects.textContent = projs.length;

        const trans = getTranscripts();
        if (insightTranscripts) insightTranscripts.textContent = trans.length;

        if (insightMemories) insightMemories.textContent = memories.length;
        if (memoriesCountBadge) memoriesCountBadge.textContent = memories.length;
    }

    function createWelcomeMessage() {
        return {
            role: "assistant",
            content: "Hello! I am Easy There AI. I have live access to your schedule, to-dos, projects, and meeting transcripts. Ask me anything, or tell me to schedule events, create tasks, or start new projects.",
            time: getCurrentTime(),
            action: null,
            actionInfo: null
        };
    }

    function createNewChatObject(title) {
        const now = new Date();
        return {
            id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            title: title || "New Chat",
            isTitleCustom: false,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            messages: [createWelcomeMessage()]
        };
    }

    function loadChats() {
        try {
            const raw = localStorage.getItem(CHATS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {}

        try {
            const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
            const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : null;
            if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
                const migratedChat = {
                    id: `chat_${Date.now()}_migrated`,
                    title: "Conversation",
                    isTitleCustom: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    messages: legacyParsed
                };
                return [migratedChat];
            }
        } catch (e) {}

        const defaultChat = createNewChatObject("New Chat");
        return [defaultChat];
    }

    function saveChats() {
        try {
            localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
        } catch (e) {}
        try {
            localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
        } catch (e) {}
        if (window.EasyThereFirebase && window.EasyThereFirebase.syncChatsToCloud) {
            window.EasyThereFirebase.syncChatsToCloud(chats);
        }
    }

    function getInitialActiveChatId() {
        try {
            const stored = localStorage.getItem(ACTIVE_CHAT_KEY);
            if (stored && chats.some(function(c) { return c.id === stored; })) {
                return stored;
            }
        } catch (e) {}
        return chats[0] ? chats[0].id : null;
    }

    function getActiveChat() {
        let found = chats.find(function(c) { return c.id === activeChatId; });
        if (!found && chats.length > 0) {
            activeChatId = chats[0].id;
            found = chats[0];
        }
        return found;
    }

    function selectChat(chatId) {
        activeChatId = chatId;
        closeMobileChatsPanel();
        closeActiveRename();
        saveChats();
        renderChatsList();
        renderActiveChat();
        if (inputEl) inputEl.focus();
    }

    function createNewChat() {
        const newChat = createNewChatObject("New Chat");
        chats.unshift(newChat);
        activeChatId = newChat.id;
        closeMobileChatsPanel();
        closeActiveRename();
        saveChats();
        renderChatsList();
        renderActiveChat();
        if (inputEl) inputEl.focus();
    }

    function deleteChat(chatId) {
        chats = chats.filter(function(c) { return c.id !== chatId; });
        if (chats.length === 0) {
            const fresh = createNewChatObject("New Chat");
            chats.push(fresh);
            activeChatId = fresh.id;
        } else if (activeChatId === chatId) {
            activeChatId = chats[0].id;
        }
        closeActiveRename();
        saveChats();
        renderChatsList();
        renderActiveChat();
    }

    function renameChat(chatId, newTitle) {
        const trimmed = (newTitle || "").trim();
        if (!trimmed) return;
        const target = chats.find(function(c) { return c.id === chatId; });
        if (target) {
            target.title = trimmed;
            target.isTitleCustom = true;
            target.updatedAt = new Date().toISOString();
            saveChats();
            renderChatsList();
            renderActiveChatHeader();
        }
    }

    function openActiveRename() {
        const active = getActiveChat();
        if (!active) return;
        if (activeTitleGroup) activeTitleGroup.classList.add("hidden");
        if (activeRenameForm) {
            activeRenameForm.classList.remove("hidden");
            if (activeRenameInput) {
                activeRenameInput.value = active.title;
                activeRenameInput.focus();
                activeRenameInput.select();
            }
        }
    }

    function closeActiveRename() {
        if (activeTitleGroup) activeTitleGroup.classList.remove("hidden");
        if (activeRenameForm) activeRenameForm.classList.add("hidden");
    }

    function openMobileChatsPanel() {
        if (chatsPanelEl) chatsPanelEl.classList.add("open");
        if (chatsBackdropEl) chatsBackdropEl.classList.add("active");
    }

    function closeMobileChatsPanel() {
        if (chatsPanelEl) chatsPanelEl.classList.remove("open");
        if (chatsBackdropEl) chatsBackdropEl.classList.remove("active");
    }

    function formatChatDate(isoString) {
        if (!isoString) return "";
        try {
            const d = new Date(isoString);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            }
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch (e) {
            return "";
        }
    }

    function renderChatsList() {
        if (!chatsListEl) return;
        if (chatsCountEl) {
            chatsCountEl.textContent = chats.length;
        }

        chatsListEl.innerHTML = "";

        chats.forEach(function(chat) {
            const item = document.createElement("div");
            item.className = `ai-chat-item ${chat.id === activeChatId ? 'active' : ''}`;
            item.dataset.id = chat.id;

            const iconSpan = document.createElement("span");
            iconSpan.className = "ai-chat-item-icon";
            iconSpan.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            `;

            const infoDiv = document.createElement("div");
            infoDiv.className = "ai-chat-item-info";

            const titleSpan = document.createElement("span");
            titleSpan.className = "ai-chat-item-title";
            titleSpan.textContent = chat.title || "New Chat";

            const metaSpan = document.createElement("span");
            metaSpan.className = "ai-chat-item-meta";
            metaSpan.textContent = formatChatDate(chat.updatedAt || chat.createdAt);

            infoDiv.appendChild(titleSpan);
            infoDiv.appendChild(metaSpan);

            const actionsDiv = document.createElement("div");
            actionsDiv.className = "ai-chat-item-actions";

            const renameBtn = document.createElement("button");
            renameBtn.type = "button";
            renameBtn.className = "ai-chat-item-action-btn";
            renameBtn.setAttribute("aria-label", "Rename conversation");
            renameBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
            `;

            renameBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                selectChat(chat.id);
                openActiveRename();
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "ai-chat-item-action-btn delete-btn";
            deleteBtn.setAttribute("aria-label", "Delete conversation");
            deleteBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;

            deleteBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                deleteChat(chat.id);
            });

            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);

            item.appendChild(iconSpan);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);

            item.addEventListener("click", function() {
                selectChat(chat.id);
            });

            chatsListEl.appendChild(item);
        });
    }

    function renderActiveChatHeader() {
        const active = getActiveChat();
        if (!active) return;
        if (activeChatNameEl) {
            activeChatNameEl.textContent = active.title || "New Chat";
        }
    }

    function renderActiveChatMessages() {
        if (!threadEl) return;
        const active = getActiveChat();
        if (!active) return;

        threadEl.innerHTML = "";

        const msgList = Array.isArray(active.messages) ? active.messages : [];
        if (suggestionsRow) {
            if (msgList.length <= 1) {
                suggestionsRow.classList.remove("hidden");
            } else {
                suggestionsRow.classList.add("hidden");
            }
        }

        msgList.forEach(function(msg) {
            const item = document.createElement("div");
            item.className = `ai-chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`;

            if (msg.role === "assistant") {
                const avatar = document.createElement("div");
                avatar.className = "ai-avatar";
                avatar.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
                    </svg>
                `;
                item.appendChild(avatar);
            }

            const bubbleWrap = document.createElement("div");
            bubbleWrap.className = "ai-bubble-wrap";

            if (msg.file) {
                const fileCard = document.createElement("div");
                fileCard.className = "ai-chat-file-card";

                if (msg.file.isImage && msg.file.thumbnail) {
                    const thumb = document.createElement("img");
                    thumb.className = "ai-chat-file-thumb";
                    thumb.src = msg.file.thumbnail;
                    thumb.alt = msg.file.name || "Attached image";
                    fileCard.appendChild(thumb);
                } else {
                    const fileIcon = document.createElement("span");
                    fileIcon.className = "ai-chat-file-icon";
                    fileIcon.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    `;
                    fileCard.appendChild(fileIcon);
                }

                const fileMeta = document.createElement("div");
                fileMeta.className = "ai-chat-file-meta";

                const fileName = document.createElement("span");
                fileName.className = "ai-chat-file-name";
                fileName.textContent = msg.file.name || "Attached File";

                const fileSize = document.createElement("span");
                fileSize.className = "ai-chat-file-size";
                fileSize.textContent = formatBytes(msg.file.size);

                fileMeta.appendChild(fileName);
                fileMeta.appendChild(fileSize);
                fileCard.appendChild(fileMeta);

                bubbleWrap.appendChild(fileCard);
            }

            if (msg.content || msg.role === "assistant") {
                const bubble = document.createElement("div");
                bubble.className = "ai-chat-bubble";
                if (msg.role === "assistant") {
                    if (msg.content) {
                        renderRichAssistantContent(msg.content, bubble);
                    } else {
                        bubble.innerHTML = `<span class="ai-typing-cursor"></span>`;
                    }
                } else {
                    bubble.textContent = msg.content;
                }
                bubbleWrap.appendChild(bubble);
            }

            if (msg.webSearchUsed) {
                const searchBadge = document.createElement("div");
                searchBadge.className = "ai-web-grounded-badge";
                searchBadge.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span>Grounded with Web Search</span>
                `;
                bubbleWrap.appendChild(searchBadge);
            }

            if (msg.actionInfo) {
                const badge = document.createElement("div");
                badge.className = "ai-action-badge";
                badge.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>${escapeHtml(msg.actionInfo)}</span>
                `;
                bubbleWrap.appendChild(badge);
            }

            if (msg.memoryInfo) {
                const memBadge = document.createElement("div");
                memBadge.className = "ai-action-badge ai-memory-badge";
                memBadge.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
                    </svg>
                    <span>${escapeHtml(msg.memoryInfo)}</span>
                `;
                bubbleWrap.appendChild(memBadge);
            }

            if (msg.role === "assistant" && msg.content) {
                const toolbar = document.createElement("div");
                toolbar.className = "ai-message-toolbar";

                const copyMsgBtn = document.createElement("button");
                copyMsgBtn.type = "button";
                copyMsgBtn.className = "ai-msg-action-btn";
                copyMsgBtn.setAttribute("aria-label", "Copy message");
                copyMsgBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                `;
                copyMsgBtn.addEventListener("click", function() {
                    navigator.clipboard.writeText(msg.content).then(function() {
                        copyMsgBtn.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Copied!</span>
                        `;
                        setTimeout(function() {
                            copyMsgBtn.innerHTML = `
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            `;
                        }, 2000);
                    });
                });
                toolbar.appendChild(copyMsgBtn);

                if (window.speechSynthesis) {
                    const speakBtn = document.createElement("button");
                    speakBtn.type = "button";
                    speakBtn.className = "ai-msg-action-btn";
                    speakBtn.setAttribute("aria-label", "Read aloud");
                    resetSpeakBtn(speakBtn);
                    speakBtn.addEventListener("click", function() {
                        toggleSpeech(msg.content, speakBtn);
                    });
                    toolbar.appendChild(speakBtn);
                }

                bubbleWrap.appendChild(toolbar);
            }

            if (msg.time) {
                const timeEl = document.createElement("span");
                timeEl.className = "ai-chat-time";
                timeEl.textContent = msg.time;
                bubbleWrap.appendChild(timeEl);
            }

            item.appendChild(bubbleWrap);
            threadEl.appendChild(item);
        });

        threadEl.scrollTop = threadEl.scrollHeight;
    }

    function renderActiveChat() {
        renderActiveChatHeader();
        renderActiveChatMessages();
    }

    function setLoading(isLoading) {
        if (inputEl) inputEl.disabled = isLoading;
        if (submitBtn) submitBtn.disabled = isLoading;
        if (sendIcon) {
            if (isLoading) sendIcon.classList.add("hidden");
            else sendIcon.classList.remove("hidden");
        }
        if (spinner) {
            if (isLoading) spinner.classList.remove("hidden");
            else spinner.classList.add("hidden");
        }
    }

    function sanitizeChatTitle(raw) {
        if (!raw || typeof raw !== "string") return "";
        let cleaned = raw.replace(/["'`]/g, "").replace(/\.+$/, "").trim();
        if (cleaned.length > 36) {
            cleaned = cleaned.substring(0, 36).trim();
        }
        return cleaned;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    function createThumbnail(dataUrl) {
        return new Promise(function(resolve) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;
                const maxDim = 120;
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = function() {
                resolve(null);
            };
            img.src = dataUrl;
        });
    }

    function downscaleImageForUpload(dataUrl) {
        return new Promise(function(resolve) {
            const img = new Image();
            img.onload = function() {
                const maxDim = 1200;
                if (img.width <= maxDim && img.height <= maxDim) {
                    resolve(dataUrl);
                    return;
                }
                const canvas = document.createElement("canvas");
                const ratio = Math.min(maxDim / img.width, maxDim / img.height);
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.onerror = function() {
                resolve(dataUrl);
            };
            img.src = dataUrl;
        });
    }

    async function processFile(file) {
        if (!file) return;
        const isImage = file.type.startsWith("image/");
        if (isImage) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const rawDataUrl = e.target.result;
                const [thumb, uploadUrl] = await Promise.all([
                    createThumbnail(rawDataUrl),
                    downscaleImageForUpload(rawDataUrl)
                ]);
                attachedFile = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    isImage: true,
                    content: uploadUrl,
                    thumbnail: thumb
                };
                renderAttachedFilePreview();
                if (inputEl) inputEl.focus();
            };
            reader.readAsDataURL(file);
        } else {
            const isTextLikely = file.type.startsWith("text/") ||
                file.type.includes("json") ||
                file.type.includes("javascript") ||
                file.type.includes("xml") ||
                /\.(txt|md|js|ts|jsx|tsx|py|html|css|json|csv|xml|log|yaml|yml|sh|env|sql|c|cpp|h|java|rb|go|rs|php)$/i.test(file.name);

            if (isTextLikely) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    attachedFile = {
                        name: file.name,
                        size: file.size,
                        type: file.type || "text/plain",
                        isImage: false,
                        content: String(e.target.result).slice(0, 25000),
                        thumbnail: null
                    };
                    renderAttachedFilePreview();
                    if (inputEl) inputEl.focus();
                };
                reader.readAsText(file);
            } else {
                attachedFile = {
                    name: file.name,
                    size: file.size,
                    type: file.type || "application/octet-stream",
                    isImage: false,
                    content: "",
                    thumbnail: null
                };
                renderAttachedFilePreview();
                if (inputEl) inputEl.focus();
            }
        }
    }

    function renderAttachedFilePreview() {
        if (!attachedPreviewEl) return;
        if (!attachedFile) {
            attachedPreviewEl.classList.add("hidden");
            attachedPreviewEl.innerHTML = "";
            return;
        }

        attachedPreviewEl.classList.remove("hidden");
        attachedPreviewEl.innerHTML = `
            <div class="ai-attached-info">
                ${attachedFile.thumbnail
                    ? `<img src="${attachedFile.thumbnail}" class="ai-attached-thumb" alt="${escapeHtml(attachedFile.name)}">`
                    : `<svg class="ai-attached-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                       </svg>`
                }
                <span class="ai-attached-name">${escapeHtml(attachedFile.name)}</span>
                <span class="ai-attached-size">${formatBytes(attachedFile.size)}</span>
            </div>
            <button type="button" class="icon-button ai-attached-remove-btn" id="ai-attached-remove-btn" aria-label="Remove attached file">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        const removeBtn = document.getElementById("ai-attached-remove-btn");
        if (removeBtn) {
            removeBtn.addEventListener("click", function() {
                attachedFile = null;
                if (fileInput) fileInput.value = "";
                renderAttachedFilePreview();
            });
        }
    }

    function openSettingsModal() {
        renderPersonalitySelection();
        renderMemoriesList();
        if (settingsModal) settingsModal.classList.remove("hidden");
    }

    function closeSettingsModal() {
        if (customPersonalityInput) {
            customPersonality = customPersonalityInput.value.trim();
            savePersonality();
        }
        if (settingsModal) settingsModal.classList.add("hidden");
    }

    function selectPersonality(p) {
        personality = p || "helpful";
        savePersonality();
        renderPersonalitySelection();
    }

    function renderPersonalitySelection() {
        personalityBtns.forEach(function(btn) {
            if (btn.dataset.personality === personality) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
        if (customPersonalityInput) {
            customPersonalityInput.value = customPersonality;
        }
    }

    function renderMemoriesList() {
        if (!memoriesListEl) return;
        if (memoriesCountBadge) {
            memoriesCountBadge.textContent = memories.length;
        }
        if (insightMemories) {
            insightMemories.textContent = memories.length;
        }

        memoriesListEl.innerHTML = "";

        if (memories.length === 0) {
            const empty = document.createElement("div");
            empty.className = "ai-memories-empty";
            empty.textContent = "No memories saved yet. Add one above or tell the AI to remember things in chat.";
            memoriesListEl.appendChild(empty);
            return;
        }

        memories.forEach(function(mem, idx) {
            const item = document.createElement("div");
            item.className = "ai-memory-item";

            const textSpan = document.createElement("span");
            textSpan.className = "ai-memory-item-text";
            textSpan.textContent = mem;

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "ai-memory-delete-btn";
            delBtn.setAttribute("aria-label", "Delete memory");
            delBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;

            delBtn.addEventListener("click", function() {
                memories.splice(idx, 1);
                saveMemories();
                renderMemoriesList();
                updateInsights();
            });

            item.appendChild(textSpan);
            item.appendChild(delBtn);
            memoriesListEl.appendChild(item);
        });
    }

    async function handleUserPrompt(promptText) {
        const text = promptText ? promptText.trim() : "";
        if (!text && !attachedFile) return;

        const active = getActiveChat();
        if (!active) return;

        const fileToSend = attachedFile;
        attachedFile = null;
        if (fileInput) fileInput.value = "";
        renderAttachedFilePreview();

        const userMsg = {
            role: "user",
            content: text || (fileToSend ? `Attached file: ${fileToSend.name}` : ""),
            time: getCurrentTime(),
            action: null,
            file: fileToSend ? {
                name: fileToSend.name,
                size: fileToSend.size,
                type: fileToSend.type,
                isImage: fileToSend.isImage,
                thumbnail: fileToSend.thumbnail
            } : null
        };

        if (!Array.isArray(active.messages)) {
            active.messages = [];
        }
        active.messages.push(userMsg);

        const assistantMsg = {
            role: "assistant",
            content: "",
            time: getCurrentTime(),
            actionInfo: null,
            memoryInfo: null,
            webSearchUsed: false
        };
        active.messages.push(assistantMsg);

        active.updatedAt = new Date().toISOString();
        saveChats();
        renderActiveChatMessages();
        if (inputEl) inputEl.value = "";

        setLoading(true);

        const assistantMessageEls = threadEl ? threadEl.querySelectorAll(".assistant-message") : [];
        const lastAssistantMsgEl = assistantMessageEls.length > 0 ? assistantMessageEls[assistantMessageEls.length - 1] : null;
        const bubbleEl = lastAssistantMsgEl ? lastAssistantMsgEl.querySelector(".ai-chat-bubble") : null;
        const currentTargetChatId = active.id;

        try {
            const historySlice = active.messages
                .filter(function(m) { return (m.role === "user" || m.role === "assistant") && m !== assistantMsg && m.content; })
                .slice(-8)
                .map(function(m) {
                    return { role: m.role, content: m.content };
                });

            const payload = {
                prompt: text,
                currentDate: getTodayString(),
                currentTime: getCurrentTime(),
                currentDayOfWeek: getCurrentDayOfWeek(),
                timezone: getTimezone(),
                currentPage: "AI",
                selectedDate: null,
                calendarEvents: getCalendarEvents(),
                gcalEvents: getGcalEvents(),
                todos: getTodos(),
                projects: getProjects(),
                transcripts: getTranscripts(),
                history: historySlice,
                personality: personality,
                customPersonality: customPersonality,
                memories: memories,
                webSearch: isWebSearchEnabled,
                githubData: getStoredGitHubData(),
                slackConnected: Boolean(getStoredSlackData()),
                slackData: getStoredSlackData(),
                file: fileToSend ? {
                    name: fileToSend.name,
                    size: fileToSend.size,
                    type: fileToSend.type,
                    isImage: fileToSend.isImage,
                    content: fileToSend.content
                } : null
            };

            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(function() { return {}; });
                assistantMsg.content = errData.error || "An error occurred while communicating with AI.";
                active.updatedAt = new Date().toISOString();
                saveChats();
                renderActiveChat();
                return;
            }

            let doneData = null;
            let accumulatedText = "";

            if (res.body && typeof res.body.getReader === "function") {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let streamBuffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    streamBuffer += decoder.decode(value, { stream: true });
                    const lines = streamBuffer.split("\n");
                    streamBuffer = lines.pop() || "";

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line || !line.startsWith("data: ")) continue;
                        const jsonPayload = line.slice(6);
                        if (jsonPayload === "[DONE]") continue;

                        try {
                            const evt = JSON.parse(jsonPayload);
                            if (evt.error) {
                                accumulatedText = evt.error;
                                assistantMsg.content = accumulatedText;
                                if (bubbleEl && activeChatId === currentTargetChatId) {
                                    bubbleEl.textContent = accumulatedText;
                                }
                            } else if (evt.type === "token" && typeof evt.content === "string") {
                                accumulatedText += evt.content;
                                assistantMsg.content = accumulatedText;
                                if (bubbleEl && activeChatId === currentTargetChatId) {
                                    if (window.marked && typeof window.marked.parse === "function") {
                                        bubbleEl.innerHTML = window.marked.parse(accumulatedText, { breaks: true, gfm: true });
                                    } else {
                                        bubbleEl.textContent = accumulatedText;
                                    }
                                    threadEl.scrollTop = threadEl.scrollHeight;
                                }
                            } else if (evt.type === "done") {
                                doneData = evt;
                            }
                        } catch (e) {}
                    }
                }
            } else {
                const data = await res.json();
                accumulatedText = data.message || "Done.";
                assistantMsg.content = accumulatedText;
                doneData = data;
            }

            if (!accumulatedText) {
                accumulatedText = "Done.";
                assistantMsg.content = accumulatedText;
            }

            let actionBadgeText = null;

            if (doneData && doneData.action && typeof doneData.action === "object") {
                if (doneData.action.type === "create_event" && doneData.action.date && doneData.action.title) {
                    const events = getCalendarEvents();
                    if (!events[doneData.action.date]) {
                        events[doneData.action.date] = [];
                    }
                    events[doneData.action.date].push({
                        title: doneData.action.title,
                        time: doneData.action.time || "All Day",
                        startMinutes: doneData.action.startMinutes !== undefined ? doneData.action.startMinutes : null,
                        endMinutes: doneData.action.endMinutes !== undefined ? doneData.action.endMinutes : null,
                        source: "manual"
                    });
                    try {
                        localStorage.setItem("easy_there_calendar_events", JSON.stringify(events));
                    } catch (e) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncEventsToCloud) {
                        window.EasyThereFirebase.syncEventsToCloud(events);
                    }
                    actionBadgeText = `Scheduled: "${doneData.action.title}" on ${doneData.action.date} (${doneData.action.time || 'All Day'})`;
                } else if (doneData.action.type === "create_todo" && doneData.action.text) {
                    const todos = getTodos();
                    todos.push({
                        text: doneData.action.text,
                        completed: false
                    });
                    try {
                        localStorage.setItem("easy_there_todos", JSON.stringify(todos));
                    } catch (e) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncTodosToCloud) {
                        window.EasyThereFirebase.syncTodosToCloud(todos);
                    }
                    actionBadgeText = `Added To-Do: "${doneData.action.text}"`;
                } else if (doneData.action.type === "create_project" && doneData.action.title) {
                    const projects = getProjects();
                    const newProj = {
                        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        title: doneData.action.title.trim(),
                        description: (doneData.action.description || "").trim(),
                        color: "default",
                        createdAt: new Date().toISOString(),
                        tasks: []
                    };
                    projects.unshift(newProj);
                    try {
                        localStorage.setItem("easy_there_projects", JSON.stringify(projects));
                    } catch (e) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncProjectsToCloud) {
                        window.EasyThereFirebase.syncProjectsToCloud(projects);
                    }
                    actionBadgeText = `Created Project: "${doneData.action.title}"`;
                } else if (doneData.action.type === "slack_message" && doneData.action.text) {
                    const slackData = getStoredSlackData();
                    if (slackData && slackData.mode === "token" && slackData.token && slackData.channelId) {
                        try {
                            const slackRes = await fetch("/api/slack", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    action: "send_message",
                                    token: slackData.token,
                                    channelId: slackData.channelId,
                                    text: doneData.action.text
                                })
                            });
                            const slackResData = await slackRes.json();
                            if (slackRes.ok && slackResData.ok) {
                                actionBadgeText = `Sent update to Slack (${slackData.channel || 'channel'})`;
                            } else {
                                actionBadgeText = "Failed to post to Slack API";
                            }
                        } catch (e) {
                            actionBadgeText = "Failed to post to Slack API";
                        }
                    } else {
                        const slackWebhook = getStoredSlackWebhook();
                        if (slackWebhook) {
                            try {
                                await fetch(slackWebhook, {
                                    method: "POST",
                                    mode: "no-cors",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ text: doneData.action.text })
                                });
                                actionBadgeText = "Sent update to Slack";
                            } catch (e) {
                                actionBadgeText = "Failed to post to Slack";
                            }
                        } else {
                            actionBadgeText = "Slack not connected in Integrations";
                        }
                    }
                }
            }

            let memoryBadgeText = null;

            if (doneData && doneData.newMemory && typeof doneData.newMemory === "string") {
                const cleanMemory = doneData.newMemory.trim();
                if (cleanMemory && !memories.includes(cleanMemory)) {
                    memories.push(cleanMemory);
                    saveMemories();
                    renderMemoriesList();
                    updateInsights();
                    memoryBadgeText = `Remembered: "${cleanMemory}"`;
                }
            }

            if (doneData && doneData.forgetMemory && typeof doneData.forgetMemory === "string") {
                const query = doneData.forgetMemory.trim().toLowerCase();
                const prevCount = memories.length;
                memories = memories.filter(function(m) {
                    return !m.toLowerCase().includes(query);
                });
                if (memories.length !== prevCount) {
                    saveMemories();
                    renderMemoriesList();
                    updateInsights();
                    memoryBadgeText = `Forgot: "${doneData.forgetMemory.trim()}"`;
                }
            }

            assistantMsg.content = accumulatedText;
            assistantMsg.actionInfo = actionBadgeText;
            assistantMsg.memoryInfo = memoryBadgeText;
            assistantMsg.webSearchUsed = Boolean(doneData && doneData.webSearchUsed);

            if (!active.isTitleCustom && doneData && doneData.chatTitle) {
                const cleanedTitle = sanitizeChatTitle(doneData.chatTitle);
                if (cleanedTitle) {
                    active.title = cleanedTitle;
                }
            }

            active.updatedAt = new Date().toISOString();
            saveChats();
            renderChatsList();
            renderActiveChat();
            updateInsights();
        } catch (err) {
            assistantMsg.content = "Unable to reach Easy There AI service. Please verify your connection.";
            active.updatedAt = new Date().toISOString();
            saveChats();
            renderActiveChat();
        } finally {
            setLoading(false);
            if (inputEl) inputEl.focus();
        }
    }

    if (newChatBtn) {
        newChatBtn.addEventListener("click", createNewChat);
    }

    if (panelNewChatBtn) {
        panelNewChatBtn.addEventListener("click", createNewChat);
    }

    if (searchToggleBtn) {
        searchToggleBtn.addEventListener("click", function() {
            isWebSearchEnabled = !isWebSearchEnabled;
            try {
                localStorage.setItem("easy_there_ai_web_search", String(isWebSearchEnabled));
            } catch (e) {}
            updateSearchToggleUI();
        });
    }

    if (toggleChatsBtn) {
        toggleChatsBtn.addEventListener("click", function() {
            if (chatsPanelEl && chatsPanelEl.classList.contains("open")) {
                closeMobileChatsPanel();
            } else {
                openMobileChatsPanel();
            }
        });
    }

    if (closeChatsBtn) {
        closeChatsBtn.addEventListener("click", closeMobileChatsPanel);
    }

    if (chatsBackdropEl) {
        chatsBackdropEl.addEventListener("click", closeMobileChatsPanel);
    }

    if (activeRenameBtn) {
        activeRenameBtn.addEventListener("click", openActiveRename);
    }

    if (activeRenameCancel) {
        activeRenameCancel.addEventListener("click", closeActiveRename);
    }

    if (activeRenameForm) {
        activeRenameForm.addEventListener("submit", function(e) {
            e.preventDefault();
            if (activeRenameInput) {
                renameChat(activeChatId, activeRenameInput.value);
            }
            closeActiveRename();
        });
    }

    if (activeDeleteBtn) {
        activeDeleteBtn.addEventListener("click", function() {
            deleteChat(activeChatId);
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener("click", openSettingsModal);
    }

    if (insightMemoriesPill) {
        insightMemoriesPill.addEventListener("click", openSettingsModal);
    }

    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener("click", closeSettingsModal);
    }

    if (settingsOverlay) {
        settingsOverlay.addEventListener("click", closeSettingsModal);
    }

    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener("click", closeSettingsModal);
    }

    personalityBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
            selectPersonality(btn.dataset.personality);
        });
    });

    if (customPersonalityInput) {
        customPersonalityInput.addEventListener("input", function() {
            customPersonality = customPersonalityInput.value;
            try {
                localStorage.setItem(CUSTOM_PERSONALITY_KEY, customPersonality);
            } catch (e) {}
            saveSettingsToCloud();
        });
    }

    if (addMemoryForm && memoryInputEl) {
        addMemoryForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const text = memoryInputEl.value.trim();
            if (text && !memories.includes(text)) {
                memories.push(text);
                memoryInputEl.value = "";
                saveMemories();
                renderMemoriesList();
                updateInsights();
            }
        });
    }

    if (attachBtn && fileInput) {
        attachBtn.addEventListener("click", function() {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", function(e) {
            const file = e.target.files && e.target.files[0];
            if (file) {
                processFile(file);
            }
        });
    }

    const chatMainSection = document.querySelector(".ai-chat-main");
    if (chatMainSection) {
        chatMainSection.addEventListener("dragover", function(e) {
            e.preventDefault();
            chatMainSection.classList.add("drag-over");
        });
        chatMainSection.addEventListener("dragleave", function(e) {
            e.preventDefault();
            chatMainSection.classList.remove("drag-over");
        });
        chatMainSection.addEventListener("drop", function(e) {
            e.preventDefault();
            chatMainSection.classList.remove("drag-over");
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) {
                processFile(file);
            }
        });
    }

    if (formEl) {
        formEl.addEventListener("submit", function(e) {
            e.preventDefault();
            if (inputEl) {
                handleUserPrompt(inputEl.value);
            }
        });
    }

    const suggestionChips = document.querySelectorAll(".ai-suggestion-chip");
    suggestionChips.forEach(function(chip) {
        chip.addEventListener("click", function() {
            const prompt = chip.getAttribute("data-prompt");
            if (prompt) {
                handleUserPrompt(prompt);
            }
        });
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closeActiveRename();
            closeMobileChatsPanel();
            closeSettingsModal();
        }
    });

    if (window.EasyThereFirebase) {
        window.EasyThereFirebase.onUserChanged(async function(user) {
            if (user) {
                const cloudSettings = await window.EasyThereFirebase.fetchAiSettingsFromCloud();
                if (cloudSettings && typeof cloudSettings === "object") {
                    if (cloudSettings.personality) {
                        personality = cloudSettings.personality;
                        try {
                            localStorage.setItem(PERSONALITY_STORAGE_KEY, personality);
                        } catch (e) {}
                    }
                    if (cloudSettings.customPersonality !== undefined) {
                        customPersonality = cloudSettings.customPersonality;
                        try {
                            localStorage.setItem(CUSTOM_PERSONALITY_KEY, customPersonality);
                        } catch (e) {}
                    }
                    if (Array.isArray(cloudSettings.memories)) {
                        memories = cloudSettings.memories;
                        try {
                            localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
                        } catch (e) {}
                    }
                    renderPersonalitySelection();
                    renderMemoriesList();
                    updateInsights();
                } else if (memories.length > 0 || personality !== "helpful" || customPersonality) {
                    saveSettingsToCloud();
                }

                const cloudChats = await window.EasyThereFirebase.fetchChatsFromCloud();
                if (cloudChats && Array.isArray(cloudChats) && cloudChats.length > 0) {
                    chats = cloudChats;
                    if (!chats.some(function(c) { return c.id === activeChatId; })) {
                        activeChatId = chats[0].id;
                    }
                    try {
                        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
                        localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
                    } catch (e) {}
                    renderChatsList();
                    renderActiveChat();
                } else if (chats.length > 0) {
                    window.EasyThereFirebase.syncChatsToCloud(chats);
                }
            }
        });
    }

    renderPersonalitySelection();
    renderMemoriesList();
    renderAttachedFilePreview();
    updateInsights();
    updateSearchToggleUI();
    renderChatsList();
    renderActiveChat();
    if (inputEl) inputEl.focus();
})();