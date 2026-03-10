import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User, GraduationCap, MessageSquare, RotateCcw, Settings, X } from 'lucide-react';
import { Book as BookType } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'shared' | 'learning';
}

export default function AIChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'shared' | 'learning'>(() => {
    return (localStorage.getItem('chat_mode') as 'shared' | 'learning') || 'shared';
  });
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [book, setBook] = useState<BookType | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memoryDepth, setMemoryDepth] = useState(20);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const savedDepth = localStorage.getItem('ai_memory_depth');
    if (savedDepth) {
      setMemoryDepth(parseInt(savedDepth, 10));
    }
    
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_mode', mode);
  }, [mode]);

  const handleMemoryDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMemoryDepth(val);
    localStorage.setItem('ai_memory_depth', val.toString());
  };

  useEffect(() => {
    const savedBooks = localStorage.getItem('libraryBooks');
    if (savedBooks) {
      try {
        const books: BookType[] = JSON.parse(savedBooks);
        const foundBook = books.find(b => b.id === id);
        if (foundBook) setBook(foundBook);
      } catch (e) {}
    }

    const savedMessages = localStorage.getItem(`chat_${id}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {}
    } else {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: '你好！我是你的AI阅读助手。我们可以一起探讨这本书的情节、人物，或者进行知识点的复习和测试。请选择上方的模式开始吧！',
        mode: 'shared'
      }]);
    }
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${id}`, JSON.stringify(messages));
    }
    
    messagesEndRef.current?.scrollIntoView({ 
      behavior: isInitialMount.current ? 'auto' : 'smooth' 
    });
    
    if (isInitialMount.current && messages.length > 0) {
      isInitialMount.current = false;
    }
  }, [messages, id]);

  const handleSend = async (forceReply = false, regenerate = false) => {
    if ((!inputText.trim() && !forceReply && !regenerate) || isTyping) return;

    let currentMessages = [...messages];

    if (regenerate) {
      // Find the last user message and remove all subsequent AI messages
      let lastUserIndex = -1;
      for (let i = currentMessages.length - 1; i >= 0; i--) {
        if (currentMessages[i].role === 'user') {
          lastUserIndex = i;
          break;
        }
      }
      
      if (lastUserIndex !== -1) {
        currentMessages = currentMessages.slice(0, lastUserIndex + 1);
        setMessages(currentMessages);
      } else {
        return; // No user message found to regenerate from
      }
    } else if (inputText.trim()) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputText.trim(),
        mode
      };
      currentMessages = [...currentMessages, userMsg];
      setMessages(currentMessages);
      setInputText('');
    }

    if (!forceReply && !regenerate && inputText.trim()) {
      // Just sending user message, not triggering AI reply yet
      return;
    }

    setIsTyping(true);

    const savedConfigs = localStorage.getItem('apiConfigs');
    if (!savedConfigs) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ 请先在 Profile 页面配置 API', mode }]);
      setIsTyping(false);
      return;
    }
    
    const configs = JSON.parse(savedConfigs);
    const config = configs[0];
    if (!config || !config.baseUrl || !config.apiKey || !config.model) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '⚠️ API 配置不完整，请前往 Profile 页面配置', mode }]);
      setIsTyping(false);
      return;
    }

    try {
      let systemPrompt = '';
      const contextText = localStorage.getItem(`current_context_${book?.id}`);
      const contextInfo = contextText ? `\n\n用户当前正在阅读的段落内容是：\n${contextText}\n\n` : '';

      if (mode === 'shared') {
        systemPrompt = `你是一个共读助手。用户正在阅读《${book?.title || '未知书籍'}》。${contextInfo}请基于这段内容与用户探讨书中的人物、情节、主题、细节等。像一个有见地的读书搭子一样，引导深入思考，分享感悟。注意：涉及情节时，不允许剧透。\n\n【重要要求】你的回复必须分为2到7条独立的消息。请使用 "|||" 作为每条消息之间的分隔符。每条消息内部不允许出现任何空行（即不能有连续的换行符）。例如：消息1|||消息2|||消息3`;
      } else {
        systemPrompt = `你是一个学习助手。用户正在阅读《${book?.title || '未知书籍'}》。${contextInfo}请以“学习模式”与用户交流，探讨书中的技术细节、核心概念，帮助用户复习，或者主动出题（如选择题、问答题）来巩固用户的知识。当用户提出想复习XX内容或者XX章节时，请基于你对该书的了解和上述提供的上下文内容进行解答。\n\n【重要要求】你的回复必须分为2到7条独立的消息。请使用 "|||" 作为每条消息之间的分隔符。每条消息内部不允许出现任何空行（即不能有连续的换行符）。例如：消息1|||消息2|||消息3`;
      }

      const recentMessages = currentMessages.slice(-memoryDepth * 2); // *2 because one turn = user + assistant

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: apiMessages,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        let errorMsg = `API 请求失败 (${res.status})`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error?.message || errorData.message || JSON.stringify(errorData) || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      const replyContent = data.choices[0].message.content;

      // Split the reply into multiple messages based on the delimiter
      let messagesText = replyContent.split('|||').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      
      // Fallback if the AI didn't use the delimiter
      if (messagesText.length === 1 && messagesText[0].includes('\n\n')) {
        messagesText = messagesText[0].split('\n\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      }

      // Ensure no empty lines within each message
      messagesText = messagesText.map((msg: string) => msg.replace(/\n\s*\n/g, '\n'));

      const newMessages: Message[] = messagesText.map((text: string, index: number) => ({
        id: `${Date.now()}-${index}`,
        role: 'assistant',
        content: text,
        mode
      }));

      for (let i = 0; i < newMessages.length; i++) {
        if (i > 0) {
          setIsTyping(true);
          // Simulate typing delay for subsequent messages
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setMessages(prev => [...prev, newMessages[i]]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ 回复失败：\n${err.message}`,
        mode
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative flex h-screen max-w-md mx-auto flex-col overflow-hidden bg-[#f8f9fa] text-gray-800 font-sans">
      <header className="flex items-center justify-between px-4 py-4 bg-[#f8f9fa]/90 backdrop-blur-md border-b border-gray-200 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center flex-1 px-4">
          <h2 className="text-base font-bold leading-tight text-center line-clamp-1">
            {isTyping ? '对方正在输入……' : (book?.title || 'AI Chat')}
          </h2>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 -mr-2 text-slate-600 hover:bg-gray-100 rounded-full transition-colors">
          <Settings size={20} />
        </button>
      </header>

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">聊天设置</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">上下文记忆深度</label>
                  <span className="text-sm font-bold text-blue-600">{memoryDepth} 轮</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  step="1"
                  value={memoryDepth}
                  onChange={handleMemoryDepthChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  决定AI回复时携带的历史对话轮数。数值越大，AI记忆越久，但消耗的Token也越多。
                </p>
              </div>
            </div>
            
            <div className="mt-8">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-[#f8f9fa] z-10">
        <div className="flex h-10 items-center justify-center rounded-xl bg-gray-200/50 p-1">
          <label className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 text-sm font-medium transition-all ${mode === 'shared' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <MessageSquare size={14} className="mr-1.5" />
            <span className="truncate">共读模式</span>
            <input 
              type="radio" 
              name="mode-toggle" 
              value="shared" 
              checked={mode === 'shared'} 
              onChange={() => setMode('shared')} 
              className="hidden" 
            />
          </label>
          <label className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 text-sm font-medium transition-all ${mode === 'learning' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <GraduationCap size={14} className="mr-1.5" />
            <span className="truncate">学习模式</span>
            <input 
              type="radio" 
              name="mode-toggle" 
              value="learning" 
              checked={mode === 'learning'} 
              onChange={() => setMode('learning')} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full overflow-hidden ${msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-100 text-blue-600'}`}>
              {msg.role === 'user' ? (
                userAvatar ? (
                  <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-gray-500" />
                )
              ) : (
                msg.mode === 'learning' ? <GraduationCap size={16} /> : <Bot size={16} />
              )}
            </div>
            <div className={`flex flex-1 flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                {msg.role === 'user' ? 'You' : (msg.mode === 'learning' ? 'Learning Assistant' : 'Reading Assistant')}
              </p>
              <div className={`text-sm font-normal leading-relaxed rounded-2xl px-4 py-3 shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#333333] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Bot size={16} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 items-start">
              <div className="text-sm font-normal leading-relaxed rounded-2xl px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-tl-sm flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#f8f9fa] border-t border-gray-200 pb-safe">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(false, false)}
            placeholder="输入你的想法..." 
            className="w-full rounded-full border border-gray-200 bg-white py-3 pl-5 pr-[120px] text-sm focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all shadow-sm" 
          />
          <div className="absolute right-2 flex items-center gap-1">
            {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <button 
                onClick={() => handleSend(true, true)}
                disabled={isTyping}
                title="重回"
                className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={18} strokeWidth={2.5} />
              </button>
            )}
            <button 
              onClick={() => handleSend(true, false)}
              disabled={isTyping || messages.length === 0 || messages[messages.length - 1].role === 'assistant'}
              title="回复"
              className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 transition-colors"
            >
              <Bot size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => handleSend(false, false)}
              disabled={!inputText.trim() || isTyping}
              title="发送"
              className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 transition-colors ml-1"
            >
              <Send size={18} strokeWidth={2.5} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
