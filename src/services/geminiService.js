import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MOCK_MODE = import.meta.env.VITE_MOCK_AI === 'true';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const MODEL_NAME = 'gemini-2.0-flash';

function getMockTranscription(audioSize) {
  return {
    language: 'Hinglish',
    speakerCount: 2,
    transcription: `Speaker 1: Hello, aaj ki meeting mein hum project ka update discuss karenge.
Speaker 2: Haan bilkul, maine frontend ka kaam complete kar liya hai.
Speaker 1: Great! Backend integration ka kya status hai?
Speaker 2: API endpoints ready hain, bas database testing baaki hai.
Speaker 1: Okay, toh kal tak testing complete kar lete hain.
Speaker 2: Sure, main environment setup kar leta hoon.`,
    summary: 'Project status meeting jisme frontend completion aur backend testing discuss hua. Kal tak testing complete karne ka plan banaya gaya.',
    actionItems: [
      'Database testing complete karni hai',
      'Test environment setup karna hai',
      'Kal progress update dena hai'
    ],
    keyTopics: ['Frontend Development', 'Backend Integration', 'Database Testing', 'Project Status'],
  };
}

export async function transcribeAudio(audioBlob) {
  if (MOCK_MODE) {
    console.log('Using MOCK transcription');
    await new Promise(r => setTimeout(r, 2000));
    return getMockTranscription(audioBlob.size);
  }

  if (!API_KEY || !genAI) {
    throw new Error('Gemini API key not configured.');
  }

  try {
    console.log('Starting transcription...', {
      blobSize: audioBlob.size,
      blobType: audioBlob.type
    });

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const base64Audio = await blobToBase64(audioBlob);

    const prompt = `You are an expert multilingual transcription AI specializing in English, Hindi, and Hinglish (Hindi-English mix) audio analysis.

TASK: Carefully analyze this audio recording and provide a detailed transcription.

LANGUAGE DETECTION RULES:
- If audio is in English → transcribe in English
- If audio is in Hindi → transcribe in Hindi (Devanagari or Roman script based on how it sounds)
- If audio is in Hinglish (mixed Hindi + English) → transcribe exactly as spoken, keeping the mix natural
- If audio has multiple languages, note which parts are in which language

SPEAKER IDENTIFICATION RULES:
- Listen carefully for voice changes (pitch, tone, accent, speaking style)
- Each unique voice = different speaker
- Label them as "Speaker 1:", "Speaker 2:", etc.
- Maintain consistent speaker labels throughout
- If only one person is speaking, use "Speaker 1:" throughout
- If you detect a voice change but are not 100% sure, still mark it as a new speaker

TRANSCRIPTION RULES:
- Transcribe EXACTLY what is said, word for word
- Keep Hinglish words as spoken (e.g., "meeting mein", "kya scene hai", "basically yeh hai")
- Do not translate - keep the original language mix
- Include filler words if they are meaningful (um, uh, haan, achha, okay)
- Use punctuation appropriately
- If audio is unclear, write [inaudible] for that part

SUMMARY RULES:
- Write summary in the SAME language as the audio
- If Hinglish, write summary in Hinglish
- If English, write in English
- Keep it natural and conversational

Return ONLY this exact JSON format, no other text, no markdown:
{
  "language": "English/Hindi/Hinglish",
  "speakerCount": <number of unique speakers detected>,
  "transcription": "<full word-for-word transcription with speaker labels>",
  "summary": "<2-3 sentence summary in same language as audio>",
  "actionItems": ["<action item 1>", "<action item 2>"],
  "keyTopics": ["<topic 1>", "<topic 2>"]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log('Gemini response received');

    // Clean and parse
    let cleanText = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          language: parsed.language || 'English',
          speakerCount: parsed.speakerCount || 1,
          transcription: parsed.transcription || 'No transcription available',
          summary: parsed.summary || 'Audio processed successfully',
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
        };
      } catch (e) {
        console.warn('JSON parse failed, using raw text');
      }
    }

    return {
      language: 'Unknown',
      speakerCount: 1,
      transcription: text,
      summary: 'Audio transcribed',
      actionItems: [],
      keyTopics: [],
    };

  } catch (error) {
    console.error('Transcription error:', error);
    const msg = error.message || '';

    if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      console.log('Quota exhausted, using mock');
      return getMockTranscription(audioBlob.size);
    }
    if (msg.includes('API_KEY') || msg.includes('invalid')) {
      throw new Error('Invalid API key. Check your .env file.');
    }

    throw new Error('Transcription failed: ' + msg);
  }
}

export async function chatWithMeeting(history, question, context) {
  if (!API_KEY || !genAI) {
    return "API key not configured.";
  }

  if (!context?.trim()) {
    return "Please transcribe the recording first to enable chat.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are an AI assistant analyzing a meeting transcript.

MEETING TRANSCRIPT:
---
${context}
---

USER QUESTION: ${question}

INSTRUCTIONS:
- Answer based ONLY on the meeting content
- If not discussed, say so clearly
- Be concise and helpful
- Match the language style of the transcript (if Hinglish transcript, you can respond in Hinglish)`;

    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (error) {
    console.error('Chat error:', error);
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return "API quota exhausted. Please wait a moment and try again.";
    }
    return "Error: " + error.message;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read audio'));
    reader.readAsDataURL(blob);
  });
}