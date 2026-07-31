const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2:1b';

export async function checkOllamaStatus() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Not responding');
        const data = await response.json();
        return {
            isRunning: true,
            models: (data.models || []).map(m => ({
                name: m.name,
                size: m.size,
                modifiedAt: m.modified_at
            }))
        };
    } catch (err) {
        return { isRunning: false, models: [], error: err.message };
    }
}

export async function generateWithOllama(prompt, model = DEFAULT_MODEL) {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    top_p: 0.9,
                    num_ctx: 4096,
                    repeat_penalty: 1.1,
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error('Ollama error: ' + err);
        }

        const data = await response.json();
        return data.response || '';
    } catch (err) {
        if (err.message?.includes('fetch') || err.message?.includes('Failed')) {
            throw new Error('Cannot connect to Ollama. Run: set OLLAMA_ORIGINS=* then ollama serve');
        }
        throw err;
    }
}

export async function analyzeTranscription(transcription, model = DEFAULT_MODEL) {
    if (!transcription?.trim()) {
        throw new Error('No transcription provided');
    }

    console.log('Sending to Ollama for analysis. Transcript length:', transcription.length);
    console.log('Transcript content:', transcription);

    const prompt = `Analyze the following meeting transcription. This is REAL text from an actual audio recording. Read it carefully and provide a detailed analysis.

--- START OF TRANSCRIPTION ---
${transcription}
--- END OF TRANSCRIPTION ---

Based on the ACTUAL words in the transcription above, provide:

1. "summary" - Write a detailed 2-4 sentence summary of EXACTLY what was discussed. Use specific details from the text above. Do NOT write generic placeholder text.

2. "actionItems" - List specific tasks, to-dos, or follow-ups mentioned. If none were mentioned, use empty array [].

3. "keyTopics" - List the main subjects that were actually talked about. Be specific.

4. "speakerCount" - How many different people seem to be speaking? Look for different perspectives or conversational turns.

5. "language" - Is this English, Hindi, or Hinglish (mix)?

6. "sentiment" - Overall mood: positive, negative, or neutral?

IMPORTANT: Your response must be based on the ACTUAL transcription text above. Do not use placeholder text like "topic 1" or "action item 1". Use the real content.

Return ONLY valid JSON:
{"summary":"...","actionItems":["..."],"keyTopics":["..."],"speakerCount":1,"language":"...","sentiment":"..."}`;

    const response = await generateWithOllama(prompt, model);

    console.log('Ollama raw response:', response);

    let cleanText = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('Parsed analysis:', parsed);

            // Validate - make sure it's not placeholder
            if (parsed.summary?.includes('topic 1') || parsed.summary?.includes('action item 1')) {
                console.warn('Got placeholder response, retrying with simpler prompt...');
                return await simpleAnalysis(transcription, model);
            }

            return {
                summary: parsed.summary || '',
                actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.filter(i => !i.includes('action item')) : [],
                keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.filter(i => !i.includes('topic ')) : [],
                speakerCount: parsed.speakerCount || 1,
                language: parsed.language || 'English',
                decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
                sentiment: parsed.sentiment || 'neutral'
            };
        } catch (e) {
            console.error('JSON parse error:', e);
        }
    }

    // Fallback to simple analysis
    return await simpleAnalysis(transcription, model);
}

// Simpler fallback prompt
async function simpleAnalysis(transcription, model) {
    console.log('Using simple analysis fallback...');

    const prompt = `Here is a meeting transcript:
"${transcription}"

Write a short summary of what was said. Answer in plain text, 2-3 sentences.`;

    const summaryText = await generateWithOllama(prompt, model);

    const topicsPrompt = `From this text: "${transcription}"
List the main topics discussed. Reply with just comma-separated topics, nothing else.`;

    const topicsText = await generateWithOllama(topicsPrompt, model);

    const topics = topicsText
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length < 50);

    return {
        summary: summaryText.trim(),
        actionItems: [],
        keyTopics: topics.length > 0 ? topics : ['General Discussion'],
        speakerCount: 1,
        language: 'English',
        decisions: [],
        sentiment: 'neutral'
    };
}

export async function chatWithOllama(messages, model = DEFAULT_MODEL, onChunk = null) {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: !!onChunk,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    num_ctx: 4096,
                }
            })
        });

        if (!response.ok) {
            throw new Error('Ollama chat error: ' + response.statusText);
        }

        if (onChunk) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            fullText += json.message.content;
                            onChunk(json.message.content, fullText);
                        }
                    } catch (e) { }
                }
            }
            return fullText;
        }

        const data = await response.json();
        return data.message?.content || '';
    } catch (err) {
        if (err.message?.includes('fetch') || err.message?.includes('Failed')) {
            throw new Error('Cannot connect to Ollama. Run: set OLLAMA_ORIGINS=* then ollama serve');
        }
        throw err;
    }
}

export async function answerMeetingQuestion(
    question,
    context,
    history = [],
    model = DEFAULT_MODEL,
    onChunk = null
) {
    const systemPrompt = `You are a helpful AI assistant. You have access to a meeting transcript.

MEETING TRANSCRIPT:
---
${context || 'No transcript available.'}
---

RULES:
1. Answer ANY question the user asks
2. If the question is about the meeting, use the transcript above
3. If the question is general knowledge, answer it normally
4. Be specific - quote from the transcript when relevant
5. Be concise and conversational
6. Use bullet points for lists
7. Never say "I cannot help" - always try your best`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
        })),
        { role: 'user', content: question }
    ];

    return await chatWithOllama(messages, model, onChunk);
}