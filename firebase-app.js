const firebaseConfig = {
    apiKey: "AIzaSyA7g2ad0MJwZHIxFbCE9bPIaF1OqTLaReE",
    authDomain: "easy-there-7901.firebaseapp.com",
    projectId: "easy-there-7901",
    storageBucket: "easy-there-7901.firebasestorage.app",
    messagingSenderId: "904948755932",
    appId: "1:904948755932:web:790f2cda2e17f357a4b319"
};

const GCAL_CONNECTED_KEY = "easy_there_gcal_connected";
const GCAL_STORAGE_KEY = "easy_there_gcal_events";
const GCAL_TOKEN_KEY = "easy_there_gcal_token";

let auth = null;
let db = null;
let currentUser = null;
const userListeners = [];

function getDb() {
    if (!currentUser || typeof firebase === "undefined") return null;
    if (!db) {
        try {
            db = firebase.firestore();
            db.settings({
                experimentalForceLongPolling: true
            });
        } catch (e) {
            db = null;
        }
    }
    return db;
}

function initFirebase() {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();

    auth.onAuthStateChanged(function(user) {
        currentUser = user;
        if (!user) {
            db = null;
        }
        renderGlobalAuthUI(user);
        userListeners.forEach(function(fn) {
            fn(user);
        });
    }, function() {
        db = null;
        renderGlobalAuthUI(null);
    });
}

function renderGlobalAuthUI(user) {
    const containers = document.querySelectorAll(".auth-topbar-slot");
    containers.forEach(function(container) {
        container.innerHTML = "";
        if (user) {
            const wrap = document.createElement("div");
            wrap.className = "auth-user-badge";

            const name = document.createElement("span");
            name.className = "auth-user-name";
            name.textContent = user.displayName || user.email;

            const logoutBtn = document.createElement("button");
            logoutBtn.type = "button";
            logoutBtn.className = "auth-action-btn";
            logoutBtn.textContent = "Sign Out";
            logoutBtn.addEventListener("click", function() {
                auth.signOut();
            });

            wrap.appendChild(name);
            wrap.appendChild(logoutBtn);
            container.appendChild(wrap);
        } else {
            const loginBtn = document.createElement("button");
            loginBtn.type = "button";
            loginBtn.className = "auth-action-btn primary";
            loginBtn.textContent = "Sign In with Google";
            loginBtn.addEventListener("click", function() {
                loginWithGoogle();
            });
            container.appendChild(loginBtn);
        }
    });
}

function loginWithGoogle() {
    if (!auth) return Promise.reject(new Error("Auth not initialized"));
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider).catch(function(err) {
        if (err.message && err.message.includes("CONFIGURATION_NOT_FOUND")) {
            throw new Error("Authentication is not enabled in Firebase Console yet. Please enable Google Sign-In under Authentication > Sign-in method in the Firebase Console.");
        }
        throw err;
    });
}

function logout() {
    if (!auth) return Promise.resolve();
    return auth.signOut();
}

function onUserChanged(callback) {
    userListeners.push(callback);
    if (currentUser !== null) {
        callback(currentUser);
    }
}

