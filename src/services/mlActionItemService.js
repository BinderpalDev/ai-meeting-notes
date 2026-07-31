/**
 * ============================================
 * ML ACTION ITEM EXTRACTOR
 * Uses YOUR trained model in the browser!
 * ============================================
 */

import * as ort from 'onnxruntime-web';

let session = null;
let vocab = {};
let vocabLoaded = false;

const MODEL_URL = '/models/action-item-classifier/model.onnx';
const VOCAB_URL = '/models/action-item-classifier/vocab.txt';

// ============================================
// LOAD VOCABULARY
// ============================================
async function loadVocab() {
    if (vocabLoaded) return;

    console.log("📚 Loading vocabulary...");

    const response = await fetch(VOCAB_URL);
    const text = await response.text();
    const words = text.split('\n');

    words.forEach((word, index) => {
        vocab[word.trim()] = index;
    });

    vocabLoaded = true;
    console.log(`   ✅ Loaded ${Object.keys(vocab).length} tokens`);
}

// ============================================
// LOAD MODEL
// ============================================
async function loadModel() {
    if (session) return session;

    console.log("🤖 Loading ONNX model...");

    // Configure ONNX Runtime
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

    session = await ort.InferenceSession.create(MODEL_URL);
    console.log("   ✅ Model loaded!");

    return session;
}

// ============================================
// TOKENIZE TEXT
// ============================================
function tokenize(text, maxLength = 64) {
    // Simple word tokenization
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);

    // Start with [CLS] token (101)
    const inputIds = [101];

    for (const word of words) {
        if (inputIds.length >= maxLength - 1) break;

        // Look up word in vocabulary, use [UNK] (100) if not found
        const id = vocab[word] !== undefined ? vocab[word] : 100;
        inputIds.push(id);
    }

    // Add [SEP] token (102)
    inputIds.push(102);

    // Pad to maxLength
    while (inputIds.length < maxLength) {
        inputIds.push(0);
    }

    // Attention mask: 1 for real tokens, 0 for padding
    const attentionMask = inputIds.map((id, i) => (i < inputIds.length && inputIds[i] !== 0) ? 1 : 1);

    // Fix: set padding positions to 0
    for (let i = 0; i < inputIds.length; i++) {
        if (inputIds[i] === 0) attentionMask[i] = 0;
    }

    return { inputIds, attentionMask };
}

// ============================================
// CLASSIFY SENTENCE
// ============================================
async function classifySentence(text) {
    await loadVocab();
    const model = await loadModel();

    const { inputIds, attentionMask } = tokenize(text);

    // Create tensors
    const inputIdsTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(inputIds.map(BigInt)),
        [1, inputIds.length]
    );

    const attentionMaskTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(attentionMask.map(BigInt)),
        [1, attentionMask.length]
    );

    // Run model
    const results = await model.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
    });

    // Get logits
    const logits = Array.from(results.logits.data);

    // Softmax
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sumExps);

    const isActionItem = probs[1] > probs[0];
    const confidence = Math.max(probs[0], probs[1]);

    return {
        isActionItem,
        confidence,
        label: isActionItem ? "ACTION_ITEM" : "NOT_ACTION_ITEM",
    };
}

// ============================================
// EXTRACT PERSON
// ============================================
function extractPerson(sentence) {
    const words = sentence.split(/\s+/);

    const skipWords = [
        'I', 'We', 'The', 'This', 'That', 'Please', 'Can', 'Could',
        'Would', 'Should', 'Will', 'Let', 'Make', 'Get', 'Send',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
        'Saturday', 'Sunday', 'January', 'February', 'March',
        'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December', 'Today', 'Tomorrow'
    ];

    for (const word of words) {
        const clean = word.replace(/[.,!?:;]/g, '');

        // Check if capitalized and not a skip word
        if (
            /^[A-Z][a-z]{2,}$/.test(clean) &&
            !skipWords.includes(clean)
        ) {
            return clean;
        }
    }

    return null;
}

// ============================================
// EXTRACT DEADLINE
// ============================================
function extractDeadline(sentence) {
    const lower = sentence.toLowerCase();

    const patterns = [
        /by\s+(this\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /by\s+(end\s+of\s+)?(today|tomorrow|this week|next week)/i,
        /by\s+(end\s+of\s+)?(day|eod|eow|month)/i,
        /before\s+\w+/i,
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
        /(this|next)\s+(monday|tuesday|wednesday|thursday|friday|week|month)/i,
        /in\s+\d+\s+(days?|weeks?|hours?)/i,
        /\b(today|tomorrow|tonight|asap)\b/i,
        /end\s+of\s+(week|day|month|sprint)/i,
        /by\s+friday/i,
        /due\s+(on\s+)?\w+/i,
    ];

    for (const pattern of patterns) {
        const match = lower.match(pattern);
        if (match) return match[0].trim();
    }

    return null;
}

// ============================================
// SPLIT INTO SENTENCES
// ============================================
function splitIntoSentences(text) {
    return text
        .replace(/\n+/g, '. ')
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================
export async function extractActionItems(transcript, onProgress) {
    if (!transcript || transcript.trim().length < 10) {
        return { success: true, data: [] };
    }

    try {
        if (onProgress) onProgress("Loading ML model...");

        const sentences = splitIntoSentences(transcript);
        console.log(`📝 Found ${sentences.length} sentences`);

        const actionItems = [];

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];

            if (onProgress) {
                onProgress(`Analyzing ${i + 1}/${sentences.length}...`);
            }

            const result = await classifySentence(sentence);

            const status = result.isActionItem ? "✅" : "❌";
            console.log(`${status} (${(result.confidence * 100).toFixed(0)}%) "${sentence.substring(0, 50)}..."`);

            if (result.isActionItem && result.confidence > 0.5) {
                actionItems.push({
                    task: sentence,
                    person: extractPerson(sentence),
                    deadline: extractDeadline(sentence),
                    confidence: result.confidence,
                });
            }
        }

        console.log(`\n🎉 Found ${actionItems.length} action items`);
        return { success: true, data: actionItems };

    } catch (error) {
        console.error("❌ ML Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}