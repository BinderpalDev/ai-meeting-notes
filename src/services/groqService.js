import Groq from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

let groqClient = null;

function getGroqClient() {
    if (!groqClient && GROQ_API_KEY) {
        groqClient = new Groq({
            apiKey: GROQ_API_KEY,
            dangerouslyAllowBrowser: true
        });
    }
    return groqClient;
}

export async function checkGroqStatus() {
    if (!GROQ_API_KEY) {
        return { isConfigured: false };
    }
    return { isConfigured: true };
}

export async function transcribeWithGroq(audioBlob, language = 'en') {
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key not configured. Get free key from console.groq.com');
    }

    const client = getGroqClient();
    if (!client) throw new Error('Failed to initialize Groq');

    try {
        console.log('=== GROQ TRANSCRIPTION START ===');
        console.log('Audio blob:', { size: audioBlob.size, type: audioBlob.type });

        const langCode = language === 'hi-IN' ? 'hi' : 'en';

        const file = new File(
            [audioBlob],
            'recording.webm',
            { type: audioBlob.type || 'audio/webm' }
        );

        console.log('Sending to Groq Whisper...');

        const transcription = await client.audio.transcriptions.create({
            file: file,
            model: 'whisper-large-v3-turbo',
            language: langCode,
            response_format: 'verbose_json',
        });

        console.log('=== GROQ RESULT ===');
        console.log('Full response:', transcription);
        console.log('Transcript text:', transcription.text);
        console.log('Language:', transcription.language);
        console.log('Duration:', transcription.duration);

        const transcript = transcription.text?.trim() || '';

        if (!transcript) {
            console.error('Empty transcript received from Groq');
            throw new Error('No speech detected in the audio');
        }

        return {
            transcript: transcript,
            language: transcription.language || langCode,
            duration: transcription.duration || 0,
        };

    } catch (error) {
        console.error('=== GROQ ERROR ===', error);
        const msg = error.message || '';

        if (msg.includes('401') || msg.includes('API key')) {
            throw new Error('Invalid Groq API key');
        }
        if (msg.includes('429')) {
            throw new Error('Groq rate limit. Wait a moment.');
        }
        if (msg.includes('413')) {
            throw new Error('Audio too large. Max 25MB.');
        }

        throw new Error('Groq transcription failed: ' + msg);
    }
}