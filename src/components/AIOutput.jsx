import { useState } from 'react';
import { MessageCircle, Copy, Check } from 'lucide-react';

export default function AIOutput({ transcription, summary, actionItems, speakerCount }) {
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
        <h3 className="text-2xl font-bold text-white mb-4">AI Summary</h3>
        <p className="text-lg text-slate-300 leading-relaxed">{summary}</p>
      </div>

      {actionItems?.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-2xl p-6 border border-indigo-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Action Items</h3>
          <ul className="space-y-3">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-indigo-300">
                <Check className="w-5 h-5 text-green-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Full Transcript ({speakerCount} speakers)</h3>
          <button onClick={() => copyToClipboard(transcription)} className="text-indigo-400 hover:text-indigo-300">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {transcription}
        </div>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-full shadow-2xl transition transform hover:scale-110"
      >
        <MessageCircle className="w-8 h-8" />
      </button>
    </div>
  );
}