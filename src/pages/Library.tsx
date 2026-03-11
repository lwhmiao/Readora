import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Book, User, Home, RefreshCw, Edit2, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Book as BookType } from '../types';
import { set, del } from 'idb-keyval';

export const mockBooks: BookType[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop',
    format: 'TXT',
    content: `Chapter 1

In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since.

‘Whenever you feel like criticizing any one,’ he told me, ‘just remember that all the people in this world haven’t had the advantages that you’ve had.’

He didn’t say any more but we’ve always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence I’m inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores. The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men. Most of the confidences were unsought—frequently I have feigned sleep,preoccupation, or a hostile levity when I realized by some unmistakable sign that an intimate revelation was quivering on the horizon—for the intimate revelations of young men or at least the terms in which they express them are usually plagiaristic and marred by obvious suppressions. Reserving judgments is a matter of infinite hope. I am still a little afraid of missing something if I forget that, as my father snobbishly suggested, and I snobbishly repeat a sense of the fundamental decencies is parcelled out unequally at birth.

And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes but after a certain point I don’t care what it’s founded on. When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever; I wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction—Gatsby who represented everything for which I have an unafected scorn. If personality is an unbroken series of successful gestures, then there was something gorgeous about him, some heightened sensitivity to the promises of life, as if he were related to one of those intricate machines that register earthquakes ten thousand miles away. This responsiveness had nothing to do with that flabby impressionability which is dignified under the name of the ‘creative temperament’—it was an extraordinary gift for hope, a romantic readiness such as I have never found in any other person and which it is not likely I shall ever find again. No—Gatsby turned out all right at the end; it is what preyed on Gatsby, what foul dust floated in the wake of his dreams that temporarily closed out my interest in the abortive sorrows and short winded elations of men.`
  }
];

const MORANDI_BGS = ['#EAE6D9', '#D5DADD', '#E2D4D0', '#D1D5D0', '#F0EFEB', '#2C302E', '#E6E2DD', '#BDB8AD'];
const MORANDI_SHAPES = ['#DDA7A5', '#9EABC0', '#8F9A8D', '#E5C185', '#7A8B99', '#B5A397', '#4A4E4D', '#FFFFFF', '#E8B4B8', '#67787B'];

function generateCoverConfig() {
  const bg = MORANDI_BGS[Math.floor(Math.random() * MORANDI_BGS.length)];
  const isDarkBg = bg === '#2C302E' || bg === '#4A4E4D';
  const textColor = isDarkBg ? '#FFFFFF' : '#2C302E';
  
  const shapes = [];
  const numShapes = Math.floor(Math.random() * 3) + 2; // 2 to 4 shapes
  
  for (let i=0; i<numShapes; i++) {
    const type = ['circle', 'rect', 'ellipse', 'line'][Math.floor(Math.random() * 4)];
    const color = MORANDI_SHAPES[Math.floor(Math.random() * MORANDI_SHAPES.length)];
    const size1 = Math.floor(Math.random() * 150) + 40;
    const size2 = Math.floor(Math.random() * 150) + 40;
    
    const top = Math.floor(Math.random() * 120) - 10;
    const left = Math.floor(Math.random() * 120) - 10;
    
    shapes.push({ type, color, size1, size2, top: `${top}%`, left: `${left}%` });
  }
  
  const texture = ['none', 'grid', 'paper'][Math.floor(Math.random() * 3)];
  
  return JSON.stringify({ bg, textColor, shapes, texture });
}

