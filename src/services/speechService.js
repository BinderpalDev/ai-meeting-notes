export class LiveTranscriber {
    constructor(language = 'en-IN') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new Error('Speech Recognition not supported. Use Chrome browser.');
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = language;
        this.transcript = '';
        this.isActive = false;
        this.onTranscriptUpdate = null;
        this.onError = null;

        this.recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    this.transcript += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (this.onTranscriptUpdate) {
                this.onTranscriptUpdate(this.transcript, interim);
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return;
            if (this.onError) this.onError(event.error);
        };

        this.recognition.onend = () => {
            if (this.isActive) {
                try { this.recognition.start(); } catch (e) { }
            }
        };
    }

    start() {
        this.transcript = '';
        this.isActive = true;
        this.recognition.start();
    }

    stop() {
        this.isActive = false;
        this.recognition.stop();
        return this.transcript.trim();
    }

    getTranscript() {
        return this.transcript.trim();
    }
}