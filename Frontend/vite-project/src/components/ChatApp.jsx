import React, { useRef, useState } from 'react';

const mockLLMResponse = async (message, image) => {
  // Simulate LLM response delay
  return new Promise((resolve) => {
    setTimeout(() => {
      if (image) {
        resolve("I see you've uploaded a nutrient label. What would you like to know about it?");
      } else {
        resolve(`LLM: You said: "${message}"`);
      }
    }, 1200);
  });
};

const ChatApp = () => {
  const [messages, setMessages] = useState([]); // {role: 'user'|'llm', type: 'text'|'image', content: string|File}
  const [input, setInput] = useState('');
  const [isAwaiting, setIsAwaiting] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMessages((prev) => [...prev, { role: 'user', type: 'image', content: file }]);
    setImageUploaded(true);
    setIsAwaiting(true);
    const llmMsg = await mockLLMResponse('', file);
    setMessages((prev) => [...prev, { role: 'llm', type: 'text', content: llmMsg }]);
    setIsAwaiting(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', type: 'text', content: input }]);
    setInput('');
    setIsAwaiting(true);
    const llmMsg = await mockLLMResponse(input, null);
    setMessages((prev) => [...prev, { role: 'llm', type: 'text', content: llmMsg }]);
    setIsAwaiting(false);
  };

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAwaiting]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[80vh] bg-neutral-950 rounded-xl shadow-2xl border border-neutral-900 overflow-hidden">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-950">
        {!imageUploaded && (
          <div className="flex justify-center items-center h-full">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer bg-neutral-900 hover:bg-neutral-800 transition-colors">
              <svg className="w-10 h-10 mb-2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a2.003 2.003 0 002 2h14a2.003 2.003 0 002-2v-2.5M16 10l-4-4m0 0l-4 4m4-4v12" /></svg>
              <span className="text-neutral-400">Click to upload nutrient label or ingredients image</span>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            </label>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'} ${msg.type === 'image' ? 'p-2' : ''}`}>
              {msg.type === 'image' ? (
                <img
                  src={URL.createObjectURL(msg.content)}
                  alt="Uploaded nutrient label"
                  className="max-w-[200px] max-h-[200px] rounded-lg border border-neutral-700 shadow-lg bg-black"
                />
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {isAwaiting && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md bg-neutral-900 text-neutral-400 border border-neutral-800 animate-pulse">
              LLM is typing...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>
      {/* Input */}
      {imageUploaded && (
        <div className="bg-neutral-900 p-4 border-t border-neutral-800 flex items-center">
          <input
            type="text"
            className="flex-1 bg-neutral-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder-neutral-500 border border-neutral-700"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            disabled={isAwaiting}
          />
          <button
            onClick={handleSend}
            disabled={isAwaiting || !input.trim()}
            className="ml-3 px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-semibold transition-colors disabled:opacity-50 border border-neutral-800 shadow"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatApp;