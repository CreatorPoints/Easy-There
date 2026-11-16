module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.HC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'AI key not configured on server' });
    }

    const {
        prompt,
        currentDate,
        currentTime,
        currentDayOfWeek,
        timezone,
        currentPage,
        selectedDate,
        calendarEvents,
        gcalEvents,
        todos,
        history
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const sanitizedPrompt = prompt.trim().slice(0, 500);

    function formatSchedule(todayStr, manual, gcal) {
        const combined = {};

        for (const [date, list] of Object.entries(manual || {})) {
            if (!combined[date]) combined[date] = [];
            if (Array.isArray(list)) {
                list.forEach(item => {
                    const title = typeof item === 'string' ? item : (item.title || item.text || 'Untitled');
                    const time = typeof item === 'string' ? 'All Day' : (item.time || 'All Day');
                    combined[date].push({ title, time, source: 'Manual Event' });
                });
            }
        }

        for (const [date, list] of Object.entries(gcal || {})) {
            if (!combined[date]) combined[date] = [];
            if (Array.isArray(list)) {
                list.forEach(item => {
                    combined[date].push({
                        title: item.title || 'Busy',
                        time: item.time || 'All Day',
                        source: 'Google Calendar'
                    });
                });
            }
        }

        const sortedDates = Object.keys(combined).sort();
        if (sortedDates.length === 0) {
            return 'No events currently scheduled.';
        }

        const lines = [];
        sortedDates.forEach(date => {
            let label = date;
            if (date === todayStr) label = `${date} (TODAY)`;
            lines.push(`Date: ${label}`);
            combined[date].forEach(ev => {
                lines.push(`  - [${ev.time}] ${ev.title} (${ev.source})`);
            });
        });

        return lines.join('\n');
    }

    function formatTodos(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return 'No to-dos currently.';
        }
        return list.map((item, idx) => {
            const text = typeof item === 'string' ? item : (item.text || '');
            const status = typeof item === 'object' && item.completed ? '[Completed]' : '[Pending]';
            return `${idx + 1}. ${status} ${text}`;
        }).join('\n');
    }

    const todayVal = currentDate || new Date().toISOString().slice(0, 10);
    const scheduleText = formatSchedule(todayVal, calendarEvents, gcalEvents);
    const todosText = formatTodos(todos);

    const systemPrompt = `You are Easy There AI, the intelligent personal assistant built directly into the user's planner app.

TEMPORAL CONTEXT:
- Current Date: ${todayVal} (${currentDayOfWeek || ''})
- Current Time: ${currentTime || ''}
- User Timezone: ${timezone || 'UTC'}
- Active Page: ${currentPage || 'Planner'}
${selectedDate ? `- Selected Date in Calendar View: ${selectedDate}` : ''}

USER'S SCHEDULE (ALL CALENDAR & GCAL EVENTS):
${scheduleText}

USER'S TO-DO LIST:
${todosText}

CORE CAPABILITIES & RULES:
1. RESPONSE FORMAT: You MUST ALWAYS reply in valid JSON with this schema:
{
  "message": "Direct, clear and concise response.",
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

2. ANSWERING QUESTIONS (e.g. "When is the next daily meeting?", "What's on my schedule?", "Do I have any tasks?"):
- When the user asks "When is the next [X]?", search the schedule chronologically starting from the current date and current time.
- If an event is scheduled today but its time has already passed relative to Current Time, find the next upcoming occurrence on future dates.
- Answer clearly stating the event title, date, day of week, and time.
- Set "action": null.

3. CONVERSATIONAL CONTEXT & PRONOUNS:
- Pay close attention to recent conversation history. If the user refers to "it", "that meeting", "the second task", "earlier", or asks follow-up questions, resolve references using the conversation history.

4. SCHEDULING EVENTS (e.g. "schedule lunch tomorrow at 1pm", "add sync on Friday 3pm to 4pm"):
- Set "action.type": "create_event".
- Compute exact "date" (YYYY-MM-DD) using the current date and day of week. If user is in Calendar view and refers to "this date" or "here", use Selected Date.
- Set "title", "time" (e.g. "1:00 PM - 2:00 PM"), "startMinutes" (0-1439), and "endMinutes".
- State the confirmed event details in "message".

5. CREATING TO-DOS (e.g. "add to-do buy groceries", "remind me to call the dentist"):
- Set "action.type": "create_todo".
- Set "action.text" to the task description.
- Confirm in "message".

Keep "message" concise, authentic, and without conversational filler. Never output markdown code blocks.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(history)) {
        history.slice(-6).forEach(h => {
            if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
                messages.push({ role: h.role, content: h.content.slice(0, 500) });
            }
        });
    }

    messages.push({ role: 'user', content: sanitizedPrompt });

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
                messages: messages,
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
