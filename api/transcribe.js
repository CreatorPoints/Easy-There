module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.HC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI key not configured on server' });
    }

    const { audio, format } = req.body || {};
    if (!audio || typeof audio !== 'string') {
        return res.status(400).json({ error: 'Audio data is required' });
    }

    try {
        const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Transcribe the speech in this audio recording verbatim. Output ONLY the exact spoken English text. If there is no speech, silence, background noise, or unintelligible sound, output empty string. Never output explanations or markdown.'
                            },
                            {
                                type: 'input_audio',
                                input_audio: {
                                    data: audio,
                                    format: format || 'wav'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 150,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Transcription service error' });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        return res.status(200).json({ text: text });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to transcribe audio' });
    }
};