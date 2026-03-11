import React, { useState, useEffect } from 'react';
import { RefreshCw, Book, User, Home, HelpCircle, Settings, Heart, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../types';
import { get } from 'idb-keyval';

export const mockCards: Card[] = [
  {
    id: '1',
    bookId: 'b1',
    type: 'notebook',
    content: '<span class="highlight-pink">我发现一个奇怪定律</span> 每次加油的时候，只要是开<span class="highlight-pink">轿车的 10个</span>，有九个人都是加<span class="highlight-pink">200，这有什么说法吗</span>',
    bookTitle: '生活观察录',
    chapter: '第三章',
    author: '采一束葵',
    styleConfig: {
      fontFamily: 'font-serif',
      backgroundColor: 'bg-white',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-100',
      layoutType: 'minimal',
      decoration: 'none'
    }
  },
  {
    id: '3',
    bookId: 'b3',
    type: 'quote',
    content: '如果你只有两双袜子，<br/><br/>一双袜子湿了<br/><br/>一双袜子臭的黏糊。<br/><br/>你今天出门你要穿哪一双？<br/><br/>你该怎么选择呢？',
    bookTitle: '存在主义：日常困局',
    chapter: '第二章',
    author: '世真世界',
    styleConfig: {
      fontFamily: 'font-serif',
      backgroundColor: 'bg-[#fffcf5]',
      textColor: 'text-gray-800',
      borderColor: 'border-transparent',
      layoutType: 'minimal',
      decoration: 'none'
    }
  },
  {
    id: '2',
    bookId: 'b2',
    type: 'marriage',
    content: '实行零彩礼之后，要考虑的就是<span class="text-orange-500 font-bold">男赘女还是女嫁男</span>的问题了。因为都是零彩礼，为什么是<span class="text-orange-500 font-bold">女方嫁到男方家</span>，而不是<span class="text-orange-500 font-bold">男方赘到女方家</span>。',
    bookTitle: '现代礼俗研讨',
    chapter: '第五卷',
    author: '泽叶而栖',
    date: '2026.03.03',
    user: '瑾豆子',
    styleConfig: {
      fontFamily: 'font-sans',
      backgroundColor: 'bg-white',
      textColor: 'text-gray-800',
      borderColor: 'border-[#88d8c0]',
      layoutType: 'bordered',
      decoration: 'line-top'
    }
  },
  {
    id: '4',
    bookId: 'b4',
    type: 'insight',
    content: '<div class="text-[10px] text-gray-400 tracking-widest mb-2">INSIGHT</div>读书的意义大概就是：用生活去感知文字，用文字去治愈生活。',
    bookTitle: '灵魂的出口',
    chapter: '序言',
    author: '林语堂',
    styleConfig: {
      fontFamily: 'font-serif',
      backgroundColor: 'bg-white',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-100',
      layoutType: 'left-border',
      decoration: 'none'
    }
  },
  {
    id: '5',
    bookId: 'b5',
    type: 'question',
    content: '人为什么要不停地学习？仅仅是为了生活，还是为了看到不一样的世界？',
    bookTitle: '通识：关于万物的常识',
    chapter: '',
    author: '',
    styleConfig: {
      fontFamily: 'font-sans',
      backgroundColor: 'bg-white',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-100',
      layoutType: 'blue-dot',
      decoration: 'none'
    }
  }
];

export default function DiscoveryFeed() {
  const navigate = useNavigate();
  const [likedNotes, setLikedNotes] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('likedNotes') || '[]');
  });
  const [customCards, setCustomCards] = useState<Card[]>(() => {
    return JSON.parse(localStorage.getItem('myNotes') || '[]');
  });
  const [aiNotes, setAiNotes] = useState<Card[]>(() => {
    return JSON.parse(localStorage.getItem('aiNotes') || '[]');
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteBook, setNewNoteBook] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [deletedNotes, setDeletedNotes] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('deletedNotes') || '[]');
  });

  const allCards = [...customCards, ...aiNotes, ...mockCards].filter(c => !deletedNotes.includes(c.id)).sort((a, b) => {
    const timeA = parseInt(a.id.split('_')[1]) || 0;
    const timeB = parseInt(b.id.split('_')[1]) || 0;
    return timeB - timeA;
  });

  const leftColumn = allCards.filter((_, i) => i % 2 === 0);
  const rightColumn = allCards.filter((_, i) => i % 2 === 1);

  const toggleLikeNote = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    const isLiked = likedNotes.includes(card.id);
    let newLikes;
    if (isLiked) {
      newLikes = likedNotes.filter(id => id !== card.id);
      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      localStorage.setItem('likedNotesData', JSON.stringify(likedNotesData.filter((c: Card) => c.id !== card.id)));
    } else {
      newLikes = [...likedNotes, card.id];
      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      if (!likedNotesData.find((c: Card) => c.id === card.id)) {
         localStorage.setItem('likedNotesData', JSON.stringify([{...card, likedAt: Date.now()}, ...likedNotesData]));
      }
    }
    setLikedNotes(newLikes);
    localStorage.setItem('likedNotes', JSON.stringify(newLikes));
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    const types: Card['type'][] = ['notebook', 'marriage', 'quote', 'insight', 'question'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const fonts = ['font-serif', 'font-sans', 'font-mono', 'font-handwritten', 'font-brush'];
    const bgColors = [
      'bg-white', 'bg-blue-50/30', 'bg-[#fffcf5]', 'bg-gray-50', 'bg-notebook-lines', 
      'bg-emerald-50/30', 'bg-orange-50/30', 'bg-rose-50', 'bg-amber-50', 'bg-violet-50', 
      'bg-teal-50', 'bg-stone-100'
    ];
    const textColors = ['text-gray-800', 'text-slate-800', 'text-zinc-800', 'text-blue-900', 'text-stone-900', 'text-emerald-900'];
    const borderColors = ['border-gray-100', 'border-blue-100/50', 'border-[#88d8c0]', 'border-transparent', 'border-rose-200', 'border-amber-200'];
    const layouts: Card['styleConfig']['layoutType'][] = ['centered', 'left', 'bordered', 'minimal', 'notebook', 'card', 'poster', 'handwritten', 'left-border', 'blue-dot'];
    const decorations: Card['styleConfig']['decoration'][] = ['none', 'sticker-star', 'sticker-heart', 'sticker-flower', 'line-top', 'line-bottom', 'quote-mark'];

    const newCard: Card = {
      id: `custom_${Date.now()}`,
      bookId: `b_${Date.now()}`,
      type: randomType,
      content: newNoteContent,
      bookTitle: newNoteBook || '未知书籍',
      author: newNoteAuthor || '佚名',
      chapter: '笔记',
      date: new Date().toLocaleDateString(),
      user: localStorage.getItem('userName') || 'Alex Reader',
      styleConfig: {
        fontFamily: fonts[Math.floor(Math.random() * fonts.length)],
        backgroundColor: bgColors[Math.floor(Math.random() * bgColors.length)],
        textColor: textColors[Math.floor(Math.random() * textColors.length)],
        borderColor: borderColors[Math.floor(Math.random() * borderColors.length)],
        layoutType: layouts[Math.floor(Math.random() * layouts.length)],
        decoration: decorations[Math.floor(Math.random() * decorations.length)]
      }
    };

    const updatedNotes = [newCard, ...customCards];
    setCustomCards(updatedNotes);
    localStorage.setItem('myNotes', JSON.stringify(updatedNotes));
    setShowAddModal(false);
    setNewNoteContent('');
    setNewNoteBook('');
    setNewNoteAuthor('');
  };

  const handleDeleteNote = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      const updatedCustomCards = customCards.filter(c => c.id !== noteToDelete);
      setCustomCards(updatedCustomCards);
      localStorage.setItem('myNotes', JSON.stringify(updatedCustomCards));

      const updatedAiNotes = aiNotes.filter(c => c.id !== noteToDelete);
      setAiNotes(updatedAiNotes);
      localStorage.setItem('aiNotes', JSON.stringify(updatedAiNotes));

      const updatedLikedNotes = likedNotes.filter(id => id !== noteToDelete);
      setLikedNotes(updatedLikedNotes);
      localStorage.setItem('likedNotes', JSON.stringify(updatedLikedNotes));

      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      const updatedLikedNotesData = likedNotesData.filter((c: Card) => c.id !== noteToDelete);
      localStorage.setItem('likedNotesData', JSON.stringify(updatedLikedNotesData));

      const newDeleted = [...deletedNotes, noteToDelete];
      setDeletedNotes(newDeleted);
      localStorage.setItem('deletedNotes', JSON.stringify(newDeleted));
      
      setNoteToDelete(null);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const savedConfigs = localStorage.getItem('apiConfigs');
      if (!savedConfigs) {
        alert('⚠️ 请先在 Profile 页面配置 API');
        setIsRefreshing(false);
        return;
      }
      
      const configs = JSON.parse(savedConfigs);
      const config = configs[0];
      if (!config || !config.baseUrl || !config.apiKey || !config.model) {
        alert('⚠️ API 配置不完整，请前往 Profile 页面配置');
        setIsRefreshing(false);
        return;
      }

      const libraryBooks = JSON.parse(localStorage.getItem('libraryBooks') || '[]');
      
      // 1. 从 library 中随机抽取书名和可能的片段
      const libraryContexts = [];
      if (libraryBooks.length > 0) {
        const shuffled = [...libraryBooks].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);
        
        for (const book of selected) {
          let snippet = '';
          if (book.format === 'TXT') {
            try {
              const file = await get(`book_file_${book.id}`);
              const text = file ? await file.text() : (book.content || '');
              if (text) {
                // 随机抽取一段较长的上下文供 AI 挑选精华
                const start = Math.floor(Math.random() * Math.max(1, text.length - 800));
                snippet = text.substring(start, start + 800);
              }
            } catch (e) {}
          }
          libraryContexts.push({ title: book.title, author: book.author, snippet });
        }
      }

      const libraryInfo = libraryContexts.map(b => 
        `书名：《${b.title}》 作者：${b.author}${b.snippet ? `\n参考片段：${b.snippet}` : ''}`
      ).join('\n\n');
      
      // 准备用于生成笔记的提示词
      let prompt = `
请生成 8 条中文笔记，要求如下：
1. 其中 4 条笔记必须来自以下我正在阅读的书籍。如果提供了“参考片段”，请从中挑选或润色一段 30-120 字的原文；如果没有提供片段，请根据你的知识库召回该书真实的经典段落：
${libraryInfo || '（暂无本地书籍，请自行推荐 8 条）'}

2. 另外 4 条笔记请推荐其他真实存在的书籍并提取其中的精彩原文。
3. **字数限制：每条笔记的内容必须在 30 到 120 字之间。**
4. 笔记内容必须直接引用书籍原文，不要包含“XXX作者写道”、“XXX说道”等描述。
5. 必须引用真实存在的书籍，不得捏造。
6. **极其重要：只返回 JSON 数据，不要包含任何其他文字、解释或对话。**
7. 返回的 JSON 格式必须是一个对象，包含一个 \`notes\` 数组，每个元素包含以下字段：
   - content: 笔记内容
   - bookTitle: 书名
   - author: 作者
   - chapter: 章节名
   - type: 类型 (notebook, marriage, quote, insight, question)
`;

      const res = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
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
      
      // Check if the response is a refusal or support message
      if (replyContent.includes('I\'m a support assistant') || replyContent.includes('AI code editor')) {
        throw new Error("API 配置错误：您配置的 API 似乎指向了一个支持机器人，而不是大模型 API。请前往 Profile 页面检查 API 地址和模型配置。");
      }

      // 改进解析机制：提取 JSON 并清理常见错误
      let cleanedContent = replyContent;
      const firstBrace = replyContent.indexOf('{');
      const lastBrace = replyContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedContent = replyContent.substring(firstBrace, lastBrace + 1);
      }
      
      // 移除 Markdown 标记和多余空白
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // 移除 JSON 中常见的末尾逗号
      cleanedContent = cleanedContent.replace(/,\s*([\]}])/g, '$1');

      try {
        const parsed = JSON.parse(cleanedContent);
        const aiGenerated = parsed.notes || (Array.isArray(parsed) ? parsed : [parsed]);
        const aiGeneratedArray = Array.isArray(aiGenerated) ? aiGenerated : [aiGenerated];
        
        // 过滤并确保字数限制
        const finalNotes = aiGeneratedArray.map((note: any) => ({
          ...note,
          content: note.content?.length > 120 ? note.content.substring(0, 117) + '...' : note.content
        })).filter((note: any) => note.content?.length >= 25); // 稍微放宽一点限制以防 AI 缩减太狠

        const fonts = ['font-serif', 'font-sans', 'font-mono', 'font-handwritten', 'font-brush'];
        const bgColors = [
          'bg-white', 'bg-blue-50/30', 'bg-[#fffcf5]', 'bg-gray-50', 'bg-notebook-lines', 
          'bg-emerald-50/30', 'bg-orange-50/30', 'bg-rose-50', 'bg-amber-50', 'bg-violet-50', 
          'bg-teal-50', 'bg-stone-100'
        ];
        const textColors = ['text-gray-800', 'text-slate-800', 'text-zinc-800', 'text-blue-900', 'text-stone-900', 'text-emerald-900'];
        const borderColors = ['border-gray-100', 'border-blue-100/50', 'border-[#88d8c0]', 'border-transparent', 'border-rose-200', 'border-amber-200'];
        const layouts: Card['styleConfig']['layoutType'][] = ['centered', 'left', 'bordered', 'minimal', 'notebook', 'card', 'poster', 'handwritten', 'left-border', 'blue-dot'];
        const decorations: Card['styleConfig']['decoration'][] = ['none', 'sticker-star', 'sticker-heart', 'sticker-flower', 'line-top', 'line-bottom', 'quote-mark'];

        const newCards: Card[] = finalNotes.map((note: any, index: number) => ({
          id: `ai_${Date.now()}_${index}`,
          bookId: `b_ai_${Date.now()}_${index}`,
          type: note.type as any,
          content: note.content,
          bookTitle: note.bookTitle,
          author: note.author,
          chapter: note.chapter,
          date: new Date().toLocaleDateString(),
          user: 'AI Assistant',
          styleConfig: {
            fontFamily: fonts[Math.floor(Math.random() * fonts.length)],
            backgroundColor: bgColors[Math.floor(Math.random() * bgColors.length)],
            textColor: textColors[Math.floor(Math.random() * textColors.length)],
            borderColor: borderColors[Math.floor(Math.random() * borderColors.length)],
            layoutType: layouts[Math.floor(Math.random() * layouts.length)],
            decoration: decorations[Math.floor(Math.random() * decorations.length)]
          }
        }));

        const updatedAiNotes = [...newCards, ...aiNotes];
        setAiNotes(updatedAiNotes);
        localStorage.setItem('aiNotes', JSON.stringify(updatedAiNotes));
      } catch (e) {
        console.error("Failed to parse JSON:", e, "Cleaned content:", cleanedContent);
        throw new Error("返回的数据格式不正确，解析失败。请确保 AI 返回的是标准 JSON 格式。");
      }
    } catch (error: any) {
      console.error("Failed to generate notes:", error);
      alert(`生成笔记失败: ${error.message || "请稍后重试"}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  let touchTimer: NodeJS.Timeout;
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchTimer = setTimeout(() => {
      handleDeleteNote(e, id);
    }, 800);
  };
  const handleTouchEnd = () => {
    clearTimeout(touchTimer);
  };

  const renderCard = (card: Card) => {
    const isLiked = likedNotes.includes(card.id);
    const style = card.styleConfig;

    const getDecoration = () => {
      if (style?.layoutType === 'blue-dot') {
        return <div className="absolute top-6 left-5 w-2 h-2 bg-blue-500 rounded-full"></div>;
      }
      if (!style?.decoration || style.decoration === 'none') return null;
      switch (style.decoration) {
        case 'sticker-star': return <div className="sticker bg-yellow-400 text-white text-[10px] font-bold">★</div>;
        case 'sticker-heart': return <div className="sticker bg-red-400 text-white text-[10px] font-bold">❤</div>;
        case 'sticker-flower': return <div className="sticker bg-pink-400 text-white text-[10px] font-bold">✿</div>;
        case 'line-top': return <div className="absolute top-0 left-0 right-0 h-1 bg-current opacity-20"></div>;
        case 'line-bottom': return <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20"></div>;
        case 'quote-mark': return <div className="absolute top-2 left-2 text-4xl opacity-10 font-serif">“</div>;
        default: return null;
      }
    };

    const getLayoutClasses = () => {
      if (!style) return '';
      switch (style.layoutType) {
        case 'centered': return 'text-center flex flex-col items-center justify-center';
        case 'poster': return 'note-poster';
        case 'card': return 'note-card';
        case 'handwritten': return 'note-handwritten';
        case 'notebook': return 'bg-notebook-lines';
        case 'bordered': return 'border-2';
        case 'left-border': return 'border-l-4 border-l-gray-300 border-y-0 border-r-0 rounded-none shadow-none';
        case 'blue-dot': return 'pt-8';
        default: return '';
      }
    };

    const containerClasses = `rounded-xl overflow-hidden shadow-sm border cursor-pointer relative transition-transform hover:scale-[1.02] ${style?.backgroundColor || 'bg-white'} ${style?.layoutType === 'left-border' ? 'border-l-4 border-l-gray-300 border-y-0 border-r-0 rounded-none shadow-none' : (style?.borderColor || 'border-gray-100')} ${getLayoutClasses()}`;
    const contentClasses = `p-3 sm:p-5 min-h-[140px] sm:min-h-[160px] flex flex-col justify-center ${style?.fontFamily || 'font-serif'} ${style?.textColor || 'text-gray-800'}`;

    return (
      <article 
        key={card.id} 
        onClick={() => navigate(`/feed/${card.id}`)} 
        onContextMenu={(e) => handleDeleteNote(e, card.id)}
        onTouchStart={(e) => handleTouchStart(e, card.id)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className={containerClasses}
      >
        {getDecoration()}
        <div className={contentClasses}>
          <h2 className="text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: card.content }} />
          <div className="mt-3 sm:mt-4 flex flex-col opacity-60">
            <span className="text-[10px] font-medium">《{card.bookTitle}》</span>
            <span className="text-[10px]">{card.author}</span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans relative">
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-50">
        <button className="p-2 -ml-2 text-slate-600 opacity-0 cursor-default"><Settings size={20} /></button>
        <h1 className="text-base font-bold text-gray-900">Discovery</h1>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`p-2 -mr-2 text-slate-600 hover:text-gray-900 transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </header>
      <main className="p-3">
        <div className="flex gap-3 items-start">
          <div className="flex-1 flex flex-col gap-3">
            {leftColumn.map(renderCard)}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {rightColumn.map(renderCard)}
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto pointer-events-none z-40">
        <div className="absolute right-6 bottom-0 pointer-events-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">发布新笔记</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">文案内容</label>
                <textarea 
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none h-32"
                  placeholder="写下你的感悟..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">书名 (选填)</label>
                <input 
                  type="text"
                  value={newNoteBook}
                  onChange={(e) => setNewNoteBook(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  placeholder="例如：百年孤独"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作者 (选填)</label>
                <input 
                  type="text"
                  value={newNoteAuthor}
                  onChange={(e) => setNewNoteAuthor(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                  placeholder="例如：马尔克斯"
                />
              </div>
              <button 
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
                className="w-full bg-black text-white rounded-lg py-3 font-medium disabled:opacity-50"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {noteToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
            <h2 className="text-lg font-bold mb-4 text-center">确定要删除这条笔记吗？</h2>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setNoteToDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 font-medium"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white rounded-lg py-3 font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-gray-100 flex justify-around items-center py-1 z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
        <button className="flex flex-col items-center text-black"><Home size={20} /><span className="text-[10px] mt-0.5 font-bold">Discovery</span></button>
        <button onClick={() => navigate('/library')} className="flex flex-col items-center text-gray-400"><Book size={20} /><span className="text-[10px] mt-0.5">Library</span></button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center text-gray-400"><User size={20} /><span className="text-[10px] mt-0.5">Profile</span></button>
      </nav>
    </div>
  );
}
