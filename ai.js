(function() {
    const CHATS_STORAGE_KEY = "easy_there_ai_chats";
    const ACTIVE_CHAT_KEY = "easy_there_ai_active_chat_id";
    const LEGACY_STORAGE_KEY = "easy_there_ai_chat_thread";

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

    const suggestionsRow = document.getElementById("ai-suggestions-row");
    const threadEl = document.getElementById("ai-chat-thread");
    const formEl = document.getElementById("ai-chat-form");
    const inputEl = document.getElementById("ai-chat-input");
    const submitBtn = document.getElementById("ai-chat-submit");
    const sendIcon = submitBtn ? submitBtn.querySelector(".ai-chat-send-icon") : null;
    const spinner = document.getElementById("ai-chat-spinner");

    const insightToday = document.getElementById("ai-insight-today");
    const insightTasks = document.getElementById("ai-insight-tasks");
    const insightEvents = document.getElementById("ai-insight-events");
    const insightProjects = document.getElementById("ai-insight-projects");
    const insightTranscripts = document.getElementById("ai-insight-transcripts");

    let chats = loadChats();
    let activeChatId = getInitialActiveChatId();

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

            const bubble = document.createElement("div");
            bubble.className = "ai-chat-bubble";
            bubble.textContent = msg.content;
            bubbleWrap.appendChild(bubble);

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

    async function handleUserPrompt(promptText) {
        const text = promptText ? promptText.trim() : "";
        if (!text) return;

        const active = getActiveChat();
        if (!active) return;

        const userMsg = {
            role: "user",
            content: text,
            time: getCurrentTime(),
            action: null
        };

        if (!Array.isArray(active.messages)) {
            active.messages = [];
        }
        active.messages.push(userMsg);
        active.updatedAt = new Date().toISOString();
        saveChats();
        renderActiveChatMessages();
        if (inputEl) inputEl.value = "";

        setLoading(true);

        try {
            const historySlice = active.messages
                .filter(function(m) { return m.role === "user" || m.role === "assistant"; })
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
                history: historySlice
            };

            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                active.messages.push({
                    role: "assistant",
                    content: data.error || "An error occurred while communicating with AI.",
                    time: getCurrentTime(),
                    action: null
                });
                active.updatedAt = new Date().toISOString();
                saveChats();
                renderActiveChatMessages();
                setLoading(false);
                return;
            }

            let actionBadgeText = null;

            if (data.action && typeof data.action === "object") {
                if (data.action.type === "create_event" && data.action.date && data.action.title) {
                    const events = getCalendarEvents();
                    if (!events[data.action.date]) {
                        events[data.action.date] = [];
                    }
                    events[data.action.date].push({
                        title: data.action.title,
                        time: data.action.time || "All Day",
                        startMinutes: data.action.startMinutes !== undefined ? data.action.startMinutes : null,
                        endMinutes: data.action.endMinutes !== undefined ? data.action.endMinutes : null,
                        source: "manual"
                    });
                    try {
                        localStorage.setItem("easy_there_calendar_events", JSON.stringify(events));
                    } catch (e) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncEventsToCloud) {
                        window.EasyThereFirebase.syncEventsToCloud(events);
                    }
                    actionBadgeText = `Scheduled: "${data.action.title}" on ${data.action.date} (${data.action.time || 'All Day'})`;
                } else if (data.action.type === "create_todo" && data.action.text) {
                    const todos = getTodos();
                    todos.push({
                        text: data.action.text,
                        completed: false
                    });
                    try {
                        localStorage.setItem("easy_there_todos", JSON.stringify(todos));
                    } catch (e) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncTodosToCloud) {
                        window.EasyThereFirebase.syncTodosToCloud(todos);
                    }
                    actionBadgeText = `Added To-Do: "${data.action.text}"`;
                } else if (data.action.type === "create_project" && data.action.title) {
                    const projects = getProjects();
                    const newProj = {
                        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        title: data.action.title.trim(),
                        description: (data.action.description || "").trim(),
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
                    actionBadgeText = `Created Project: "${data.action.title}"`;
                }
            }

            const replyMessage = data.message || "Done.";

            active.messages.push({
                role: "assistant",
                content: replyMessage,
                time: getCurrentTime(),
                actionInfo: actionBadgeText
            });

            if (!active.isTitleCustom && data.chatTitle) {
                const cleanedTitle = sanitizeChatTitle(data.chatTitle);
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
            active.messages.push({
                role: "assistant",
                content: "Unable to reach Easy There AI service. Please verify your connection.",
                time: getCurrentTime(),
                action: null
            });
            active.updatedAt = new Date().toISOString();
            saveChats();
            renderActiveChatMessages();
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
        }
    });

    if (window.EasyThereFirebase) {
        window.EasyThereFirebase.onUserChanged(async function(user) {
            if (user) {
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

    updateInsights();
    renderChatsList();
    renderActiveChat();
    if (inputEl) inputEl.focus();
})();