async function syncTodosToCloud(todos) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            todos: todos,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchTodosFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().todos) {
            return doc.data().todos;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

async function syncEventsToCloud(events) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            events: events,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchEventsFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().events) {
            return doc.data().events;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

async function syncProjectsToCloud(projects) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            projects: projects,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchProjectsFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().projects) {
            return doc.data().projects;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

async function syncChatsToCloud(chats) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            chats: chats,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchChatsFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().chats) {
            return doc.data().chats;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

async function syncAiSettingsToCloud(settings) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            aiSettings: settings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchAiSettingsFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().aiSettings) {
            return doc.data().aiSettings;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

async function syncIntegrationsToCloud(integrations) {
    const database = getDb();
    if (!database || !currentUser) return;
    try {
        await database.collection("users").doc(currentUser.uid).set({
            integrations: integrations,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
}

async function fetchIntegrationsFromCloud() {
    const database = getDb();
    if (!database || !currentUser) return null;
    try {
        const doc = await database.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().integrations) {
            return doc.data().integrations;
        }
    } catch (e) {
        if (e && (e.code === "unavailable" || String(e).includes("BLOCKED"))) {
            db = null;
        }
    }
    return null;
}

function parseGoogleEvents(items) {
    const events = {};
    if (!Array.isArray(items)) return events;

    items.forEach(function(item) {
        const start = item.start?.dateTime || item.start?.date;
        if (!start) return;

        const dateKey = start.substring(0, 10);
        if (!events[dateKey]) {
            events[dateKey] = [];
        }

        let timeStr = "All Day";
        let startMinutes = null;
        let endMinutes = null;
        if (item.start?.dateTime && item.end?.dateTime) {
            const startDate = new Date(item.start.dateTime);
            const endDate = new Date(item.end.dateTime);
            timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
        }

        events[dateKey].push({
            title: item.summary || "Busy",
            time: timeStr,
            startMinutes: startMinutes,
            endMinutes: endMinutes,
            busy: item.transparency !== "transparent",
            source: "google"
        });
    });

    return events;
}

async function fetchGoogleCalendarEvents(accessToken) {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error(`Google Calendar API is disabled in project ${firebaseConfig.projectId}. Enable it here: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${firebaseConfig.projectId}`);
        }
        throw new Error(`Google Calendar request failed (${response.status})`);
    }

    const data = await response.json();
    return parseGoogleEvents(data.items);
}

async function connectGoogleCalendar() {
    if (!auth) throw new Error("Auth not initialized");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

    const result = await auth.signInWithPopup(provider);
    const credential = result.credential || firebase.auth.GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
        throw new Error("Unable to obtain Google Calendar access token.");
    }

    localStorage.setItem(GCAL_TOKEN_KEY, accessToken);
    const events = await fetchGoogleCalendarEvents(accessToken);
    localStorage.setItem(GCAL_STORAGE_KEY, JSON.stringify(events));
    localStorage.setItem(GCAL_CONNECTED_KEY, "true");
    return events;
}

async function refreshGoogleCalendar() {
    const token = localStorage.getItem(GCAL_TOKEN_KEY);
    if (!token) {
        return connectGoogleCalendar();
    }
    try {
        const events = await fetchGoogleCalendarEvents(token);
        localStorage.setItem(GCAL_STORAGE_KEY, JSON.stringify(events));
        localStorage.setItem(GCAL_CONNECTED_KEY, "true");
        return events;
    } catch (e) {
        return connectGoogleCalendar();
    }
}

function disconnectGoogleCalendar() {
    localStorage.setItem(GCAL_CONNECTED_KEY, "false");
    localStorage.removeItem(GCAL_STORAGE_KEY);
    localStorage.removeItem(GCAL_TOKEN_KEY);
}

window.EasyThereFirebase = {
    init: initFirebase,
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    onUserChanged: onUserChanged,
    syncTodosToCloud: syncTodosToCloud,
    fetchTodosFromCloud: fetchTodosFromCloud,
    syncEventsToCloud: syncEventsToCloud,
    fetchEventsFromCloud: fetchEventsFromCloud,
    syncProjectsToCloud: syncProjectsToCloud,
    fetchProjectsFromCloud: fetchProjectsFromCloud,
    syncChatsToCloud: syncChatsToCloud,
    fetchChatsFromCloud: fetchChatsFromCloud,
    syncAiSettingsToCloud: syncAiSettingsToCloud,
    fetchAiSettingsFromCloud: fetchAiSettingsFromCloud,
    syncIntegrationsToCloud: syncIntegrationsToCloud,
    fetchIntegrationsFromCloud: fetchIntegrationsFromCloud,
    connectGoogleCalendar: connectGoogleCalendar,
    refreshGoogleCalendar: refreshGoogleCalendar,
    disconnectGoogleCalendar: disconnectGoogleCalendar,
    isGoogleCalendarConnected: function() {
        return localStorage.getItem(GCAL_CONNECTED_KEY) === "true";
    },
    getGoogleCalendarEvents: function() {
        if (localStorage.getItem(GCAL_CONNECTED_KEY) !== "true") {
            return {};
        }
        try {
            const raw = localStorage.getItem(GCAL_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },
    getCurrentUser: function() { return currentUser; }
};

initFirebase();
