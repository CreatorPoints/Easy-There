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
        projects,
        transcripts,
        history,
        personality,
        customPersonality,
        memories,
        file,
        webSearch,
        githubData,
        slackConnected
    } = req.body || {};

    if ((!prompt || typeof prompt !== 'string' || !prompt.trim()) && (!file || typeof file !== 'object')) {
        return res.status(400).json({ error: 'Prompt or file is required' });
    }

    const sanitizedPrompt = (prompt && typeof prompt === 'string')
        ? prompt.trim().slice(0, 1000)
        : (file && file.name ? `Analyze the attached file ${file.name}` : '');

    async function performWebSearch(query) {
        if (!query || typeof query !== 'string' || !query.trim()) return [];
        const cleanQ = query.trim().slice(0, 100);
        const results = [];

        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQ)}&format=json&no_html=1&skip_disambig=1`;
            const ddgRes = await fetch(ddgUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EasyThere/1.0' },
                signal: AbortSignal.timeout(3500)
            });
            if (ddgRes.ok) {
                const data = await ddgRes.json();
                if (data.AbstractText) {
                    results.push({
                        title: data.Heading || cleanQ,
                        snippet: data.AbstractText,
                        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(cleanQ)}`
                    });
                }
                if (Array.isArray(data.RelatedTopics)) {
                    data.RelatedTopics.slice(0, 3).forEach(t => {
                        if (t.Text && t.FirstURL) {
                            results.push({
                                title: t.Text.slice(0, 50),
                                snippet: t.Text,
                                url: t.FirstURL
                            });
                        }
                    });
                }
            }
        } catch (e) {}

        try {
            const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&format=json&utf8=1&srlimit=3`;
            const wikiRes = await fetch(wikiUrl, {
                headers: { 'User-Agent': 'EasyThereAI/1.0' },
                signal: AbortSignal.timeout(3500)
            });
            if (wikiRes.ok) {
                const data = await wikiRes.json();
                if (Array.isArray(data.query?.search)) {
                    data.query.search.forEach(item => {
                        results.push({
                            title: item.title,
                            snippet: item.snippet.replace(/<[^>]+>/g, ''),
                            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                        });
                    });
                }
            }
        } catch (e) {}

        return results;
    }

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

    function formatTranscripts(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return 'No conference or meeting transcripts saved.';
        }
        const entries = [];
        list.slice(0, 10).forEach((t, i) => {
            const name = t.name || `${t.roomName || 'Meeting'}-${t.date || 'Unknown'}`;
            const date = t.date || 'Unknown Date';
            let linesText = '';
            if (Array.isArray(t.lines)) {
                linesText = t.lines.slice(0, 30).map(l => `  [${l.time || ''}] ${l.speaker || 'Speaker'}: ${l.text || ''}`).join('\n');
                if (t.lines.length > 30) {
                    linesText += `\n  ... (${t.lines.length - 30} more lines)`;
                }
            } else if (t.fullText) {
                linesText = t.fullText.slice(0, 1500);
            } else {
                linesText = 'No dialogue recorded.';
            }
            entries.push(`Transcript #${i + 1}: ${name} (${date})\n${linesText}`);
        });
        return entries.join('\n\n');
    }

    function formatProjects(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return 'No projects currently.';
        }
        return list.map((p, idx) => {
            const title = p.title || p.name || 'Untitled Project';
            const desc = p.description ? ` - ${p.description}` : '';
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];
            const completed = tasks.filter(t => t.completed).length;
            const total = tasks.length;
            const progress = total > 0 ? ` (${completed}/${total} tasks completed)` : '';
            const due = p.dueDate ? ` [Due: ${p.dueDate}]` : '';
            let taskLines = '';
            if (tasks.length > 0) {
                taskLines = '\n' + tasks.map(t => `    - [${t.completed ? 'Completed' : 'Pending'}] ${t.text}`).join('\n');
            }
            return `${idx + 1}. ${title}${desc}${due}${progress}${taskLines}`;
        }).join('\n');
    }

    function formatMemories(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return 'No memories recorded yet.';
        }
        return list.slice(0, 50).map((m, idx) => `${idx + 1}. ${String(m).slice(0, 300)}`).join('\n');
    }

    let personalityInstruction = 'Be helpful, structured, and clear while remaining authentic.';
    if (personality === 'concise') {
        personalityInstruction = 'Be extremely concise, direct, and terse. Answer immediately with minimal words, zero conversational filler, and no unnecessary pleasantries.';
    } else if (personality === 'technical') {
        personalityInstruction = 'Be technically precise, analytical, and structured. Emphasize engineering accuracy, exact technical details, and code or data correctness.';
    } else if (personality === 'casual') {
        personalityInstruction = 'Be friendly, casual, and relaxed, like an approachable and supportive peer or teammate.';
    } else if (personality === 'custom' && customPersonality) {
        personalityInstruction = `Follow the user's custom personality instructions strictly: ${String(customPersonality).slice(0, 500)}`;
    }
    if (personality !== 'custom' && customPersonality && typeof customPersonality === 'string' && customPersonality.trim()) {
        personalityInstruction += `\nAdditional user personality guidance: ${customPersonality.trim().slice(0, 300)}`;
    }

    function formatGitHub(gh) {
        if (!gh || !gh.username) return 'No GitHub account connected.';
        const repos = Array.isArray(gh.repos) ? gh.repos : [];
        if (repos.length === 0) return `Connected GitHub User: @${gh.username} (no public repositories).`;
        const repoLines = repos.map(r => `  - ${r.name} (${r.language || 'Code'}, ${r.stars || 0}★): ${r.description || 'No description'}`).join('\n');
        return `Connected GitHub User: @${gh.username}\nRecent Repositories:\n${repoLines}`;
    }

    const shouldSearchWeb = Boolean(webSearch) ||
        /(\bsearch\b|\blook up\b|\blatest\b|\bwho is\b|\bwhat is\b|\bnews\b|\bweather\b|\bcurrent\b|\bwiki\b)/i.test(sanitizedPrompt);

    let webSearchResults = [];
    if (shouldSearchWeb) {
        webSearchResults = await performWebSearch(sanitizedPrompt);
    }

    function formatWebResults(results) {
        if (!Array.isArray(results) || results.length === 0) return 'No live web search results.';
        return results.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n');
    }

    const todayVal = currentDate || new Date().toISOString().slice(0, 10);
    const scheduleText = formatSchedule(todayVal, calendarEvents, gcalEvents);
    const todosText = formatTodos(todos);
    const projectsText = formatProjects(projects);
    const transcriptsText = formatTranscripts(transcripts);
    const memoriesText = formatMemories(memories);
    const githubText = formatGitHub(githubData);
    const webSearchText = formatWebResults(webSearchResults);

    const systemPrompt = `You are Easy There AI, the intelligent personal assistant built directly into the user's planner app.

PERSONALITY & TONE:
${personalityInstruction}

TEMPORAL CONTEXT:
- Current Date: ${todayVal} (${currentDayOfWeek || ''})
- Current Time: ${currentTime || ''}
- User Timezone: ${timezone || 'UTC'}
- Active Page: ${currentPage || 'Planner'}
${selectedDate ? `- Selected Date in Calendar View: ${selectedDate}` : ''}

HACK CLUB & YSWS DOMAIN KNOWLEDGE:
- Hack Club is a global 501(c)(3) nonprofit network of high school computer programming clubs, makers, and hackathons founded by Zach Latta.
- "YSWS" stands for "You Ship, We Ship": Hack Club's flagship initiative for teenage makers where students build real software or hardware projects and ship them publicly, and Hack Club rewards them with free hardware, developer grants, or custom prizes.
- Famous Hack Club & YSWS programs include:
  * Blot: Build an art generator project, get a custom pen-plotter drawing robot shipped to you.
  * Sprig: Build a tile-based JS game on the web editor, get a custom physical handheld console shipped to you.
  * OnBoard: Design a custom printed circuit board (PCB), get $100 to manufacture it.
  * Boreal: Hackathon in the Canadian wilderness on a train.
  * Nest: Free Linux server / shell accounts for teenagers.
  * Arcade & High Seas: Ship coding projects to earn hours and redeem prizes (MacBooks, 3D printers, frameworks).
  * Juice, Outernet, Hack Club Bank (fiscal sponsorship for youth organizations).
- When asked about YSWS, Hack Club, or high school coding projects, answer with enthusiasm, deep familiarity, and clear information.

USER'S SAVED MEMORIES & PREFERENCES (LONG-TERM MEMORY):
${memoriesText}

USER'S SCHEDULE (ALL CALENDAR & GCAL EVENTS):
${scheduleText}

USER'S TO-DO LIST:
${todosText}

USER'S PROJECTS:
${projectsText}

USER'S GITHUB INTEGRATION:
${githubText}
${slackConnected ? '- Slack Incoming Webhook: Connected and ready to post messages' : '- Slack: Disconnected'}

SAVED MEETING & CONFERENCE TRANSCRIPTS:
${transcriptsText}

LIVE WEB SEARCH RESULTS:
${webSearchText}

CORE CAPABILITIES & RULES:
1. RESPONSE FORMAT: You MUST ALWAYS reply in valid JSON with this schema:
{
  "message": "Direct, clear and well-structured response using Markdown, LaTeX, or Mermaid as needed.",
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
  } | {
    "type": "create_project",
    "title": "string",
    "description": "string"
  } | {
    "type": "slack_message",
    "text": "string"
  },
  "chatTitle": "Concise 2 to 5 words topic title for this conversation",
  "newMemory": null | "string",
  "forgetMemory": null | "string",
  "webSearchUsed": boolean
}

2. ANSWERING QUESTIONS (e.g. "When is the next daily meeting?", "What's on my schedule?", "Do I have any tasks?", "What projects am I working on?", "What do you remember about me?", "What are my GitHub repos?"):
- When the user asks "When is the next [X]?", search the schedule chronologically starting from the current date and current time.
- If an event is scheduled today but its time has already passed relative to Current Time, find the next upcoming occurrence on future dates.
- Answer clearly stating the event title, date, day of week, and time.
- Answer questions about projects, their tasks, and progress directly.
- When asked what you remember about the user, summarize the saved memories accurately.
- Answer questions about the user's GitHub repositories and recent activity directly.
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

6. CREATING PROJECTS (e.g. "create project Mobile App Redesign", "start new project Portfolio"):
- Set "action.type": "create_project".
- Set "action.title" to the project title and "action.description" to any description provided.
- Confirm in "message".

7. POSTING TO SLACK:
- When user asks to send a note, task list, summary, or update to Slack (e.g. "send this summary to Slack", "post our tasks to Slack"):
- If Slack is connected, set "action.type": "slack_message" and "action.text" to the formatted message.
- If Slack is disconnected, remind user to connect Slack in the Integrations tab.

8. MEETING TRANSCRIPTS & RECAPS:
- You have access to all saved conference transcripts under 'SAVED MEETING & CONFERENCE TRANSCRIPTS', formatted as <roomname>-<date>.
- When the user asks about a meeting, call, recap, discussion, or transcript (e.g. "What did we talk about in the sprint planning meeting?", "Summarize today's call", "What did guest say?"):
- Answer accurately and concisely based on the transcript's dialogue lines.
- Reference the transcript title (<roomname>-<date>) and date.
- Set "action": null.

9. CHAT TITLE GENERATION:
- In "chatTitle", generate a smart, concise 2 to 5 word topic title that accurately summarizes the topic or intent of the conversation (e.g. "Daily Schedule Check", "Science Fair Tasks", "Lunch Meeting Sync", "Meeting Recap", "Project Setup").
- Do NOT set "chatTitle" as the user's raw message or conversational filler.
- Do NOT include quotation marks, brackets, or trailing punctuation in "chatTitle".

10. LONG-TERM MEMORY (AUTOMATIC & EXPLICIT):
- You have access to user memories under 'USER'S SAVED MEMORIES & PREFERENCES'.
- Respect and apply them across conversations.
- AUTOMATIC: When the user shares an important personal fact, project detail, preferred tech stack, habit, or workflow that would be valuable to remember:
  Set "newMemory" to a concise summary of the fact (e.g. "User is building Easy There and participates in Hack Club").
- EXPLICIT: When the user explicitly instructs you to remember, save, or store something (e.g. "remember that I prefer dark mode", "save to memory: my birthday is June 4", "store this: ..."):
  ALWAYS extract the memory and set "newMemory" to the exact fact.
- FORGET: If the user asks to forget something, set "forgetMemory" to the memory keyword or phrase to remove.

11. ATTACHED FILES:
- If a file is attached, inspect its contents or metadata and answer questions, provide analysis, code reviews, summaries, or insights as requested.

12. FORMATTING, LATEX MATH & FLOWCHARTS:
- Inside "message", use rich GitHub-Flavored Markdown: bold, italics, tables, bullet lists, ordered lists, and blockquotes.
- For math formulas, use standard LaTeX: inline math with $formula$ (e.g. $E = mc^2$) and block math with $$formula$$ (e.g. $$\\int_0^1 x dx$$).
- For flowcharts, sequence diagrams, and architecture maps, output standard Mermaid syntax inside \`\`\`mermaid code blocks.
- When generating code, always specify the language name in the code fence (e.g. \`\`\`python, \`\`\`javascript, \`\`\`html, \`\`\`css, \`\`\`bash, \`\`\`json).
- If live web search results were used, set "webSearchUsed": true and cite sources with Markdown links [Source Title](url).

Output valid JSON only. Never wrap the overall JSON response in outer markdown code blocks.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(history)) {
        history.slice(-6).forEach(h => {
            if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
                messages.push({ role: h.role, content: h.content.slice(0, 500) });
            }
        });
    }

    if (file && typeof file === 'object') {
        if (file.isImage && typeof file.content === 'string' && file.content.startsWith('data:image/')) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: sanitizedPrompt || 'Analyze this image.' },
                    { type: 'image_url', image_url: { url: file.content } }
                ]
            });
        } else if (typeof file.content === 'string' && file.content.trim()) {
            const safeContent = file.content.slice(0, 25000);
            const filePrompt = `${sanitizedPrompt}\n\n[ATTACHED FILE: ${file.name || 'file'} (${file.type || 'text'}, ${file.size || safeContent.length} bytes)]\n\`\`\`\n${safeContent}\n\`\`\``;
            messages.push({ role: 'user', content: filePrompt });
        } else {
            const filePrompt = `${sanitizedPrompt}\n\n[ATTACHED FILE METADATA: ${file.name || 'file'} (${file.type || 'binary'}, ${file.size || 0} bytes)]`;
            messages.push({ role: 'user', content: filePrompt });
        }
    } else {
        messages.push({ role: 'user', content: sanitizedPrompt });
    }

    try {
        const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: messages,
                max_tokens: 1500,
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