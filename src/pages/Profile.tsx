import React, { useState, useEffect } from 'react';
import { Settings, Bell, Home, Book, User, CloudDownload, Save, Plus, MessageSquare, Heart, SlidersHorizontal, Info, LogOut, ChevronRight, Trash2, ArrowLeft, Edit3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export default function Profile() {
  const navigate = useNavigate();
  
  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem('userAvatar') || null;
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || 'Alex Reader';
  });

  useEffect(() => {
    if (avatar) {
      localStorage.setItem('userAvatar', avatar);
    }
  }, [avatar]);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  const [configs, setConfigs] = useState<ApiConfig[]>(() => {
    const saved = localStorage.getItem('apiConfigs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved configs', e);
      }
    }
    return [{ id: '1', name: '默认配置', baseUrl: 'https://api.openai.com', apiKey: '', model: '' }];
  });
  const [activeTabId, setActiveTabId] = useState<string>(configs[0]?.id || '1');
  const [draftConfig, setDraftConfig] = useState<ApiConfig>(configs[0] || { id: '1', name: '默认配置', baseUrl: 'https://api.openai.com', apiKey: '', model: '' });
  const [models, setModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeSection = searchParams.get('section') || 'main';
  const likesTab = searchParams.get('tab') || 'notes';

  const setActiveSection = (section: string) => {
    if (section === 'main') {
      navigate('/profile');
    } else {
      navigate(`/profile?section=${section}`);
    }
  };

  const setLikesTab = (tab: string) => {
    navigate(`/profile?section=likes&tab=${tab}`, { replace: true });
  };

  const [isApiExpanded, setIsApiExpanded] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState({ books: 0, insights: 0, days: 0 });

  useEffect(() => {
    const books = JSON.parse(localStorage.getItem('libraryBooks') || '[]');
    const notes = JSON.parse(localStorage.getItem('myNotes') || '[]');
    
    let firstUse = localStorage.getItem('firstUseDate');
    if (!firstUse) {
      firstUse = new Date().toISOString();
      localStorage.setItem('firstUseDate', firstUse);
    }
    
    const days = Math.max(1, Math.ceil((new Date().getTime() - new Date(firstUse).getTime()) / (1000 * 3600 * 24)));
    
    setStats({
      books: books.length,
      insights: notes.length,
      days: days
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('apiConfigs', JSON.stringify(configs));
  }, [configs]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
    const config = configs.find(c => c.id === id);
    if (config) {
      setDraftConfig(config);
      setModels(config.model ? [config.model] : []);
    }
  };

  const handleAddConfig = () => {
    const newId = Date.now().toString();
    setActiveTabId(newId);
    setDraftConfig({ id: newId, name: '新配置', baseUrl: 'https://api.openai.com', apiKey: '', model: '' });
    setModels([]);
  };

  const handleSave = () => {
    if (!draftConfig.name.trim()) {
      alert('请输入配置名称');
      return;
    }
    if (!draftConfig.baseUrl || !draftConfig.apiKey || !draftConfig.model) {
      alert('请确保 Base URL、API Key 和 模型名称 都已填写完整');
      return;
    }
    
    const existingIndex = configs.findIndex(c => c.id === draftConfig.id);
    if (existingIndex >= 0) {
      const newConfigs = [...configs];
      newConfigs[existingIndex] = draftConfig;
      setConfigs(newConfigs);
    } else {
      setConfigs([...configs, draftConfig]);
    }
    alert('该配置已保存并应用');
  };

  const handleDelete = () => {
    if (configs.length <= 1 || draftConfig.id === configs[0].id) {
      alert('基础配置不可删除');
      return;
    }
    const newConfigs = configs.filter(c => c.id !== draftConfig.id);
    setConfigs(newConfigs);
    setActiveTabId(newConfigs[0].id);
    setDraftConfig(newConfigs[0]);
  };

  const fetchModels = async () => {
    if (!draftConfig.baseUrl || !draftConfig.apiKey) {
      alert('请先填写 Base URL 和 API Key');
      return;
    }
    setIsFetching(true);
    try {
      let baseUrl = draftConfig.baseUrl.trim().replace(/\/+$/, '');
      const url = `${baseUrl}/models`;
      
      let res;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${draftConfig.apiKey.trim()}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (fetchErr: any) {
        throw new Error(`网络请求失败 (${fetchErr.message})。\n\n可能原因：\n1. 跨域拦截(CORS)：该第三方 API 不允许在浏览器前端直接调用。\n2. URL 无法访问或网络不通。`);
      }
      
      if (!res.ok) {
        let errText = '';
        try { errText = await res.text(); } catch (e) {}
        let specificReason = '';
        if (res.status === 401) specificReason = 'API Key 不正确、已过期或无权限';
        else if (res.status === 404) specificReason = '找不到该接口，请检查 Base URL 是否完整';
        else specificReason = '服务器返回错误';
        
        throw new Error(`HTTP ${res.status} (${specificReason})\n附加信息: ${errText.substring(0, 100)}`);
      }
      
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`服务器返回了网页(HTML)而不是接口数据。\n\n这说明你填写的 Base URL 指向了网站首页，而不是 API 接口。\n\n💡 强烈建议：请在你的 Base URL 末尾加上 /v1 试试！\n(即改为: ${baseUrl}/v1)`);
      }

      if (data && data.data && Array.isArray(data.data)) {
        const fetchedModels = data.data.map((m: any) => m.id);
        setModels(fetchedModels);
        if (fetchedModels.length > 0) {
          setDraftConfig({ ...draftConfig, baseUrl, model: fetchedModels[0] });
        }
        alert('拉取模型成功！');
      } else {
        throw new Error('接口返回的数据格式不符合 OpenAI 规范 (缺少 data 数组)');
      }
    } catch (err: any) {
      alert(`【拉取失败】\n\n原因: ${err.message}\n\n当前请求的完整 URL: ${draftConfig.baseUrl.trim().replace(/\/+$/, '')}/models`);
      setModels([]); 
    } finally {
      setIsFetching(false);
    }
  };

  let touchTimer: NodeJS.Timeout;
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchTimer = setTimeout(() => {
      setNoteToDelete(id);
    }, 800);
  };
  const handleTouchEnd = () => {
    clearTimeout(touchTimer);
  };
  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDeleteNote = () => {
    if (noteToDelete) {
      const myNotes = JSON.parse(localStorage.getItem('myNotes') || '[]');
      const updatedCustomCards = myNotes.filter((c: any) => c.id !== noteToDelete);
      localStorage.setItem('myNotes', JSON.stringify(updatedCustomCards));

      const likedNotes = JSON.parse(localStorage.getItem('likedNotes') || '[]');
      const updatedLikedNotes = likedNotes.filter((id: string) => id !== noteToDelete);
      localStorage.setItem('likedNotes', JSON.stringify(updatedLikedNotes));

      const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
      const updatedLikedNotesData = likedNotesData.filter((c: any) => c.id !== noteToDelete);
      localStorage.setItem('likedNotesData', JSON.stringify(updatedLikedNotesData));

      const deletedNotes = JSON.parse(localStorage.getItem('deletedNotes') || '[]');
      const newDeleted = [...deletedNotes, noteToDelete];
      localStorage.setItem('deletedNotes', JSON.stringify(newDeleted));
      
      setNoteToDelete(null);
    }
  };

  if (activeSection === 'notes') {
    const myNotes = JSON.parse(localStorage.getItem('myNotes') || '[]');
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans">
        <header className="flex items-center px-4 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-10">
          <button onClick={() => setActiveSection('main')} className="p-2 -ml-2 text-slate-600"><ArrowLeft size={20} /></button>
          <h1 className="text-base font-bold text-gray-900 ml-2">My Notes</h1>
        </header>
        <div className="p-4 space-y-4">
          {myNotes.map((note: any) => (
            <div 
              key={note.id} 
              onClick={() => navigate(`/feed/${note.id}`)} 
              onContextMenu={(e) => handleContextMenu(e, note.id)}
              onTouchStart={(e) => handleTouchStart(e, note.id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer relative transition-transform hover:scale-[1.02]"
            >
              <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: note.content }}></p>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{note.date}</span>
                <span>《{note.bookTitle}》</span>
              </div>
            </div>
          ))}
          {myNotes.length === 0 && <p className="text-center text-gray-500 mt-10 text-sm">暂无笔记</p>}
        </div>

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
                  onClick={confirmDeleteNote}
                  className="flex-1 bg-red-500 text-white rounded-lg py-3 font-medium"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'comments') {
    const myComments = JSON.parse(localStorage.getItem('myComments') || '[]');
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans">
        <header className="flex items-center px-4 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-10">
          <button onClick={() => setActiveSection('main')} className="p-2 -ml-2 text-slate-600"><ArrowLeft size={20} /></button>
          <h1 className="text-base font-bold text-gray-900 ml-2">My Comments</h1>
        </header>
        <div className="p-4 space-y-4">
          {myComments.map((item: any, i: number) => (
            <div key={i} onClick={() => navigate(`/feed/${item.noteId}`)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer">
              <p className="text-sm text-gray-800 mb-2">{item.comment.content}</p>
              <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-500 mb-2 truncate">
                来自笔记: {item.noteTitle}
              </div>
              <div className="text-[10px] text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {myComments.length === 0 && <p className="text-center text-gray-500 mt-10 text-sm">暂无评论</p>}
        </div>
      </div>
    );
  }

  if (activeSection === 'likes') {
    const likedNotesData = JSON.parse(localStorage.getItem('likedNotesData') || '[]');
    const likedComments = JSON.parse(localStorage.getItem('likedComments') || '[]');
    
    const allLikes = [
      ...likedNotesData.map((n: any) => ({ type: 'note', data: n, time: n.likedAt || 0 })),
      ...likedComments.map((c: any) => ({ type: 'comment', data: c, time: c.likedAt || 0 }))
    ].sort((a, b) => b.time - a.time);

    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans">
        <header className="flex items-center px-4 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-10">
          <button onClick={() => setActiveSection('main')} className="p-2 -ml-2 text-slate-600"><ArrowLeft size={20} /></button>
          <h1 className="text-base font-bold text-gray-900 ml-2">My Likes</h1>
        </header>

        <div className="px-4 py-2">
          <div className="flex gap-4 border-b border-gray-200">
            <button 
              onClick={() => setLikesTab('notes')}
              className={`pb-2 text-sm font-medium ${likesTab === 'notes' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500'}`}
            >
              笔记
            </button>
            <button 
              onClick={() => setLikesTab('comments')}
              className={`pb-2 text-sm font-medium ${likesTab === 'comments' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500'}`}
            >
              评论
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {allLikes.filter(item => item.type === (likesTab === 'notes' ? 'note' : 'comment')).map((item: any, i: number) => {
            if (item.type === 'note') {
              return (
                <div key={i} onClick={() => navigate(`/feed/${item.data.id}`)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">笔记</span>
                  </div>
                  <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.data.content }}></p>
                  <div className="text-xs text-gray-400 flex justify-between">
                    <span>《{item.data.bookTitle}》</span>
                    <span>{new Date(item.time).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={i} onClick={() => navigate(`/feed/${item.data.noteId}`)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded border border-pink-100">评论</span>
                    <span className="text-xs font-bold text-gray-700">{item.data.comment.userName}</span>
                  </div>
                  <p className="text-sm text-gray-800 mb-2">{item.data.comment.content}</p>
                  <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-500 mb-2 truncate">
                    来自笔记: {item.data.noteTitle}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(item.time).toLocaleDateString()}
                  </div>
                </div>
              );
            }
          })}
          {allLikes.filter(item => item.type === (likesTab === 'notes' ? 'note' : 'comment')).length === 0 && <p className="text-center text-gray-500 mt-10 text-sm">暂无点赞</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans">
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-10">
        <button className="p-2 -ml-2 text-slate-600"><Settings size={20} /></button>
        <h1 className="text-base font-bold text-gray-900">Profile</h1>
        <button className="p-2 -mr-2 text-slate-600"><Bell size={20} /></button>
      </header>

      <section className="px-6 py-6 flex flex-col items-center">
        <label htmlFor="avatar-upload" className="relative cursor-pointer block">
          <div className="size-24 rounded-full bg-[#e8cba8] flex items-center justify-center overflow-hidden border-4 border-[#f8f9fa] shadow-sm">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white mt-4" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-gray-800 text-white rounded-full p-1.5 border-2 border-[#f8f9fa]">
            <Settings size={12} />
          </div>
          <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>
        
        <input 
          type="text" 
          value={userName} 
          onChange={(e) => setUserName(e.target.value)} 
          className="mt-4 text-xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 text-center p-0 w-full"
        />
        
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">Registered User</span>
        </div>
      </section>
      
      <section className="px-6 mb-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <span className="text-xl font-bold text-gray-900">{stats.books}</span>
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-1">Books Read</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <span className="text-xl font-bold text-gray-900">{stats.insights}</span>
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-1">Insights</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <span className="text-xl font-bold text-gray-900">{stats.days}</span>
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-1">Days</span>
          </div>
        </div>
      </section>

      <section className="px-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <button 
            onClick={() => setIsApiExpanded(!isApiExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-[14px] font-bold text-gray-900">API配置</h3>
            <ChevronRight size={18} className={`text-gray-400 transition-transform duration-200 ${isApiExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isApiExpanded && (
            <div className="mt-6">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6">
                {configs.map(config => (
                  <button 
                    key={config.id}
                    onClick={() => handleTabClick(config.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border ${activeTabId === config.id ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    {activeTabId === config.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    {config.name}
                  </button>
                ))}
                <button onClick={handleAddConfig} className="flex-shrink-0 size-8 flex items-center justify-center border border-dashed border-gray-300 rounded-full text-gray-400 hover:bg-gray-50">
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-gray-900">配置名称</label>
                  <input 
                    className="w-full bg-[#f5f5f5] border-none rounded-xl px-4 py-3 text-sm focus:ring-0 text-gray-800" 
                    type="text" 
                    value={draftConfig.name} 
                    onChange={e => setDraftConfig({...draftConfig, name: e.target.value})} 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-gray-900">API Endpoint (Base URL)</label>
                  <input 
                    className="w-full bg-[#f5f5f5] border-none rounded-xl px-4 py-3 text-sm focus:ring-0 text-gray-800" 
                    type="text" 
                    value={draftConfig.baseUrl} 
                    onChange={e => setDraftConfig({...draftConfig, baseUrl: e.target.value})} 
                    placeholder="例如: https://api.openai.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-gray-900">API Key</label>
                  <input 
                    className="w-full bg-[#f5f5f5] border-none rounded-xl px-4 py-3 text-sm focus:ring-0 text-gray-800" 
                    type="password" 
                    value={draftConfig.apiKey} 
                    onChange={e => setDraftConfig({...draftConfig, apiKey: e.target.value})} 
                    placeholder="输入你的 API Key" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-gray-900">模型名称</label>
                  {models.length > 0 ? (
                    <select 
                      className="w-full bg-[#f5f5f5] border-none rounded-xl px-4 py-3 text-sm focus:ring-0 text-gray-800 appearance-none"
                      value={draftConfig.model}
                      onChange={e => setDraftConfig({...draftConfig, model: e.target.value})}
                    >
                      <option value="" disabled>请选择模型</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input 
                      className="w-full bg-[#f5f5f5] border-none rounded-xl px-4 py-3 text-sm focus:ring-0 text-gray-800" 
                      type="text" 
                      value={draftConfig.model} 
                      onChange={e => setDraftConfig({...draftConfig, model: e.target.value})} 
                      placeholder="点击上方按钮拉取，或手动输入" 
                    />
                  )}
                </div>
                <button 
                  onClick={fetchModels} 
                  disabled={isFetching} 
                  className="w-full mt-2 bg-[#0a0a0a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                >
                  <CloudDownload size={16} />
                  {isFetching ? '拉取中...' : '拉取并更新模型列表'}
                </button>
                
                <div className="flex justify-center items-center mt-6 gap-3">
                  {configs.length > 1 && draftConfig.id !== configs[0].id && (
                    <button 
                      onClick={handleDelete} 
                      className="flex items-center justify-center size-12 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={handleSave} 
                    className="flex-1 flex items-center justify-center gap-2 bg-[#4a5568] text-white py-3.5 rounded-xl text-sm font-bold"
                  >
                    <Save size={16} />
                    保存生效
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 mb-8">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Activity & Community</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => setActiveSection('notes')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <Edit3 size={18} className="text-gray-700" />
              <span className="text-sm font-medium">My Notes</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button onClick={() => setActiveSection('comments')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <MessageSquare size={18} className="text-gray-700 fill-gray-700" />
              <span className="text-sm font-medium">My Comments</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button onClick={() => setActiveSection('likes')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <Heart size={18} className="text-gray-700 fill-gray-700" />
              <span className="text-sm font-medium">My Likes</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </section>

      <section className="px-6 mb-8">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">App Settings</h3>
        <div className="space-y-1">
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <SlidersHorizontal size={18} />
              <span className="text-sm font-medium">Reading Preferences</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <Info size={18} />
              <span className="text-sm font-medium">About Discovery</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-xl transition-colors mt-2">
            <div className="flex items-center gap-3 text-red-500">
              <LogOut size={18} />
              <span className="text-sm font-medium">Log Out</span>
            </div>
          </button>
        </div>
      </section>
      
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around items-center py-2 z-50">
        <button onClick={() => navigate('/')} className="flex flex-col items-center text-gray-400"><Home size={24} /><span className="text-[11px] mt-1">Discovery</span></button>
        <button onClick={() => navigate('/library')} className="flex flex-col items-center text-gray-400"><Book size={24} /><span className="text-[11px] mt-1">Library</span></button>
        <button className="flex flex-col items-center text-black"><User size={24} /><span className="text-[11px] mt-1 font-bold">Profile</span></button>
      </nav>
    </div>
  );
}
