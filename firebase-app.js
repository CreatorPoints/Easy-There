const firebaseConfig = {
    apiKey: "AIzaSyA7g2ad0MJwZHIxFbCE9bPIaF1OqTLaReE",
    authDomain: "easy-there-7901.firebaseapp.com",
    projectId: "easy-there-7901",
    storageBucket: "easy-there-7901.firebasestorage.app",
    messagingSenderId: "904948755932",
    appId: "1:904948755932:web:790f2cda2e17f357a4b319"
};

let auth = null;
let db = null;
let currentUser = null;
const userListeners = [];

function initFirebase() {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    try {
        db = firebase.firestore();
    } catch (e) {
        db = null;
    }

    auth.onAuthStateChanged(function(user) {
        currentUser = user;
        renderGlobalAuthUI(user);
        userListeners.forEach(function(fn) {
            fn(user);
        });
    }, function() {
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
    if (!db || !currentUser) return;
    try {
        await db.collection("users").doc(currentUser.uid).set({
            todos: todos,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {}
}

async function fetchTodosFromCloud() {
    if (!db || !currentUser) return null;
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().todos) {
            return doc.data().todos;
        }
    } catch (e) {}
    return null;
}

async function syncEventsToCloud(events) {
    if (!db || !currentUser) return;
    try {
        await db.collection("users").doc(currentUser.uid).set({
            events: events,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) {}
}

async function fetchEventsFromCloud() {
    if (!db || !currentUser) return null;
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().events) {
            return doc.data().events;
        }
    } catch (e) {}
    return null;
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
    getCurrentUser: function() { return currentUser; }
};

initFirebase();
