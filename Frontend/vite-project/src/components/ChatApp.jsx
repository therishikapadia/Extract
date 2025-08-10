import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAwaiting, setIsAwaiting] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const [typingIndex, setTypingIndex] = useState(null); // index of message being typed
  const [typingContent, setTypingContent] = useState(''); // current content being typed

  // Typing effect for LLM responses
  const startTypingEffect = (fullText, msgIndex, type = 'markdown') => {
    setTypingIndex(msgIndex);
    setTypingContent('');
    let i = 0;
    const typeChar = () => {
      setTypingContent(fullText.slice(0, i + 1));
      if (i < fullText.length - 1) {
        i++;
        setTimeout(typeChar, 12); // typing speed (ms per char)
      } else {
        setTypingIndex(null);
        setTypingContent('');
      }
    };
    typeChar();
  };

  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setMessages((prev) => [...prev, { role: 'user', type: 'image', content: file }]);
  setImageUploaded(true);
  setIsAwaiting(true);

  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE_URL}/api/analyze/`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to analyze file");
    }

    const data = await res.json();

    let fullOutput = '';
    if (data.analysis) {
      fullOutput = typeof data.analysis === 'string'
        ? data.analysis
        : JSON.stringify(data.analysis, null, 2);
    } else {
      fullOutput = JSON.stringify(data, null, 2);
    }

    setMessages((prev) => {
      const idx = prev.length;
      setTimeout(() => startTypingEffect(fullOutput, idx, 'markdown'), 100);
      return [...prev, { role: 'llm', type: 'markdown', content: '' }];
    });

    // ✅ These should be conditional
    if (data.analysis_id) {
      setAnalysisId(data.analysis_id);
      sessionStorage.setItem("analysisId", data.analysis_id);
    }

    if (data.summary) {
      sessionStorage.setItem("analysisResult", data.summary);
    }

    sessionStorage.setItem("analysisFull", JSON.stringify(data));
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      { role: 'llm', type: 'text', content: 'Error analyzing file: ' + err.message }
    ]);
  }

  setIsAwaiting(false);
};


  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', type: 'text', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsAwaiting(true);
    try {
      const history = [];
      let lastQ = null, lastA = null;
      messages.forEach((msg) => {
        if (msg.role === 'user' && msg.type === 'text') lastQ = msg.content;
        if (msg.role === 'llm' && (msg.type === 'text' || msg.type === 'markdown')) {
          lastA = msg.content;
        }
        if (lastQ && lastA) {
          history.push({ question: lastQ, answer: lastA });
          lastQ = null; lastA = null;
        }
      });
      const id = analysisId || sessionStorage.getItem('analysisId');
      if (!id) {
        setMessages((prev) => [...prev, { role: 'llm', type: 'text', content: 'No analysis context found.' }]);
        setIsAwaiting(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: id,
          question: input,
          history,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.answer) {
        // Add empty message, then type it out
        setMessages((prev) => {
          const idx = prev.length;
          setTimeout(() => startTypingEffect(data.answer, idx, 'markdown'), 100);
          return [...prev, { role: 'llm', type: 'markdown', content: '' }];
        });
      } else {
        setMessages((prev) => [...prev, { role: 'llm', type: 'text', content: data.error || 'No answer from LLM.' }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'llm', type: 'text', content: 'Error contacting backend.' }]);
    }
    setIsAwaiting(false);
  };

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAwaiting]);

  // Typing effect: update message content as it types
  React.useEffect(() => {
    if (typingIndex !== null && typingContent !== "") {
      setMessages((prev) => {
        if (!prev[typingIndex]) return prev;
        const updated = [...prev];
        updated[typingIndex] = { ...updated[typingIndex], content: typingContent };
        return updated;
      });
    }
    // eslint-disable-next-line
  }, [typingContent]);

  React.useEffect(() => {
    const uploadedFile = sessionStorage.getItem("uploadedFile");
    const analysisResult = sessionStorage.getItem("analysisResult");
    const analysisFull = sessionStorage.getItem("analysisFull");
    const analysisIdStored = sessionStorage.getItem("analysisId");
    let analysisMarkdown = null;
    if (analysisFull) {
      try {
        const parsed = JSON.parse(analysisFull);
        analysisMarkdown = parsed.analysis || null;
      } catch (e) {
        analysisMarkdown = null;
      }
    }
    if (uploadedFile && !imageUploaded) {
      setImageUploaded(true);
      setMessages([{ role: 'user', type: 'image', content: uploadedFile }]);
      setIsAwaiting(true);
      setTimeout(() => {
        const newMessages = [{ role: 'user', type: 'image', content: uploadedFile }];
        if (analysisMarkdown) {
          newMessages.push({ role: 'llm', type: 'markdown', content: analysisMarkdown });
        }
        setMessages(newMessages);
        setIsAwaiting(false);
      }, 1200);
      if (analysisIdStored) setAnalysisId(analysisIdStored);
      sessionStorage.removeItem("uploadedFile");
      sessionStorage.removeItem("analysisResult");
      sessionStorage.removeItem("analysisFull");
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-[79vh] rounded-xl shadow-2xl overflow-hidden">
      <div className={`flex-1 ${!imageUploaded ? 'overflow-hidden' : 'overflow-y-auto'} p-8 space-y-4 bg-neutral-900`}>
        {!imageUploaded && (
          <div className="flex justify-center items-center min-h-[24rem]">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-500 rounded-lg cursor-pointer bg-gray-600 transition-colors text-white shadow-lg">
              <svg className="w-10 h-10 mb-2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a2.003 2.003 0 002 2h14a2.003 2.003 0 002-2v-2.5M16 10l-4-4m0 0l-4 4m4-4v12" /></svg>
              <span className="text-neutral-400">Click to upload ingredients image</span>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            </label>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'} ${msg.type === 'image' ? 'p-2' : ''}`}>
              {msg.type === 'image' ? (
                <img
                  src={typeof msg.content === 'string' ? msg.content : URL.createObjectURL(msg.content)}
                  alt="Uploaded ingredient list"
                  className="max-w-[200px] max-h-[200px] rounded-lg border border-neutral-700 shadow-lg bg-black"
                />
              ) : msg.type === 'markdown' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {isAwaiting && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-md
             bg-neutral-900 text-neutral-400 border border-neutral-800 animate-pulse">
              ...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>
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