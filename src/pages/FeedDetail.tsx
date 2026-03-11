import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical, Heart, MessageCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Comment, Card } from '../types';
import { mockCards } from './DiscoveryFeed';

const randomNames = ['读书爱好者', '夜猫子', '早起鸟', '思考者', '流浪的猫', '安静的角落', '风中的叶子', '星空漫步', '文字搬运工', '时间旅行者', '书海拾贝', '梦境边缘'];
const randomAvatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Chase',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
];

const specificComments: Record<string, string[]> = {};

const genericComments: string[] = [];

function formatTimestamp(ts: string): string {
  if (!ts) return '刚刚';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts; // fallback for old string formats like '刚刚'
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) {
    return `${Math.max(1, diffMins)}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

function generateInitialComments(cardId: string): Comment[] {
  return [];
}

export default function FeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isNoteLiked, setIsNoteLiked] = useState(() => {
    const likedNotes = JSON.parse(localStorage.getItem('likedNotes') || '[]');
    return likedNotes.includes(id);
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const toggleLikeNote = () => {
    if (!card) return;
    const likedNotes = JSON.parse(localStorage.getItem('likedNotes') || '[]');
    const isLiked = likedNotes.includes(card.id);
    let newLikes;
    if (isLiked) {
      newLikes = likedNotes.filter((noteId: string) => noteId !== card.id);
      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      localStorage.setItem('likedNotesData', JSON.stringify(likedNotesData.filter((c: Card) => c.id !== card.id)));
    } else {
      newLikes = [...likedNotes, card.id];
      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      if (!likedNotesData.find((c: Card) => c.id === card.id)) {
         localStorage.setItem('likedNotesData', JSON.stringify([{...card, likedAt: Date.now()}, ...likedNotesData]));
      }
    }
    setIsNoteLiked(!isLiked);
    localStorage.setItem('likedNotes', JSON.stringify(newLikes));
  };

  const card = React.useMemo(() => {
    const customCards = JSON.parse(localStorage.getItem('myNotes') || '[]');
    const aiNotes = JSON.parse(localStorage.getItem('aiNotes') || '[]');
    const allCards = [...customCards, ...aiNotes, ...mockCards];
    return allCards.find((c: Card) => c.id === id);
  }, [id]);

  useEffect(() => {
    if (id && card) {
      const savedComments = localStorage.getItem(`feed_comments_${id}`);
      if (savedComments) {
        try {
          setComments(JSON.parse(savedComments));
        } catch (e) {
          console.error('Failed to parse comments', e);
          setComments(generateInitialComments(id));
        }
      } else {
        const initial = generateInitialComments(id);
        setComments(initial);
        localStorage.setItem(`feed_comments_${id}`, JSON.stringify(initial));
      }
    }
  }, [id, card]);

  useEffect(() => {
    if (id && comments.length > 0) {
      localStorage.setItem(`feed_comments_${id}`, JSON.stringify(comments));
    }
  }, [comments, id]);

  if (!card) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white text-notion-text flex flex-col items-center justify-center">
        <p>笔记不存在</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">返回</button>
      </div>
    );
  }

  const handleSend = () => {
    if (!commentText.trim()) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: 'me',
      userName: localStorage.getItem('userName') || 'Alex Reader',
      avatar: localStorage.getItem('userAvatar') || randomAvatars[0],
      content: commentText,
      isAI: false,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      replies: []
    };

    if (replyingTo) {
      setComments(prev => prev.map(c => {
        if (c.id === replyingTo.id) {
          return {
            ...c,
            replies: [...(c.replies || []), newComment]
          };
        }
        return c;
      }));
      setReplyingTo(null);
    } else {
      setComments(prev => [newComment, ...prev]);
    }
    setCommentText('');

    const myComments = JSON.parse(localStorage.getItem('myComments') || '[]');
    myComments.unshift({
      noteId: card.id,
      noteTitle: card.bookTitle || card.content.substring(0, 20),
      comment: newComment,
      createdAt: Date.now()
    });
    localStorage.setItem('myComments', JSON.stringify(myComments));
  };

  const toggleLike = (commentId: string, isReply: boolean = false, parentId?: string) => {
    let targetComment: Comment | undefined;
    
    setComments(prev => prev.map(c => {
      if (!isReply && c.id === commentId) {
        const isLiked = !c.isLiked;
        const updated = { ...c, isLiked, likes: (c.likes || 0) + (isLiked ? 1 : -1) };
        targetComment = updated;
        return updated;
      }
      if (isReply && parentId && c.id === parentId) {
        return {
          ...c,
          replies: c.replies?.map(r => {
            if (r.id === commentId) {
              const isLiked = !r.isLiked;
              const updated = { ...r, isLiked, likes: (r.likes || 0) + (isLiked ? 1 : -1) };
              targetComment = updated;
              return updated;
            }
            return r;
          })
        };
      }
      return c;
    }));

    setTimeout(() => {
      if (targetComment) {
        let likedComments = JSON.parse(localStorage.getItem('likedComments') || '[]');
        if (targetComment.isLiked) {
          if (!likedComments.find((item: any) => item.comment.id === targetComment!.id)) {
            likedComments.unshift({
              noteId: card.id,
              noteTitle: card.bookTitle || card.content.substring(0, 20),
              comment: targetComment,
              likedAt: Date.now()
            });
          }
        } else {
          likedComments = likedComments.filter((item: any) => item.comment.id !== targetComment!.id);
        }
        localStorage.setItem('likedComments', JSON.stringify(likedComments));
      }
    }, 0);
  };

  const handleGenerateComments = async () => {
    if (isGenerating) return;
    
    const savedConfigs = localStorage.getItem('apiConfigs');
    if (!savedConfigs) {
      alert('请先在 Profile 页面配置 API');
      return;
    }
    
    const configs = JSON.parse(savedConfigs);
    const config = configs[0];
    if (!config || !config.baseUrl || !config.apiKey || !config.model) {
      alert('API 配置不完整，请前往 Profile 页面配置');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `
请作为数据生成器，基于以下输入文本生成 5 到 10 条模拟社交媒体评论数据。
输入文本：
"${card.content}"

要求：
1. 评论风格多样，语气自然。
2. 必须以 JSON 数组格式返回，每个对象包含两个字段：
   - userName: 随机生成的中文昵称
   - content: 评论的具体内容
3. 严禁返回任何 JSON 以外的文字、说明或 Markdown 标记。
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
          temperature: 0.8
        })
      });

      if (!res.ok) throw new Error('API 请求失败');
      const data = await res.json();
      const content = data.choices[0].message.content;
      
      // 改进解析机制
      let cleanedContent = content.trim();
      
      // 1. 移除 Markdown 标记
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // 2. 尝试寻找第一个 '[' 和最后一个 ']' 之间的内容
      const firstBracket = cleanedContent.indexOf('[');
      const lastBracket = cleanedContent.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        cleanedContent = cleanedContent.substring(firstBracket, lastBracket + 1);
      } else {
        // 如果找不到方括号，尝试寻找第一个 '{' 和最后一个 '}'
        const firstBrace = cleanedContent.indexOf('{');
        const lastBrace = cleanedContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
          // 如果是单个对象，包装成数组
          if (!cleanedContent.trim().startsWith('[')) {
            cleanedContent = `[${cleanedContent}]`;
          }
        }
      }
      
      // 3. 移除 JSON 中常见的末尾逗号
      cleanedContent = cleanedContent.replace(/,\s*([\]}])/g, '$1');
      
      let parsed;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (e) {
        console.error('Failed to parse JSON:', e, 'Cleaned content:', cleanedContent);
        throw new Error('大模型返回格式错误，无法解析为 JSON 数组');
      }

      const newCommentsList = Array.isArray(parsed) ? parsed : (parsed.comments || []);
      
      const newComments: Comment[] = newCommentsList.map((c: any, index: number) => ({
        id: `gen_${Date.now()}_${index}`,
        userId: `gen_user_${Date.now()}_${index}`,
        userName: c.userName || randomNames[Math.floor(Math.random() * randomNames.length)],
        avatar: randomAvatars[Math.floor(Math.random() * randomAvatars.length)],
        content: c.content,
        isAI: true,
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 10),
        isLiked: false,
        replies: []
      }));

      setComments(prev => [...newComments, ...prev]);
    } catch (err: any) {
      alert(`生成评论失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCardContent = () => {
    const style = card.styleConfig;
    
    const getDecoration = () => {
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
        default: return '';
      }
    };

    const containerClass = `p-8 rounded-2xl border shadow-sm mb-6 relative ${style?.backgroundColor || 'bg-white'} ${style?.borderColor || 'border-gray-100'} ${getLayoutClasses()}`;
    const textClass = `text-xl font-bold leading-relaxed ${style?.fontFamily || 'font-serif'} ${style?.textColor || 'text-gray-800'}`;
    
    return (
      <div className={containerClass}>
        {getDecoration()}
        <h2 className={textClass} dangerouslySetInnerHTML={{ __html: card.content }} />
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white text-notion-text flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-bold tracking-tight">笔记详情</h1>
        <button 
          onClick={toggleLikeNote}
          className={`p-2 -mr-2 transition-colors ${isNoteLiked ? 'text-red-500' : 'text-slate-600'}`}
        >
          <Heart size={20} className={isNoteLiked ? 'fill-current' : ''} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="p-6 border-b border-gray-100">
          {renderCardContent()}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>《{card.bookTitle}》 {card.chapter ? `· ${card.chapter}` : ''}</span>
            <span>{card.author}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold flex items-center gap-2">
              共 {comments.length} 条评论
            </h3>
            <button 
              onClick={handleGenerateComments}
              disabled={isGenerating}
              className="flex items-center gap-1 text-xs text-blue-600 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? '生成中...' : '刷新评论'}
            </button>
          </div>
          
          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                  {comment.avatar ? (
                    <img src={comment.avatar} alt={comment.userName} className="w-full h-full object-cover" />
                  ) : (
                    comment.userName.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700">{comment.userName}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed mb-2">{comment.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatTimestamp(comment.timestamp)}</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleLike(comment.id)}
                        className={`flex items-center gap-1 hover:text-gray-600 ${comment.isLiked ? 'text-red-500' : ''}`}
                      >
                        <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} /> 
                        {comment.likes || '赞'}
                      </button>
                      <button 
                        onClick={() => setReplyingTo(comment)}
                        className="flex items-center gap-1 hover:text-gray-600"
                      >
                        <MessageCircle size={14} /> 回复
                      </button>
                    </div>
                  </div>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                            {reply.avatar ? (
                              <img src={reply.avatar} alt={reply.userName} className="w-full h-full object-cover" />
                            ) : (
                              reply.userName.charAt(0)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-gray-700">{reply.userName}</span>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed mb-1">{reply.content}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{formatTimestamp(reply.timestamp)}</span>
                              <button 
                                onClick={() => toggleLike(reply.id, true, comment.id)}
                                className={`flex items-center gap-1 hover:text-gray-600 ${reply.isLiked ? 'text-red-500' : ''}`}
                              >
                                <Heart size={12} className={reply.isLiked ? 'fill-current' : ''} /> 
                                {reply.likes || '赞'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-3 flex flex-col gap-2 z-50">
        {replyingTo && (
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md">
            <span>回复 @{replyingTo.userName}</span>
            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">取消</button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={replyingTo ? `回复 @${replyingTo.userName}...` : "说点什么..."}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gray-300"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!commentText.trim()}
            className="p-2 bg-black text-white rounded-full disabled:opacity-50 disabled:bg-gray-300"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