export default function Library() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookType[]>(() => {
    const saved = localStorage.getItem('libraryBooks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Replace the old EPUB mock book with the new TXT mock book
        return parsed.map((b: BookType) => b.id === '1' && b.format === 'EPUB' ? mockBooks[0] : b);
      } catch (e) {
        console.error('Failed to parse saved books', e);
      }
    }
    return mockBooks;
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{ bookId: string, x: number, y: number } | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleTouchStart = (e: React.TouchEvent, bookId: string) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ bookId, x: touch.clientX, y: touch.clientY });
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, bookId: string) => {
    e.preventDefault();
    setContextMenu({ bookId, x: e.clientX, y: e.clientY });
  };

  const handleRefreshCover = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    setBooks(books.map(b => b.id === bookId ? { ...b, coverStyle: generateCoverConfig() } : b));
  };

  const startRename = (e: React.MouseEvent, book: BookType) => {
    e.stopPropagation();
    setEditingBookId(book.id);
    setEditTitle(book.title);
    setContextMenu(null);
  };

  const startRenameAuthor = (e: React.MouseEvent, book: BookType) => {
    e.stopPropagation();
    setEditingAuthorId(book.id);
    setEditAuthor(book.author);
    setContextMenu(null);
  };

  const handleRenameSubmit = (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      setBooks(books.map(b => b.id === bookId ? { ...b, title: editTitle.trim() } : b));
    }
    setEditingBookId(null);
  };

  const handleRenameAuthorSubmit = (e: React.FormEvent, bookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editAuthor.trim()) {
      setBooks(books.map(b => b.id === bookId ? { ...b, author: editAuthor.trim() } : b));
    }
    setEditingAuthorId(null);
  };

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    setBooks(books.filter(b => b.id !== bookId));
    setContextMenu(null);
    try {
      await del(`book_file_${bookId}`);
    } catch (err) {
      console.error('Failed to delete book file from IDB', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('libraryBooks', JSON.stringify(books));
  }, [books]);

      const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      
      // Parse title and author
      let title = file.name.replace(/\.[^/.]+$/, "");
      let author = 'Unknown Author';
      
      const parts = title.split('-');
      if (parts.length >= 2) {
        title = parts[0].trim();
        author = parts[1].trim().split(' ')[0]; // Take only the name part before space
      }
      
      const randomStyle = generateCoverConfig();
      const newBookId = Date.now().toString();
      
      try {
        // Save the actual file to IndexedDB
        await set(`book_file_${newBookId}`, file);
        
        const newBook: BookType = {
          id: newBookId,
          title: title,
          author: author,
          coverUrl: '',
          coverStyle: randomStyle,
          format: extension as 'EPUB' | 'PDF' | 'TXT',
          currentPage: 1,
          totalPages: 1
        };
        
        if (extension === 'TXT') {
          const reader = new FileReader();
          reader.onload = (event) => {
            newBook.content = event.target?.result as string;
            setBooks(prev => [newBook, ...prev]);
          };
          reader.readAsText(file);
        } else {
          setBooks(prev => [newBook, ...prev]);
        }
      } catch (err) {
        console.error('Failed to save file to IDB', err);
        alert('Failed to save file. It might be too large or your browser does not support it.');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(appliedSearch.toLowerCase()) || 
                          book.author.toLowerCase().includes(appliedSearch.toLowerCase());
    const matchesCategory = activeCategory === 'All' || book.format === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'EPUB', 'PDF', 'TXT'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8f9fa] text-notion-text pb-24 font-sans">
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 bg-[#f8f9fa]/90 backdrop-blur-md z-40">
        <button className="p-2 -ml-2 text-slate-600 opacity-0 cursor-default"><Settings size={20} /></button>
        <h1 className="text-base font-bold text-gray-900">Library</h1>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 -mr-2 text-slate-600 hover:text-gray-900 transition-colors"
        >
          <Plus size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".epub,.pdf,.txt" 
          className="hidden" 
        />
      </header>
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              className="block w-full p-1.5 pl-8 text-xs border border-gray-100 rounded-lg bg-[#f9f9f9] focus:ring-0 focus:border-gray-200 transition-all placeholder-gray-400" 
              placeholder="Search..." 
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button 
            onClick={handleSearch}
            className="px-2 py-1.5 bg-[#333333] text-white text-xs font-medium rounded-lg whitespace-nowrap"
          >
            搜索
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
          {categories.map(category => (
            <button 
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 text-xs border rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === category 
                  ? 'bg-[#333333] text-white border-[#333333]' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-px bg-gray-100 w-full mb-3"></div>

      <main className="flex-1 px-4 pb-24 relative">
        <div className="grid grid-cols-3 gap-x-3 gap-y-4">
          {filteredBooks.map(book => {
            let config;
            try {
              config = JSON.parse(book.coverStyle || '{}');
            } catch (e) {
              config = { bg: '#EAE6D9', textColor: '#2C302E', shapes: [], texture: 'none' };
            }

            return (
              <div 
                key={book.id} 
                className="flex flex-col gap-1.5 group cursor-pointer relative"
                onClick={() => {
                  if (editingBookId !== book.id) {
                    navigate(`/reader/${book.id}`);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, book.id)}
                onTouchStart={(e) => handleTouchStart(e, book.id)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              >
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-sm border border-gray-100" style={{ backgroundColor: config.bg || '#EAE6D9' }}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      {/* Texture */}
                      {config.texture === 'grid' && (
                        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#00000011 1px, transparent 1px), linear-gradient(90deg, #00000011 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                      )}
                      {config.texture === 'paper' && (
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                      )}
                      
                      {/* Shapes */}
                      {config.shapes?.map((shape: any, i: number) => {
                        const baseStyle: any = {
                          position: 'absolute',
                          top: shape.top,
                          left: shape.left,
                          backgroundColor: shape.color,
                          opacity: 0.8,
                          transform: 'translate(-50%, -50%)',
                        };
                        if (shape.type === 'circle') {
                          baseStyle.width = `${shape.size1}px`;
                          baseStyle.height = `${shape.size1}px`;
                          baseStyle.borderRadius = '50%';
                        } else if (shape.type === 'rect') {
                          baseStyle.width = `${shape.size1}px`;
                          baseStyle.height = `${shape.size2}px`;
                        } else if (shape.type === 'ellipse') {
                          baseStyle.width = `${shape.size1}px`;
                          baseStyle.height = `${shape.size2}px`;
                          baseStyle.borderRadius = '50%';
                        } else if (shape.type === 'line') {
                          baseStyle.width = `${shape.size1 * 2}px`;
                          baseStyle.height = `${Math.max(2, shape.size2 / 10)}px`;
                          baseStyle.transform = `translate(-50%, -50%) rotate(${shape.size1}deg)`;
                        }
                        return <div key={i} style={baseStyle}></div>;
                      })}
                      
                      {/* Book Title & Author */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10">
                        <h3 className="font-serif font-bold text-[10px] leading-tight line-clamp-3 mb-1" style={{ color: config.textColor }}>{book.title}</h3>
                        <p className="text-[8px] uppercase tracking-widest" style={{ color: config.textColor, opacity: 0.7 }}>{book.author}</p>
                      </div>
                    </>
                  )}
                  
                  {/* Refresh Cover Button */}
                  {!book.coverUrl && (
                    <button 
                      onClick={(e) => handleRefreshCover(e, book.id)}
                      className="absolute top-1 right-1 p-1 bg-white/50 hover:bg-white/80 backdrop-blur-sm rounded-full text-gray-800 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RefreshCw size={10} />
                    </button>
                  )}
                  
                  <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider z-20">
                    {book.format}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-[12px] text-gray-900 leading-tight line-clamp-1">{book.title}</h3>
                  {editingAuthorId === book.id ? (
                    <form onSubmit={(e) => handleRenameAuthorSubmit(e, book.id)} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editAuthor}
                        onChange={(e) => setEditAuthor(e.target.value)}
                        onBlur={(e) => handleRenameAuthorSubmit(e, book.id)}
                        autoFocus
                        className="w-full text-[10px] text-gray-500 mt-0.5 border-b border-gray-300 focus:outline-none focus:border-black bg-transparent"
                      />
                    </form>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); startRenameAuthor(e, book); }}>{book.author}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-32 overflow-hidden"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 130)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={(e) => {
                const book = books.find(b => b.id === contextMenu.bookId);
                if (book) startRename(e, book);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={14} /> 重命名
            </button>
            <button 
              onClick={(e) => {
                const book = books.find(b => b.id === contextMenu.bookId);
                if (book) startRenameAuthor(e, book);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={14} /> 重命名作者
            </button>
            <button 
              onClick={(e) => handleDelete(e, contextMenu.bookId)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} /> 删除
            </button>
          </div>
        )}

        {filteredBooks.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            没有找到相关的书籍
          </div>
        )}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around items-center py-1 z-50">
        <button onClick={() => navigate('/')} className="flex flex-col items-center text-gray-400"><Home size={20} /><span className="text-[10px] mt-0.5">Discovery</span></button>
        <button className="flex flex-col items-center text-black"><Book size={20} /><span className="text-[10px] mt-0.5 font-bold">Library</span></button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center text-gray-400"><User size={20} /><span className="text-[10px] mt-0.5">Profile</span></button>
      </nav>
    </div>
  );
}
