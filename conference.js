(function() {
    const startRoomBtn = document.getElementById("start-room-btn");
    const startActionBox = document.getElementById("start-action-box");
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
    const activeRoomCodeEl = document.getElementById("active-room-code");
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
    const leaveCallBtn = document.getElementById("leave-call-btn");

    let peer = null;
    let localStream = null;
    let currentCall = null;
    let screenStream = null;
    let activeRoomCode = null;
    let isHost = false;
    let isAudioMuted = false;
    let isVideoMuted = false;
    let isScreenSharing = false;
    let guestTimeout = null;

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

    if (startRoomBtn) {
        startRoomBtn.addEventListener("click", function() {
            if (joinErrorEl) joinErrorEl.classList.add("hidden");
            activeRoomCode = generateCode();
            createdRoomCodeEl.textContent = activeRoomCode;
            startActionBox.classList.add("hidden");
            hostCodeDisplay.classList.remove("hidden");
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
        activeRoomCodeEl.textContent = code;

        const hostId = `easythere-huddle-${code.toLowerCase()}-host`;

        peer = new Peer(hostId);
        peer.on("open", function() {});
        peer.on("connection", function(conn) {
            conn.on("open", function() {
                conn.send({ status: "ready" });
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
        }

        peer.on("open", function() {
            const conn = peer.connect(hostId, { reliable: true });

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
                    activeRoomCodeEl.textContent = code;

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
        startActionBox.classList.remove("hidden");
        hostCodeDisplay.classList.add("hidden");

        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = "Join Room";
        }

        isAudioMuted = false;
        isVideoMuted = false;
        isScreenSharing = false;
        activeRoomCode = null;
        isHost = false;

        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
})();
