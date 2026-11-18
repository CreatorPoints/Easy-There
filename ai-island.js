(function() {
    const form = document.getElementById("ai-island-form");
    const input = document.getElementById("ai-island-input");
    const submitBtn = document.getElementById("ai-island-submit");
    const submitIcon = submitBtn ? submitBtn.querySelector(".ai-submit-icon") : null;
    const spinner = document.getElementById("ai-island-spinner");
    const card = document.getElementById("ai-island-card");
    const responseEl = document.getElementById("ai-island-response");
    const closeBtn = document.getElementById("ai-island-close");

    if (!form || !input || !card || !responseEl) return;

    let conversationHistory = [];

    function getTodayString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

    function getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes("calendar")) return "Calendar";
        if (path.includes("conference")) return "Conference";
        if (path.includes("integration")) return "Integrations";
        return "To-Do";
    }

    function getSelectedDate() {
        if (window.EasyThereCalendar && window.EasyThereCalendar.getSelectedDate) {
            return window.EasyThereCalendar.getSelectedDate();
        }
        return null;
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

    function getTranscripts() {
        try {
            const raw = localStorage.getItem("easy_there_transcripts");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function setLoading(isLoading) {
        input.disabled = isLoading;
        if (submitBtn) submitBtn.disabled = isLoading;
        if (submitIcon) {
            if (isLoading) submitIcon.classList.add("hidden");
            else submitIcon.classList.remove("hidden");
        }
        if (spinner) {
            if (isLoading) spinner.classList.remove("hidden");
            else spinner.classList.add("hidden");
        }
    }

    function showResponse(text, isError) {
        responseEl.textContent = text;
        if (isError) {
            responseEl.classList.add("ai-error-text");
        } else {
            responseEl.classList.remove("ai-error-text");
        }
        card.classList.remove("hidden");
    }

    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const prompt = input.value.trim();
        if (!prompt) return;

        setLoading(true);

        try {
            const payload = {
                prompt: prompt,
                currentDate: getTodayString(),
                currentTime: getCurrentTime(),
                currentDayOfWeek: getCurrentDayOfWeek(),
                timezone: getTimezone(),
                currentPage: getCurrentPage(),
                selectedDate: getSelectedDate(),
                calendarEvents: getCalendarEvents(),
                gcalEvents: getGcalEvents(),
                todos: getTodos(),
                transcripts: getTranscripts(),
                history: conversationHistory.slice(-6)
            };

            const res = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                showResponse(data.error || "An error occurred while contacting AI.", true);
                setLoading(false);
                return;
            }

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
                    } catch (err) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncEventsToCloud) {
                        window.EasyThereFirebase.syncEventsToCloud(events);
                    }
                    if (window.EasyThereCalendar && window.EasyThereCalendar.reload) {
                        window.EasyThereCalendar.reload();
                    }
                } else if (data.action.type === "create_todo" && data.action.text) {
                    const todos = getTodos();
                    todos.push({
                        text: data.action.text,
                        completed: false
                    });
                    try {
                        localStorage.setItem("easy_there_todos", JSON.stringify(todos));
                    } catch (err) {}
                    if (window.EasyThereFirebase && window.EasyThereFirebase.syncTodosToCloud) {
                        window.EasyThereFirebase.syncTodosToCloud(todos);
                    }
                    if (window.EasyThereTodo && window.EasyThereTodo.reload) {
                        window.EasyThereTodo.reload();
                    }
                }
            }

            const responseMessage = data.message || "Done.";
            showResponse(responseMessage, false);

            conversationHistory.push({ role: "user", content: prompt });
            conversationHistory.push({ role: "assistant", content: responseMessage });
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }

            input.value = "";
        } catch (err) {
            showResponse("Unable to connect to AI service.", true);
        } finally {
            setLoading(false);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            card.classList.add("hidden");
        });
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && !card.classList.contains("hidden")) {
            card.classList.add("hidden");
        }
    });
})();
