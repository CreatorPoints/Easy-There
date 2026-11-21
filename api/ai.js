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
        slackConnected,
        slackData
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

    const isMeetingQuery = /(\btranscript\b|\bmeeting\b|\bcall\b|\brecap\b|\bconference\b|\bdiscussed\b|\btalked about\b)/i.test(sanitizedPrompt);

    function formatSchedule(todayStr, manual, gcal) {
        const combined = {};
        const todayDate = new Date(todayStr || Date.now());
        const pastCutoff = new Date(todayDate);
        pastCutoff.setDate(pastCutoff.getDate() - 2);
        const futureCutoff = new Date(todayDate);
        futureCutoff.setDate(futureCutoff.getDate() + 30);

        const pastIso = pastCutoff.toISOString().slice(0, 10);
        const futureIso = futureCutoff.toISOString().slice(0, 10);

        function addEvents(sourceMap, sourceName) {
            for (const [date, list] of Object.entries(sourceMap || {})) {
                if (date < pastIso || date > futureIso) continue;
                if (!combined[date]) combined[date] = [];
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        const title = typeof item === 'string' ? item : (item.title || item.text || 'Event');
                        const time = typeof item === 'string' ? 'All Day' : (item.time || 'All Day');
                        combined[date].push(`[${time}] ${title} (${sourceName})`);
                    });
                }
            }
        }

        addEvents(manual, 'Manual');
        addEvents(gcal, 'GCal');

        const sortedDates = Object.keys(combined).sort();
        if (sortedDates.length === 0) return 'No events in upcoming 30 days.';

        return sortedDates.map(d => {
            const tag = d === todayStr ? `${d} (TODAY)` : d;
            return `${tag}: ${combined[d].join('; ')}`;
        }).join('\n');
    }

    function formatTodos(list) {
        if (!Array.isArray(list) || list.length === 0) return 'None.';
        return list.slice(0, 20).map(item => {
            const text = typeof item === 'string' ? item : (item.text || '');
            const st = typeof item === 'object' && item.completed ? '[x]' : '[ ]';
            return `${st} ${text}`;
        }).join('; ');
    }

    function formatTranscripts(list) {
        if (!Array.isArray(list) || list.length === 0) return 'None.';
        if (!isMeetingQuery) {
            return list.slice(0, 5).map(t => `${t.name || t.roomName || 'Meeting'} (${t.date || ''})`).join(', ');
        }
        return list.slice(0, 3).map(t => {
            const name = t.name || `${t.roomName || 'Meeting'}-${t.date || ''}`;
            const lines = Array.isArray(t.lines)
                ? t.lines.slice(0, 25).map(l => `${l.speaker || 'Speaker'}: ${l.text || ''}`).join(' | ')
                : (t.fullText ? t.fullText.slice(0, 800) : 'No lines recorded');
            return `${name}: ${lines}`;
        }).join('\n');
    }

    function formatProjects(list) {
        if (!Array.isArray(list) || list.length === 0) return 'None.';
        return list.slice(0, 10).map(p => {
            const title = p.title || p.name || 'Untitled';
            const desc = p.description ? ` (${p.description})` : '';
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];
            const taskStr = tasks.length > 0 ? ` [Tasks: ${tasks.map(t => `${t.completed ? '[x]' : '[ ]'} ${t.text}`).join(', ')}]` : '';
            return `${title}${desc}${taskStr}`;
        }).join('\n');
    }

    function formatMemories(list) {
        if (!Array.isArray(list) || list.length === 0) return 'None.';
        return list.slice(0, 25).map(m => `- ${String(m).slice(0, 150)}`).join('\n');
    }

    let personalityInstruction = 'Helpful, structured, clear, and direct.';
    if (personality === 'concise') {
        personalityInstruction = 'Extremely concise, minimal words, zero conversational filler.';
    } else if (personality === 'technical') {
        personalityInstruction = 'Technically precise, engineering-focused, exact code/data.';
    } else if (personality === 'casual') {
        personalityInstruction = 'Friendly, casual, approachable teammate tone.';
    } else if (personality === 'custom' && customPersonality) {
        personalityInstruction = String(customPersonality).slice(0, 300);
    }
    if (personality !== 'custom' && customPersonality && typeof customPersonality === 'string' && customPersonality.trim()) {
        personalityInstruction += ` Guidance: ${customPersonality.trim().slice(0, 200)}`;
    }

    function formatGitHub(gh) {
        if (!gh || !gh.username) return 'Disconnected.';
        const repos = Array.isArray(gh.repos) ? gh.repos : [];
        if (repos.length === 0) return `@${gh.username} (no public repos)`;
        const repoStr = repos.slice(0, 5).map(r => `${r.name} (${r.language || 'Code'}, ${r.stars || 0}★)`).join(', ');
        return `@${gh.username} repos: ${repoStr}`;
    }

    const shouldSearchWeb = Boolean(webSearch) ||
        /\b(search the web|search online|search google|web search|latest news|current weather)\b/i.test(sanitizedPrompt);

    let webSearchResults = [];
    if (shouldSearchWeb) {
        webSearchResults = await performWebSearch(sanitizedPrompt);
    }

    function formatWebResults(results) {
        if (!Array.isArray(results) || results.length === 0) return '';
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

    let slackInfo = 'Disconnected.';
    if (slackData && (slackData.token || slackData.webhook)) {
        const ch = slackData.channel ? slackData.channel : 'Slack';
        const topicOrPurpose = slackData.topic || slackData.purpose || '';
        const purp = topicOrPurpose ? ` (Topic/Purpose: "${topicOrPurpose}")` : '';
        const modeStr = slackData.mode === 'token' ? 'Live Slack Bot API' : 'Webhook';
        slackInfo = `Connected to ${ch}${purp}. ${modeStr} active.`;
    } else if (slackConnected) {
        slackInfo = 'Connected via Slack Incoming Webhook.';
    }

    const systemPrompt = `You are Easy There AI, assistant embedded in user's personal planner.
Tone: ${personalityInstruction}
Context: Date: ${todayVal} (${currentDayOfWeek || ''}), Time: ${currentTime || ''}, Timezone: ${timezone || 'UTC'}, Page: ${currentPage || 'Planner'}${selectedDate ? `, SelectedDate: ${selectedDate}` : ''}

Domain Knowledge:
- Hack Club: global nonprofit for high school coders founded by Zach Latta.
- YSWS ("You Ship, We Ship"): ship real projects, get free hardware/grants. Programs: Blot (art/plotter robot), Sprig (JS tile console), OnBoard ($100 custom PCB), Boreal, Nest (Linux accounts), Arcade & High Seas (hours to prizes), Juice, Outernet, Hack Club Bank.

User State:
- Memories: ${memoriesText}
- Schedule (next 30d): ${scheduleText}
- To-Dos: ${todosText}
- Projects: ${projectsText}
- GitHub: ${githubText}
- Slack: ${slackInfo}
- Transcripts: ${transcriptsText}
${webSearchText ? `\nLive Search Results:\n${webSearchText}\n` : ''}
Rules:
1. Output valid JSON only:
{
  "message": "Direct, clear markdown response. Use LaTeX ($math$, $$math$$) and Mermaid (\`\`\`mermaid) when helpful.",
  "action": null | {"type": "create_event", "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM - HH:MM AM/PM", "startMinutes": 0, "endMinutes": 60} | {"type": "create_todo", "text": "..."} | {"type": "create_project", "title": "...", "description": "..."} | {"type": "slack_message", "text": "..."},
  "chatTitle": "Concise 2-5 word topic title",
  "newMemory": null | "fact to store",
  "forgetMemory": null | "phrase to remove",
  "webSearchUsed": boolean
}
2. Questions: Answer directly using schedule, to-dos, projects, transcripts, GitHub, or Slack. Resolve pronouns from history.
3. Actions:
- Schedule event: action {type: "create_event", title, date, time, startMinutes, endMinutes}.
- Add to-do: action {type: "create_todo", text}.
- Add project: action {type: "create_project", title, description}.
- Slack: action {type: "slack_message", text} if connected, else prompt to connect in Integrations tab. When user asks what the Slack channel is about or what channel you post to, state the channel name, topic, and purpose directly from the Slack context above or saved memories. If no channel details are configured yet, explain how they can connect via Bot Token (Auto-Fetch) or set the channel info in Integrations; when the user tells you in chat, store it in newMemory (e.g. "Slack channel is #name: used for X") so you permanently remember it.
4. Memory: Auto-extract important user facts/preferences into newMemory, or when explicitly commanded ("remember ..."). If asked to forget, set forgetMemory.
5. Markdown: Use bold, lists, tables, LaTeX math, and Mermaid flowcharts. If live web search used, cite sources with Markdown links and set webSearchUsed: true.`;

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