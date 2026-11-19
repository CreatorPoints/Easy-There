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

            if (msg.content) {
                const bubble = document.createElement("div");
                bubble.className = "ai-chat-bubble";
                bubble.textContent = msg.content;
                bubbleWrap.appendChild(bubble);
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
                history: historySlice,
                personality: personality,
                customPersonality: customPersonality,
                memories: memories,
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

            let memoryBadgeText = null;

            if (data.newMemory && typeof data.newMemory === "string") {
                const cleanMemory = data.newMemory.trim();
                if (cleanMemory && !memories.includes(cleanMemory)) {
                    memories.push(cleanMemory);
                    saveMemories();
                    renderMemoriesList();
                    updateInsights();
                    memoryBadgeText = `Remembered: "${cleanMemory}"`;
                }
            }

            if (data.forgetMemory && typeof data.forgetMemory === "string") {
                const query = data.forgetMemory.trim().toLowerCase();
                const prevCount = memories.length;
                memories = memories.filter(function(m) {
                    return !m.toLowerCase().includes(query);
                });
                if (memories.length !== prevCount) {
                    saveMemories();
                    renderMemoriesList();
                    updateInsights();
                    memoryBadgeText = `Forgot: "${data.forgetMemory.trim()}"`;
                }
            }

            const replyMessage = data.message || "Done.";

            active.messages.push({
                role: "assistant",
                content: replyMessage,
                time: getCurrentTime(),
                actionInfo: actionBadgeText,
                memoryInfo: memoryBadgeText
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
    renderChatsList();
    renderActiveChat();
    if (inputEl) inputEl.focus();
})();