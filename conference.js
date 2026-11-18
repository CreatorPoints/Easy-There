(function() {
    const createRoomForm = document.getElementById("create-room-form");
    const createRoomInput = document.getElementById("create-room-input");
    const createErrorEl = document.getElementById("create-error");
    const createdRoomNameEl = document.getElementById("created-room-name");
    const hostCodeDisplay = document.getElementById("host-code-display");
    const createdRoomCodeEl = document.getElementById("created-room-code");
    const copyRoomLinkBtn = document.getElementById("copy-room-link-btn");
    const copyFeedbackEl = document.getElementById("copy-feedback");
    const enterAsHostBtn = document.getElementById("enter-as-host-btn");

    const joinRoomForm = document.getElementById("join-room-form");
    const joinRoomInput = document.getElementById("join-room-input");
    const joinErrorEl = document.getElementById("join-error");
    const joinBtn = joinRoomForm ? joinRoomForm.querySelector("button[type='submit']") : null;

    const lobbyEl = document.getElementById("conference-lobby");
    const callEl = document.getElementById("conference-call");
    const activeRoomTitleEl = document.getElementById("active-room-title");
    const activeRoomCodeBadgeEl = document.getElementById("active-room-code-badge");
    const callCopyLinkBtn = document.getElementById("call-copy-link-btn");

    const localVideo = document.getElementById("local-video");
    const localAvatar = document.getElementById("local-avatar");
    const remoteVideo = document.getElementById("remote-video");
    const remoteAvatar = document.getElementById("remote-avatar");
    const remoteTile = document.getElementById("remote-tile");
    const remoteBadge = document.getElementById("remote-badge");

    const toggleMicBtn = document.getElementById("toggle-mic-btn");
    const toggleVideoBtn = document.getElementById("toggle-video-btn");
    const toggleScreenBtn = document.getElementById("toggle-screen-btn");
    const toggleTranscriptBtn = document.getElementById("toggle-transcript-btn");
    const leaveCallBtn = document.getElementById("leave-call-btn");

    const callTranscriptPanel = document.getElementById("call-transcript-panel");
    const callTranscriptLive = document.getElementById("call-transcript-live");

    const transcriptsListEl = document.getElementById("transcripts-list");
    const transcriptsCountEl = document.getElementById("transcripts-count");
    const transcriptModal = document.getElementById("transcript-modal");
    const transcriptModalTitle = document.getElementById("transcript-modal-title");
    const transcriptModalMeta = document.getElementById("transcript-modal-meta");
    const transcriptModalBody = document.getElementById("transcript-modal-body");
    const transcriptModalClose = document.getElementById("transcript-modal-close");
    const transcriptModalOverlay = document.getElementById("transcript-modal-overlay");
    const copyTranscriptBtn = document.getElementById("copy-transcript-btn");
    const deleteTranscriptBtn = document.getElementById("delete-transcript-btn");

    const aiIslandEl = document.getElementById("ai-island");

    let peer = null;
    let localStream = null;
    let currentCall = null;
    let screenStream = null;
    let dataConn = null;
    let activeRoomCode = null;
    let activeRoomName = "Meeting";
    let isHost = false;
    let isAudioMuted = false;
    let isVideoMuted = false;
    let isScreenSharing = false;
    let guestTimeout = null;

    let isTranscribing = false;
    let recognition = null;
    let currentSessionId = null;
    let currentTranscriptLines = [];
    let selectedTranscript = null;

    function generateCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let res = "ET-";
        for (let i = 0; i < 4; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    }

    function getCleanCode(code) {
        if (!code) return "";
        let clean = code.toUpperCase().trim().replace(/[^A-Z0-9-]/g, "");
        if (/^[A-Z0-9]{4}$/.test(clean)) {
            clean = "ET-" + clean;
        }
        return clean;
    }

    function isValidCode(code) {
        if (!code || typeof code !== "string") return false;
        const clean = getCleanCode(code);
        return clean.length >= 4 && clean.length <= 20;
    }

    function getInviteUrl(code) {
        return window.location.origin + "/conference?room=" + encodeURIComponent(code);
    }

    function copyToClipboard(text, feedbackEl) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                if (feedbackEl) {
                    feedbackEl.classList.remove("hidden");
                    setTimeout(function() {
                        feedbackEl.classList.add("hidden");
                    }, 2500);
                }
            }).catch(function() {});
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getSavedTranscripts() {
        try {
            const raw = localStorage.getItem("easy_there_transcripts");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function renderTranscriptsList() {
        if (!transcriptsListEl) return;
        const list = getSavedTranscripts();
        if (transcriptsCountEl) {
            transcriptsCountEl.textContent = list.length;
        }
        if (list.length === 0) {
            transcriptsListEl.innerHTML = `
                <div class="transcripts-empty">
                    No transcripts recorded yet. Turn on the AI transcript button during any conference to record live speech-to-text.
                </div>
            `;
            return;
        }

        transcriptsListEl.innerHTML = "";
        list.forEach(function(t) {
            const item = document.createElement("div");
            item.className = "transcript-card";

            const lineCount = Array.isArray(t.lines) ? t.lines.length : 0;
            const lineText = lineCount === 1 ? "1 line" : `${lineCount} lines`;
            const codeText = t.roomCode ? ` • ${t.roomCode}` : "";

            item.innerHTML = `
                <div class="transcript-card-info">
                    <span class="transcript-card-title">${escapeHtml(t.name)}</span>
                    <span class="transcript-card-meta">${escapeHtml(t.date)}${codeText} • ${lineText}</span>
                </div>
                <div class="transcript-card-actions">
                    <button type="button" class="icon-button" aria-label="View transcript">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            `;

            item.addEventListener("click", function() {
                openTranscriptModal(t);
            });

            transcriptsListEl.appendChild(item);
        });
    }

    function openTranscriptModal(t) {
        selectedTranscript = t;
        if (!transcriptModal) return;
        if (transcriptModalTitle) transcriptModalTitle.textContent = t.name;
        if (transcriptModalMeta) {
            transcriptModalMeta.textContent = `${t.date} • ${t.roomCode || ""} • ${(t.lines || []).length} lines`;
        }

        if (transcriptModalBody) {
            transcriptModalBody.innerHTML = "";
            if (!t.lines || t.lines.length === 0) {
                transcriptModalBody.innerHTML = `<p class="transcripts-empty">No dialogue lines recorded.</p>`;
            } else {
                t.lines.forEach(function(l) {
                    const row = document.createElement("div");
                    row.className = "transcript-line";
                    row.innerHTML = `
                        <div class="transcript-line-meta">
                            <span class="transcript-speaker">${escapeHtml(l.speaker)}</span>
                            <span class="transcript-time">${escapeHtml(l.time)}</span>
                        </div>
                        <div class="transcript-line-text">${escapeHtml(l.text)}</div>
                    `;
                    transcriptModalBody.appendChild(row);
                });
            }
        }
        transcriptModal.classList.remove("hidden");
    }

    function closeTranscriptModal() {
        selectedTranscript = null;
        if (transcriptModal) transcriptModal.classList.add("hidden");
    }

    function saveCurrentSessionTranscript() {
        if (!currentTranscriptLines || currentTranscriptLines.length === 0) return;
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        const cleanRoomName = (activeRoomName || "Room").trim();
        const transcriptName = `${cleanRoomName}-${dateStr}`;

        const list = getSavedTranscripts();
        let entry = list.find(function(t) {
            return t.id === currentSessionId;
        });

        if (!entry) {
            currentSessionId = `${cleanRoomName}-${dateStr}-${Date.now()}`;
            entry = {
                id: currentSessionId,
                name: transcriptName,
                roomName: cleanRoomName,
                roomCode: activeRoomCode || "",
                date: dateStr,
                createdAt: now.toISOString(),
                lines: []
            };
            list.unshift(entry);
        }

        entry.name = transcriptName;
        entry.roomName = cleanRoomName;
        entry.roomCode = activeRoomCode || entry.roomCode;
        entry.lines = [...currentTranscriptLines];
        entry.fullText = entry.lines.map(function(l) {
            return `[${l.time}] ${l.speaker}: ${l.text}`;
        }).join("\n");

        try {
            localStorage.setItem("easy_there_transcripts", JSON.stringify(list));
        } catch (e) {}

        renderTranscriptsList();
    }

    function recordTranscriptLine(speaker, text) {
        const timeStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
        const line = {
            speaker: speaker,
            time: timeStr,
            text: text
        };
        currentTranscriptLines.push(line);
        if (callTranscriptLive) {
            callTranscriptLive.textContent = `${speaker}: ${text}`;
        }
        if (dataConn && dataConn.open) {
            try {
                dataConn.send({
                    type: "transcript_line",
                    line: line
                });
            } catch (e) {}
        }
        saveCurrentSessionTranscript();
    }

    function startTranscribing() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please use Chrome, Brave, or Edge.");
            return;
        }

        isTranscribing = true;
        if (toggleTranscriptBtn) toggleTranscriptBtn.classList.add("active");
        if (callTranscriptPanel) callTranscriptPanel.classList.remove("hidden");
        if (callTranscriptLive) callTranscriptLive.textContent = "Listening...";

        try {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onresult = function(event) {
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    const text = res[0].transcript.trim();
                    if (res.isFinal) {
                        if (text) {
                            recordTranscriptLine(isHost ? "Host" : "Guest", text);
                        }
                    } else {
                        interim += text + " ";
                    }
                }
                if (interim && callTranscriptLive) {
                    callTranscriptLive.textContent = interim;
                }
            };

            recognition.onerror = function(event) {
                if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                    stopTranscribing();
                }
            };

            recognition.onend = function() {
                if (isTranscribing) {
                    try {
                        recognition.start();
                    } catch (e) {}
                }
            };

            recognition.start();
        } catch (e) {
            isTranscribing = false;
            if (toggleTranscriptBtn) toggleTranscriptBtn.classList.remove("active");
            if (callTranscriptPanel) callTranscriptPanel.classList.add("hidden");
        }
    }

    function stopTranscribing() {
        isTranscribing = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {}
            recognition = null;
        }
        if (toggleTranscriptBtn) toggleTranscriptBtn.classList.remove("active");
        if (callTranscriptPanel) callTranscriptPanel.classList.add("hidden");
        saveCurrentSessionTranscript();
    }

    function setupDataConnection(conn) {
        dataConn = conn;
        conn.on("data", function(data) {
            if (!data || typeof data !== "object") return;
            if (data.type === "room_info") {
                if (data.roomName) {
                    activeRoomName = data.roomName;
                    updateRoomHeaderUI();
                }
            } else if (data.type === "transcript_line" && data.line) {
                currentTranscriptLines.push(data.line);
                if (callTranscriptLive && isTranscribing) {
                    callTranscriptLive.textContent = `${data.line.speaker}: ${data.line.text}`;
                }
                saveCurrentSessionTranscript();
            }
        });
    }

    function updateRoomHeaderUI() {
        if (activeRoomTitleEl) {
            activeRoomTitleEl.textContent = activeRoomName || "Meeting";
        }
        if (activeRoomCodeBadgeEl && activeRoomCode) {
            activeRoomCodeBadgeEl.textContent = `(${activeRoomCode})`;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get("room");
    if (roomFromUrl && joinRoomInput) {
        joinRoomInput.value = getCleanCode(roomFromUrl);
        if (!isValidCode(roomFromUrl) && joinErrorEl) {
            joinErrorEl.textContent = "Invalid room code in link. Please check the code and try again.";
            joinErrorEl.classList.remove("hidden");
        }
    }

    if (joinRoomInput) {
        joinRoomInput.addEventListener("input", function() {
            if (joinErrorEl) {
                joinErrorEl.classList.add("hidden");
            }
        });
    }

    if (createRoomForm) {
        createRoomForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const raw = createRoomInput ? createRoomInput.value.trim() : "";
            if (!raw) {
                if (createErrorEl) {
                    createErrorEl.textContent = "Please enter a room name to create a room.";
                    createErrorEl.classList.remove("hidden");
                }
                return;
            }
            if (createErrorEl) createErrorEl.classList.add("hidden");
            activeRoomName = raw;
            activeRoomCode = generateCode();
            if (createdRoomNameEl) createdRoomNameEl.textContent = activeRoomName;
            if (createdRoomCodeEl) createdRoomCodeEl.textContent = activeRoomCode;
            createRoomForm.classList.add("hidden");
            if (hostCodeDisplay) hostCodeDisplay.classList.remove("hidden");
        });
    }

    if (createRoomInput) {
        createRoomInput.addEventListener("input", function() {
            if (createErrorEl) {
                createErrorEl.classList.add("hidden");
            }
        });
    }

    if (copyRoomLinkBtn) {
        copyRoomLinkBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                copyToClipboard(getInviteUrl(activeRoomCode), copyFeedbackEl);
            }
        });
    }

    if (callCopyLinkBtn) {
        callCopyLinkBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                copyToClipboard(getInviteUrl(activeRoomCode), null);
                callCopyLinkBtn.textContent = "Copied!";
                setTimeout(function() {
                    callCopyLinkBtn.textContent = "Copy Room Link";
                }, 2000);
            }
        });
    }

    if (enterAsHostBtn) {
        enterAsHostBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                joinAsHost(activeRoomCode);
            }
        });
    }

    if (joinRoomForm) {
        joinRoomForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const raw = joinRoomInput.value.trim();
            if (!isValidCode(raw)) {
                if (joinErrorEl) {
                    joinErrorEl.textContent = "Invalid room code. Please enter a valid room code (e.g. ET-8492).";
                    joinErrorEl.classList.remove("hidden");
                }
                return;
            }
            const code = getCleanCode(raw);
            joinAsGuest(code);
        });
    }

    async function initMedia() {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });
        } catch (err) {
            try {
                const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                isVideoMuted = true;
                return audioOnlyStream;
            } catch (audioErr) {
                throw new Error("Unable to access microphone. Please check browser permissions.");
            }
        }
    }

    async function joinAsHost(code) {
        if (joinErrorEl) joinErrorEl.classList.add("hidden");
        activeRoomCode = code;
        isHost = true;

        try {
            localStream = await initMedia();
        } catch (err) {
            if (joinErrorEl) {
                joinErrorEl.textContent = err.message || "Could not access media devices.";
                joinErrorEl.classList.remove("hidden");
            }
            return;
        }

        localVideo.srcObject = localStream;
        if (localStream.getVideoTracks().length === 0) {
            localAvatar.classList.remove("hidden");
        } else {
            localAvatar.classList.add("hidden");
        }

        lobbyEl.classList.add("hidden");
        callEl.classList.remove("hidden");
        updateRoomHeaderUI();

        if (aiIslandEl) {
            aiIslandEl.classList.add("hidden");
        }

        const hostId = `easythere-huddle-${code.toLowerCase()}-host`;

        peer = new Peer(hostId);
        peer.on("open", function() {});
        peer.on("connection", function(conn) {
            setupDataConnection(conn);
            conn.on("open", function() {
                conn.send({
                    type: "room_info",
                    roomName: activeRoomName,
                    roomCode: activeRoomCode
                });
            });
        });
        peer.on("call", function(incomingCall) {
            incomingCall.answer(localStream);
            setupHostCall(incomingCall);
        });
        peer.on("error", function(err) {
            if (err && err.type === "unavailable-id") {
                endCall();
                if (joinErrorEl) {
                    joinErrorEl.textContent = "Room is already active. Please enter as guest.";
                    joinErrorEl.classList.remove("hidden");
                }
            }
        });

        updateControlsUI();
    }

    function setupHostCall(call) {
        currentCall = call;

        call.on("stream", function(remoteStream) {
            remoteVideo.srcObject = remoteStream;
            remoteTile.classList.remove("waiting");
            remoteAvatar.classList.add("hidden");
            remoteBadge.textContent = "Guest";
        });

        call.on("close", function() {
            resetRemote();
        });

        call.on("error", function() {
            resetRemote();
        });
    }

    function joinAsGuest(code) {
        if (joinErrorEl) joinErrorEl.classList.add("hidden");
        if (joinBtn) {
            joinBtn.disabled = true;
            joinBtn.textContent = "Verifying room...";
        }

        activeRoomCode = code;
        isHost = false;

        const hostId = `easythere-huddle-${code.toLowerCase()}-host`;
        const guestId = `easythere-huddle-${code.toLowerCase()}-guest-${Math.random().toString(36).substring(2, 7)}`;

        if (guestTimeout) clearTimeout(guestTimeout);

        peer = new Peer(guestId);

        function abortGuest(errorMsg) {
            if (guestTimeout) {
                clearTimeout(guestTimeout);
                guestTimeout = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(function(t) {
                    t.stop();
                });
                localStream = null;
            }
            if (currentCall) {
                currentCall.close();
                currentCall = null;
            }
            if (dataConn) {
                try {
                    dataConn.close();
                } catch (e) {}
                dataConn = null;
            }
            if (peer) {
                peer.destroy();
                peer = null;
            }
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.textContent = "Join Room";
            }
            if (joinErrorEl) {
                joinErrorEl.textContent = errorMsg;
                joinErrorEl.classList.remove("hidden");
            }
            if (aiIslandEl) {
                aiIslandEl.classList.remove("hidden");
            }
        }

        peer.on("open", function() {
            const conn = peer.connect(hostId, { reliable: true });
            setupDataConnection(conn);

            conn.on("open", async function() {
                if (guestTimeout) {
                    clearTimeout(guestTimeout);
                    guestTimeout = null;
                }

                try {
                    localStream = await initMedia();
                } catch (err) {
                    abortGuest(err.message || "Could not access media devices.");
                    return;
                }

                const outgoingCall = peer.call(hostId, localStream);
                if (!outgoingCall) {
                    abortGuest("Invalid room code. Room does not exist or host is not active.");
                    return;
                }

                currentCall = outgoingCall;

                outgoingCall.on("stream", function(remoteStream) {
                    if (joinBtn) {
                        joinBtn.disabled = false;
                        joinBtn.textContent = "Join Room";
                    }

                    localVideo.srcObject = localStream;
                    if (localStream.getVideoTracks().length === 0) {
                        localAvatar.classList.remove("hidden");
                    } else {
                        localAvatar.classList.add("hidden");
                    }

                    remoteVideo.srcObject = remoteStream;
                    remoteTile.classList.remove("waiting");
                    remoteAvatar.classList.add("hidden");
                    remoteBadge.textContent = "Host";

                    lobbyEl.classList.add("hidden");
                    callEl.classList.remove("hidden");
                    updateRoomHeaderUI();

                    if (aiIslandEl) {
                        aiIslandEl.classList.add("hidden");
                    }

                    updateControlsUI();
                });

                outgoingCall.on("close", function() {
                    resetRemote();
                });

                outgoingCall.on("error", function() {
                    abortGuest("Connection error occurred.");
                });
            });

            conn.on("error", function() {
                abortGuest("Invalid room code. Room does not exist or host is not active.");
            });

            guestTimeout = setTimeout(function() {
                abortGuest("Invalid room code. Room does not exist or host is not active.");
            }, 6000);
        });

        peer.on("error", function() {
            abortGuest("Invalid room code. Room does not exist or host is not active.");
        });
    }

    function resetRemote() {
        remoteVideo.srcObject = null;
        remoteTile.classList.add("waiting");
        remoteAvatar.classList.remove("hidden");
        remoteBadge.textContent = "Waiting for peer...";
    }

    function updateControlsUI() {
        if (toggleMicBtn) {
            if (isAudioMuted) {
                toggleMicBtn.classList.add("muted");
            } else {
                toggleMicBtn.classList.remove("muted");
            }
        }
        if (toggleVideoBtn) {
            if (isVideoMuted) {
                toggleVideoBtn.classList.add("muted");
                localAvatar.classList.remove("hidden");
            } else {
                toggleVideoBtn.classList.remove("muted");
                localAvatar.classList.add("hidden");
            }
        }
        if (toggleScreenBtn) {
            if (isScreenSharing) {
                toggleScreenBtn.classList.add("active");
            } else {
                toggleScreenBtn.classList.remove("active");
            }
        }
        if (toggleTranscriptBtn) {
            if (isTranscribing) {
                toggleTranscriptBtn.classList.add("active");
            } else {
                toggleTranscriptBtn.classList.remove("active");
            }
        }
    }

    if (toggleMicBtn) {
        toggleMicBtn.addEventListener("click", function() {
            if (!localStream) return;
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                isAudioMuted = !audioTrack.enabled;
                updateControlsUI();
            }
        });
    }

    if (toggleVideoBtn) {
        toggleVideoBtn.addEventListener("click", function() {
            if (!localStream) return;
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                isVideoMuted = !videoTrack.enabled;
                updateControlsUI();
            }
        });
    }

    if (toggleScreenBtn) {
        toggleScreenBtn.addEventListener("click", async function() {
            if (isScreenSharing) {
                stopScreenShare();
                return;
            }

            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: "always" },
                    audio: false
                });

                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrack.onended = function() {
                    stopScreenShare();
                };

                replaceVideoTrack(screenTrack);
                isScreenSharing = true;
                updateControlsUI();
            } catch (err) {}
        });
    }

    if (toggleTranscriptBtn) {
        toggleTranscriptBtn.addEventListener("click", function() {
            if (isTranscribing) {
                stopTranscribing();
            } else {
                startTranscribing();
            }
            updateControlsUI();
        });
    }

    function stopScreenShare() {
        if (!isScreenSharing) return;
        if (screenStream) {
            screenStream.getTracks().forEach(function(t) {
                t.stop();
            });
            screenStream = null;
        }

        const originalTrack = localStream ? localStream.getVideoTracks()[0] : null;
        if (originalTrack) {
            replaceVideoTrack(originalTrack);
        }

        isScreenSharing = false;
        updateControlsUI();
    }

    function replaceVideoTrack(newTrack) {
        if (localVideo && localStream) {
            localVideo.srcObject = new MediaStream([newTrack, ...localStream.getAudioTracks()]);
        }
        if (currentCall && currentCall.peerConnection) {
            const senders = currentCall.peerConnection.getSenders();
            const videoSender = senders.find(function(s) {
                return s.track && s.track.kind === "video";
            });
            if (videoSender) {
                videoSender.replaceTrack(newTrack);
            }
        }
    }

    if (leaveCallBtn) {
        leaveCallBtn.addEventListener("click", function() {
            endCall();
        });
    }

    function endCall() {
        if (guestTimeout) {
            clearTimeout(guestTimeout);
            guestTimeout = null;
        }

        stopTranscribing();

        if (dataConn) {
            try {
                dataConn.close();
            } catch (e) {}
            dataConn = null;
        }

        stopScreenShare();

        if (localStream) {
            localStream.getTracks().forEach(function(track) {
                track.stop();
            });
            localStream = null;
        }

        if (currentCall) {
            currentCall.close();
            currentCall = null;
        }

        if (peer) {
            peer.destroy();
            peer = null;
        }

        resetRemote();
        localVideo.srcObject = null;

        callEl.classList.add("hidden");
        lobbyEl.classList.remove("hidden");

        if (createRoomForm) {
            createRoomForm.classList.remove("hidden");
            if (createRoomInput) createRoomInput.value = "";
        }
        if (createErrorEl) createErrorEl.classList.add("hidden");
        if (hostCodeDisplay) hostCodeDisplay.classList.add("hidden");

        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = "Join Room";
        }

        isAudioMuted = false;
        isVideoMuted = false;
        isScreenSharing = false;
        activeRoomCode = null;
        activeRoomName = "Meeting";
        isHost = false;
        currentSessionId = null;
        currentTranscriptLines = [];

        if (aiIslandEl) {
            aiIslandEl.classList.remove("hidden");
        }

        renderTranscriptsList();

        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    if (copyTranscriptBtn) {
        copyTranscriptBtn.addEventListener("click", function() {
            if (!selectedTranscript) return;
            copyToClipboard(selectedTranscript.fullText || "", null);
            copyTranscriptBtn.textContent = "Copied!";
            setTimeout(function() {
                copyTranscriptBtn.textContent = "Copy Transcript";
            }, 2000);
        });
    }

    if (deleteTranscriptBtn) {
        deleteTranscriptBtn.addEventListener("click", function() {
            if (!selectedTranscript) return;
            const targetId = selectedTranscript.id;
            const list = getSavedTranscripts().filter(function(t) {
                return t.id !== targetId;
            });
            try {
                localStorage.setItem("easy_there_transcripts", JSON.stringify(list));
            } catch (e) {}
            closeTranscriptModal();
            renderTranscriptsList();
        });
    }

    if (transcriptModalClose) {
        transcriptModalClose.addEventListener("click", closeTranscriptModal);
    }

    if (transcriptModalOverlay) {
        transcriptModalOverlay.addEventListener("click", closeTranscriptModal);
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && transcriptModal && !transcriptModal.classList.contains("hidden")) {
            closeTranscriptModal();
        }
    });

    renderTranscriptsList();
})();