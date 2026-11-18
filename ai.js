(function() {
    const CHAT_STORAGE_KEY = "easy_there_ai_chat_thread";
    const threadEl = document.getElementById("ai-chat-thread");
    const formEl = document.getElementById("ai-chat-form");
    const inputEl = document.getElementById("ai-chat-input");
    const submitBtn = document.getElementById("ai-chat-submit");
    const sendIcon = submitBtn ? submitBtn.querySelector(".ai-chat-send-icon") : null;
    const spinner = document.getElementById("ai-chat-spinner");
    const clearBtn = document.getElementById("ai-clear-chat-btn");

    const insightToday = document.getElementById("ai-insight-today");
    const insightTasks = document.getElementById("ai-insight-tasks");
    const insightEvents = document.getElementById("ai-insight-events");
    const insightProjects = document.getElementById("ai-insight-projects");
    const insightTranscripts = document.getElementById("ai-insight-transcripts");

    let messages = loadMessages();

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

    function loadMessages() {
        try {
            const raw = localStorage.getItem(CHAT_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {}

        return [
            {
                role: "assistant",
                content: "Hello! I am Easy There AI. I have live access to your schedule, to-dos, projects, and meeting transcripts. Ask me anything, or tell me to schedule events, create tasks, or start new projects.",
                time: getCurrentTime(),
                action: null
            }
        ];
    }

    function saveMessages() {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {}
    }

    function renderMessages() {
        if (!threadEl) return;
        threadEl.innerHTML = "";

        messages.forEach(function(msg) {
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

    async function handleUserPrompt(promptText) {
        const text = promptText ? promptText.trim() : "";
        if (!text) return;

        const userMsg = {
            role: "user",
            content: text,
            time: getCurrentTime(),
            action: null
        };
        messages.push(userMsg);
        saveMessages();
        renderMessages();
        if (inputEl) inputEl.value = "";

        setLoading(true);

        try {
            const historySlice = messages
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
                messages.push({
                    role: "assistant",
                    content: data.error || "An error occurred while communicating with AI.",
                    time: getCurrentTime(),
                    action: null
                });
                saveMessages();
                renderMessages();
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

            messages.push({
                role: "assistant",
                content: replyMessage,
                time: getCurrentTime(),
                actionInfo: actionBadgeText
            });

            saveMessages();
            renderMessages();
            updateInsights();
        } catch (err) {
            messages.push({
                role: "assistant",
                content: "Unable to reach Easy There AI service. Please verify your connection.",
                time: getCurrentTime(),
                action: null
            });
            saveMessages();
            renderMessages();
        } finally {
            setLoading(false);
            if (inputEl) inputEl.focus();
        }
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

    if (clearBtn) {
        clearBtn.addEventListener("click", function() {
            messages = [
                {
                    role: "assistant",
                    content: "Conversation cleared. How can I help you today?",
                    time: getCurrentTime(),
                    action: null
                }
            ];
            saveMessages();
            renderMessages();
        });
    }

    updateInsights();
    renderMessages();
    if (inputEl) inputEl.focus();
})();