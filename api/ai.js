module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.HC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI key not configured on server' });
    }

    const { prompt, today, calendarEvents, gcalEvents, todos } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const sanitizedPrompt = prompt.trim().slice(0, 500);

    const systemPrompt = `You are Easy There AI, an assistant embedded in the user's personal planner and calendar app.
Current date: ${today || new Date().toISOString().slice(0, 10)}.

User's Calendar Events:
${JSON.stringify(calendarEvents || {}, null, 2)}

User's Google Calendar Events:
${JSON.stringify(gcalEvents || {}, null, 2)}

User's To-Do List:
${JSON.stringify(todos || [], null, 2)}

Instructions:
1. Always respond in valid JSON matching this schema:
{
  "message": "A clear, concise, direct response answering the user or confirming the action.",
  "action": null | {
    "type": "create_event",
    "title": "string",
    "date": "YYYY-MM-DD",
    "time": "HH:MM AM/PM - HH:MM AM/PM",
    "startMinutes": number,
    "endMinutes": number
  } | {
    "type": "create_todo",
    "text": "string"
  }
}

2. Answering questions (e.g. "When is the next daily meeting?", "What do I have today?", "Show my tasks"):
- Look through calendar events and Google Calendar events starting from the current date onwards.
- Find matching event(s) and provide a concise answer stating the event title, date, and time.
- Set "action": null.

3. Scheduling/creating an event (e.g. "schedule meeting tomorrow at 3pm", "add lunch with team on Friday 12pm to 1pm"):
- Set "action.type": "create_event".
- Compute the target "date" (YYYY-MM-DD) relative to current date.
- Set "title", "time" (e.g. "3:00 PM - 4:00 PM"), "startMinutes" (0-1439), and "endMinutes" (startMinutes + duration, default 60 min).
- State what you scheduled in "message".

4. Creating a to-do/task (e.g. "add task buy groceries", "remind me to pay bills"):
- Set "action.type": "create_todo".
- Set "action.text": the task description.
- State what you added in "message".

Keep "message" concise, authentic, and without conversational fluff. Never wrap output in markdown code blocks.`;

    try {
        const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: sanitizedPrompt }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'AI service returned an error' });
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) {
            return res.status(502).json({ error: 'Empty response from AI' });
        }

        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        } catch (e) {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = { message: rawContent, action: null };
            }
        }

        return res.status(200).json(parsed);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to process AI request' });
    }
};
