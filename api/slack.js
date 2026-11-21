module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, token, channelId, text } = req.body || {};

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Slack Bot Token (xoxb-...) is required' });
    }

    const cleanToken = token.trim();

    if (action === 'fetch_channel') {
        if (!channelId || typeof channelId !== 'string') {
            return res.status(400).json({ error: 'Channel ID is required (e.g. C0123456789)' });
        }

        const cleanChannel = channelId.trim();

        try {
            const infoRes = await fetch(`https://slack.com/api/conversations.info?channel=${encodeURIComponent(cleanChannel)}`, {
                headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const infoData = await infoRes.json();

            if (!infoData.ok) {
                return res.status(400).json({
                    error: infoData.error || 'Failed to fetch channel details from Slack'
                });
            }

            const ch = infoData.channel || {};
            let messagesList = [];
            let pinnedList = [];

            try {
                const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${encodeURIComponent(cleanChannel)}&limit=25`, {
                    headers: {
                        'Authorization': `Bearer ${cleanToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const historyData = await historyRes.json();
                if (historyData.ok && Array.isArray(historyData.messages)) {
                    messagesList = historyData.messages.map(m => ({
                        user: m.user || 'User',
                        text: (m.text || '').slice(0, 600),
                        time: m.ts
                    }));
                }
            } catch (histErr) {}

            try {
                const pinsRes = await fetch(`https://slack.com/api/pins.list?channel=${encodeURIComponent(cleanChannel)}`, {
                    headers: {
                        'Authorization': `Bearer ${cleanToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const pinsData = await pinsRes.json();
                if (pinsData.ok && Array.isArray(pinsData.items)) {
                    pinnedList = pinsData.items
                        .filter(item => item.type === 'message' && item.message && item.message.text)
                        .map(item => item.message.text.slice(0, 800));
                }
            } catch (pinsErr) {}

            return res.status(200).json({
                ok: true,
                channel: {
                    id: ch.id,
                    name: ch.name || cleanChannel,
                    topic: ch.topic?.value || '',
                    purpose: ch.purpose?.value || '',
                    is_private: Boolean(ch.is_private),
                    num_members: ch.num_members || 0
                },
                pinnedMessages: pinnedList,
                recentMessages: messagesList
            });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to communicate with Slack API' });
        }
    }

    if (action === 'send_message') {
        if (!channelId || !text) {
            return res.status(400).json({ error: 'channelId and text are required to send message' });
        }

        try {
            const postRes = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    channel: channelId.trim(),
                    text: text
                })
            });

            const postData = await postRes.json();
            if (!postData.ok) {
                return res.status(400).json({ error: postData.error || 'Failed to post message to Slack' });
            }

            return res.status(200).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to send message via Slack API' });
        }
    }

    return res.status(400).json({ error: 'Invalid action' });
};
