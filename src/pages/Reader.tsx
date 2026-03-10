import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, List, Bot, ChevronUp, ChevronDown } from 'lucide-react';
import { Book as BookType } from '../types';
import { get } from 'idb-keyval';
import * as pdfjsLib from 'pdfjs-dist';
import { EpubView } from 'react-reader';
import { mockBooks } from './Library';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

const THEMES = [
  { id: 'light', bg: '#ffffff', text: '#37352F', name: '默认白' },
  { id: 'sepia', bg: '#F4ECD8', text: '#5C4B37', name: '牛皮纸', texture: 'paper' },
  { id: 'green', bg: '#E8F3E8', text: '#2D4A22', name: '护眼绿' },
  { id: 'dark', bg: '#1A1A1A', text: '#CECECE', name: '夜间' },
];

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookType | null>(null);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<{ title: string, page: number }[]>([]);

  const [fontSize, setFontSize] = useState(() => {
    if (id) {
      const saved = localStorage.getItem(`readerSettings_${id}`);
      if (saved) {
        try { return JSON.parse(saved).fontSize || 18; } catch (e) {}
      }
    }
    return 18;
  });
  const [activeTheme, setActiveTheme] = useState(() => {
    if (id) {
      const saved = localStorage.getItem(`readerSettings_${id}`);
      if (saved) {
        try {
          const themeId = JSON.parse(saved).themeId;
          const theme = THEMES.find(t => t.id === themeId);
          if (theme) return theme;
        } catch (e) {}
      }
    }
    return THEMES[0];
  });

  useEffect(() => {
    if (id) {
      localStorage.setItem(`readerSettings_${id}`, JSON.stringify({ fontSize, themeId: activeTheme.id }));
    }
  }, [fontSize, activeTheme, id]);
  
  // Pagination State
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // TXT State
  const [txtContent, setTxtContent] = useState<string>('');
  const txtContainerRef = useRef<HTMLDivElement>(null);
  const txtContentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // EPUB State
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [epubLocation, setEpubLocation] = useState<string | number>(0);
  const epubViewRef = useRef<any>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('libraryBooks');
    let foundBook: BookType | undefined;
    let books: BookType[] = [];
    
    if (saved) {
      try {
        books = JSON.parse(saved);
        foundBook = books.find(b => b.id === id);
      } catch (e) {
        console.error('Failed to parse saved books', e);
      }
    }
    
    if (!foundBook) {
      foundBook = mockBooks.find(b => b.id === id);
    }
    
    if (foundBook && foundBook.id === '1' && foundBook.format === 'EPUB') {
      foundBook = mockBooks[0];
      // Also update localStorage so Library page reflects the change
      if (books.length > 0) {
        const updatedBooks = books.map(b => b.id === '1' ? mockBooks[0] : b);
        localStorage.setItem('libraryBooks', JSON.stringify(updatedBooks));
      }
    }
    
    if (foundBook) {
      setBook(foundBook);
      if (foundBook.currentPage) {
        if (foundBook.format === 'EPUB') {
          setEpubLocation(foundBook.currentPage as any);
        } else {
          setPageNum(foundBook.currentPage as number);
        }
      }
    }
  }, [id]);

  useEffect(() => {
    if (book?.format === 'PDF') {
      loadPdf();
    } else if (book?.format === 'EPUB') {
      loadEpub();
    } else if (book?.format === 'TXT') {
      loadTxt();
    }
  }, [book]);

  const loadEpub = async () => {
    if (!id) return;
    try {
      const file = await get(`book_file_${id}`);
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        setEpubData(arrayBuffer);
      }
    } catch (err) {
      console.error('Error loading EPUB:', err);
    }
  };

  const loadTxt = async () => {
    if (!id) return;
    try {
      let content = book?.content || '';
      
      try {
        const file = await get(`book_file_${id}`);
        if (file) {
          content = await file.text();
        }
      } catch (err) {
        console.error('Error loading TXT from IDB:', err);
      }

      if (!content) {
        content = "No content available.";
      }

      setTxtContent(content);
    } catch (err) {
      console.error('Error processing TXT:', err);
    }
  };

  // Calculate pages for TXT based on container size
  useEffect(() => {
    if (book?.format === 'TXT' && txtContent && txtContainerRef.current) {
      const updatePagination = () => {
        if (!txtContainerRef.current || !txtContentRef.current) return;
        
        const { clientWidth, clientHeight } = txtContainerRef.current;
        setContainerWidth(clientWidth);
        setContainerHeight(clientHeight);
        
        // Give the browser a moment to layout the columns, then calculate total pages
        setTimeout(() => {
          if (txtContentRef.current && clientWidth > 0) {
            const scrollWidth = txtContentRef.current.scrollWidth;
            // The gap is set to 48px (px-6 is 24px on each side, so gap is 48px to match)
            // Actually, we'll set column-gap to 0 and handle padding differently, or set column-gap to match padding.
            // Let's use column-gap: 24px. The total width of a page is clientWidth.
            // scrollWidth includes all columns and gaps.
            const calculatedPages = Math.ceil(scrollWidth / clientWidth);
            setTotalPages(calculatedPages > 0 ? calculatedPages : 1);
            
            // Adjust pageNum if it's out of bounds after resize
            setPageNum(prev => {
              const newPage = Math.min(prev, calculatedPages > 0 ? calculatedPages : 1);
              return newPage > 0 ? newPage : 1;
            });

            // Extract TOC
            let chapterElements = Array.from(txtContentRef.current.querySelectorAll('p')).filter((p: HTMLParagraphElement) => {
              const text = p.textContent || '';
              const trimmed = text.trim();
              if (trimmed.length === 0 || trimmed.length > 50) return false;
              return /^第[一二三四五六七八九十百千万0-9]+[章节卷回]/.test(trimmed) || 
                     /^Chapter\s+[0-9]+/i.test(trimmed) ||
                     /^[0-9]+[\.、]\s*[^\s]+/.test(trimmed) ||
                     /^【.*】$/.test(trimmed) ||
                     /^\[.*\]$/.test(trimmed);
            });
            
            let newToc = chapterElements.map((el: HTMLParagraphElement) => {
              const offsetLeft = el.offsetLeft;
              const page = Math.floor(offsetLeft / clientWidth) + 1;
              return { title: el.textContent!.trim().substring(0, 30), page };
            });

            // Fallback if no TOC found
            if (newToc.length === 0) {
              const total = calculatedPages > 0 ? calculatedPages : 1;
              for (let i = 1; i <= total; i += 10) {
                newToc.push({ title: `第 ${i} 页`, page: i });
              }
            }

            setToc(newToc);
          }
        }, 100);
      };

      const observer = new ResizeObserver(updatePagination);
      observer.observe(txtContainerRef.current);
      
      updatePagination();
      
      return () => observer.disconnect();
    }
  }, [book?.format, txtContent, fontSize]);

  const loadPdf = async () => {
    if (!id) return;
    try {
      const file = await get(`book_file_${id}`);
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        try {
          const outline = await pdf.getOutline();
          let parsedToc: { title: string, page: number }[] = [];
          
          if (outline && outline.length > 0) {
            const parseOutline = async (items: any[]) => {
              const result: { title: string, page: number }[] = [];
              for (const item of items) {
                let pageNum = 1;
                try {
                  if (typeof item.dest === 'string') {
                    const dest = await pdf.getDestination(item.dest);
                    if (dest) {
                      const ref = dest[0];
                      pageNum = await pdf.getPageIndex(ref) + 1;
                    }
                  } else if (Array.isArray(item.dest)) {
                    const ref = item.dest[0];
                    pageNum = await pdf.getPageIndex(ref) + 1;
                  }
                } catch (e) {}
                result.push({ title: item.title, page: pageNum });
                if (item.items && item.items.length > 0) {
                  result.push(...await parseOutline(item.items));
                }
              }
              return result;
            };
            parsedToc = await parseOutline(outline);
          }
          
          if (parsedToc.length === 0) {
            for (let i = 1; i <= pdf.numPages; i += 10) {
              parsedToc.push({ title: `第 ${i} 页`, page: i });
            }
          }
          setToc(parsedToc);
        } catch (e) {
          console.error('Failed to load PDF outline', e);
          const fallbackToc = [];
          for (let i = 1; i <= pdf.numPages; i += 10) {
            fallbackToc.push({ title: `第 ${i} 页`, page: i });
          }
          setToc(fallbackToc);
        }
      }
    } catch (err) {
      console.error('Error loading PDF:', err);
    }
  };

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum]);

  const renderPage = async (num: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDoc.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth - 48) / unscaledViewport.width; // 48 is padding
      const viewport = page.getViewport({ scale: scale * 1.5 }); // Higher resolution

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    }
  };

  const saveProgress = (newPage: number | string) => {
    if (!book) return;
    const saved = localStorage.getItem('libraryBooks');
    if (saved) {
      try {
        const books: BookType[] = JSON.parse(saved);
        const updatedBooks = books.map(b => b.id === book.id ? { ...b, currentPage: newPage as any } : b);
        localStorage.setItem('libraryBooks', JSON.stringify(updatedBooks));
      } catch (e) {
        console.error('Failed to save progress', e);
      }
    }
  };

  const handlePrevPage = () => {
    if (book?.format === 'EPUB') {
      if (epubViewRef.current && epubViewRef.current.prevPage) {
        epubViewRef.current.prevPage();
      }
      return;
    }
    if (pageNum <= 1) return;
    const newPage = pageNum - 1;
    setPageNum(newPage);
    saveProgress(newPage);
  };

  const handleNextPage = () => {
    if (book?.format === 'EPUB') {
      if (epubViewRef.current && epubViewRef.current.nextPage) {
        epubViewRef.current.nextPage();
      }
      return;
    }
    if (pageNum >= totalPages) return;
    const newPage = pageNum + 1;
    setPageNum(newPage);
    saveProgress(newPage);
  };

  const handleMainClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger if clicking on a button or interactive element
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }

    let clientX = 0;
    if ('touches' in e) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.3) {
      handlePrevPage();
    } else if (x > width * 0.7) {
      handleNextPage();
    } else {
      setShowUI(!showUI);
      if (showSettings) setShowSettings(false);
    }
  };

  const [isExtracting, setIsExtracting] = useState(false);

  const handleAIChatClick = async () => {
    if (isExtracting) return;
    setIsExtracting(true);
    let contextText = '';
    try {
      if (book?.format === 'PDF' && pdfDoc) {
        const start = Math.max(1, pageNum - 10);
        const end = Math.min(totalPages, pageNum + 10);
        let text = '';
        for (let i = start; i <= end; i++) {
          try {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          } catch (e) {}
        }
        contextText = text;
      } else if (book?.format === 'EPUB' && epubViewRef.current?.rendition) {
        const contents = epubViewRef.current.rendition.getContents();
        if (contents && contents.length > 0) {
          contextText = contents.map((c: any) => c.document.body.innerText).join('\n');
        }
      } else if (book?.format === 'TXT') {
        const charsPerPage = 1000;
        const startChar = Math.max(0, (pageNum - 11) * charsPerPage);
        const endChar = Math.min(txtContent.length, (pageNum + 10) * charsPerPage);
        contextText = txtContent.substring(startChar, endChar);
      }
    } catch (e) {
      console.error('Failed to extract context', e);
    } finally {
      setIsExtracting(false);
      if (contextText) {
        if (contextText.length > 15000) {
          contextText = contextText.substring(0, 15000) + '...';
        }
        localStorage.setItem(`current_context_${book?.id}`, contextText);
      } else {
        localStorage.removeItem(`current_context_${book?.id}`);
      }
      navigate(`/chat/${id}`);
    }
  };

  const title = book?.title || 'The Great Gatsby';

  return (
    <div className="font-sans antialiased h-screen overflow-hidden flex flex-col max-w-md mx-auto relative transition-colors duration-300" style={{ backgroundColor: activeTheme.bg, color: activeTheme.text }}>
      {activeTheme.texture === 'paper' && (
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      )}
      
      <header 
        className={`flex items-center justify-between px-4 py-3 border-b absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} 
        style={{ backgroundColor: activeTheme.bg, borderColor: activeTheme.text + '20' }}
      >
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 relative z-10">
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
          <h1 className="text-lg font-bold tracking-wide line-clamp-1">{title}</h1>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          <button onClick={() => setShowSettings(!showSettings)} aria-label="Settings" className="p-2">
            <Settings size={20} />
          </button>
          <button onClick={() => { setShowToc(true); setShowUI(false); setShowSettings(false); }} aria-label="Contents" className="p-2">
            <List size={20} />
          </button>
          <button onClick={handleAIChatClick} disabled={isExtracting} aria-label="AI Chat" className={`p-2 ${isExtracting ? 'opacity-50' : ''}`}>
            <Bot size={20} />
          </button>
        </div>
      </header>

      {showToc && (
        <div className="absolute inset-0 bg-black/50 z-40 flex justify-end" onClick={() => setShowToc(false)}>
          <div 
            className="w-3/4 max-w-sm h-full shadow-2xl overflow-y-auto" 
            style={{ backgroundColor: activeTheme.bg, color: activeTheme.text }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b" style={{ borderColor: activeTheme.text + '20' }}>
              <h2 className="text-lg font-bold">目录</h2>
            </div>
            <div className="p-2">
              {toc.length > 0 ? (
                toc.map((item, idx) => (
                  <button 
                    key={idx}
                    className="w-full text-left p-3 rounded hover:bg-black/5 flex justify-between items-center"
                    style={{ paddingLeft: `${((item as any).level || 0) * 1.5 + 0.75}rem` }}
                    onClick={() => {
                      if (book?.format === 'EPUB') {
                        if (epubViewRef.current && epubViewRef.current.rendition) {
                          epubViewRef.current.rendition.display(item.page);
                        }
                      } else {
                        setPageNum(item.page);
                        saveProgress(item.page);
                      }
                      setShowToc(false);
                    }}
                  >
                    <span className="truncate pr-4">{item.title}</span>
                    <span className="text-xs opacity-50 flex-shrink-0">{book?.format === 'EPUB' ? '' : item.page}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center opacity-50">
                  暂无目录信息
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && showUI && (
        <div className="absolute top-14 right-4 bg-white shadow-xl border border-gray-100 rounded-2xl p-5 z-50 w-64 text-gray-800">
          <div className="mb-5">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 block">字号大小</span>
            <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg border border-gray-100">
              <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="flex-1 py-2 rounded bg-white shadow-sm text-lg font-medium hover:bg-gray-50 transition-colors">A-</button>
              <span className="text-sm font-medium w-8 text-center">{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(32, f + 2))} className="flex-1 py-2 rounded bg-white shadow-sm text-lg font-medium hover:bg-gray-50 transition-colors">A+</button>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 block">阅读背景</span>
            <div className="flex gap-3 justify-between">
              {THEMES.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setActiveTheme(t); setShowSettings(false); }}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${activeTheme.id === t.id ? 'border-blue-500 scale-110' : 'border-gray-200 shadow-sm hover:scale-105'}`}
                  style={{ backgroundColor: t.bg }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <main 
        className="flex-1 overflow-hidden relative z-10 cursor-pointer" 
        style={{ lineHeight: 1.8, fontSize: `${fontSize}px` }}
        onClick={handleMainClick}
      >
        {book?.format === 'PDF' ? (
          <div className="flex justify-center items-center min-h-full px-6 py-8 pointer-events-none">
            <canvas ref={canvasRef} className="shadow-sm border border-gray-200 rounded-sm" />
          </div>
        ) : book?.format === 'EPUB' ? (
          <div className="h-full w-full relative" style={{ height: '100%' }} onClick={(e) => e.stopPropagation()}>
            {epubData && (
              <EpubView
                ref={epubViewRef}
                url={epubData}
                location={epubLocation}
                locationChanged={(epubcifi: string) => {
                  setEpubLocation(epubcifi);
                  saveProgress(epubcifi);
                  if (epubViewRef.current?.rendition?.book?.locations?.length() > 0) {
                    const percentage = epubViewRef.current.rendition.book.locations.percentageFromCfi(epubcifi);
                    setPageNum(Math.max(1, Math.round(percentage * epubViewRef.current.rendition.book.locations.length())));
                  }
                }}
                tocChanged={(toc) => {
                  const flattenToc = (items: any[], level = 0): any[] => {
                    let result: any[] = [];
                    items.forEach(item => {
                      result.push({ title: item.label, page: item.href, level });
                      if (item.subitems && item.subitems.length > 0) {
                        result = result.concat(flattenToc(item.subitems, level + 1));
                      }
                    });
                    return result;
                  };
                  setToc(flattenToc(toc));
                }}
                epubInitOptions={{
                  // Removed encoding: 'binary' as it can interfere with epubjs's default ArrayBuffer handling
                }}
                epubOptions={{
                  flow: 'paginated',
                  manager: 'continuous'
                }}
                getRendition={(rendition) => {
                  const book = rendition.book;
                  book.ready.then(() => {
                    return book.locations.generate(1600);
                  }).then((locations) => {
                    setTotalPages(locations.length);
                    if (rendition.location && rendition.location.start) {
                      const percentage = book.locations.percentageFromCfi(rendition.location.start.cfi);
                      setPageNum(Math.max(1, Math.round(percentage * locations.length)));
                    }
                  }).catch(console.error);

                  rendition.themes.fontSize(`${fontSize}px`);
                  rendition.themes.default({
                    'body': { background: activeTheme.bg, color: activeTheme.text },
                    'p': { color: activeTheme.text }
                  });
                  rendition.hooks.content.register((contents: any) => {
                    const doc = contents.document;
                    let touchStartX = 0;
                    let touchStartY = 0;

                    const handleTouchStart = (e: any) => {
                      touchStartX = e.changedTouches[0].screenX;
                      touchStartY = e.changedTouches[0].screenY;
                    };

                    const handleTouchEnd = (e: any) => {
                      const touchEndX = e.changedTouches[0].screenX;
                      const touchEndY = e.changedTouches[0].screenY;
                      
                      // If moved more than 10px, it's a swipe, not a tap
                      if (Math.abs(touchEndX - touchStartX) > 10 || Math.abs(touchEndY - touchStartY) > 10) {
                        return;
                      }
                      
                      handleTap(e);
                    };

                    let lastTapTime = 0;

                    const handleTap = (e: any) => {
                      const now = Date.now();
                      if (now - lastTapTime < 300) {
                        return; // Prevent double tap or touch+click
                      }
                      lastTapTime = now;

                      if (e.target.tagName?.toLowerCase() === 'a' || e.target.closest?.('a')) {
                        return;
                      }
                      const selection = doc.getSelection();
                      if (selection && selection.toString().length > 0) {
                        return;
                      }
                      const width = e.view ? e.view.innerWidth : window.innerWidth;
                      let clientX = e.clientX;
                      if (e.type === 'touchend') {
                        clientX = e.changedTouches[0].clientX;
                      }
                      
                      // Sometimes clientX is undefined, fallback to screenX if needed
                      if (clientX === undefined && e.changedTouches) {
                         clientX = e.changedTouches[0].clientX;
                      }

                      if (clientX < width * 0.3) {
                        handlePrevPage();
                      } else if (clientX > width * 0.7) {
                        handleNextPage();
                      } else {
                        setShowUI(prev => !prev);
                        setShowSettings(false);
                      }
                    };
                    doc.addEventListener('click', handleTap, true);
                    doc.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
                    doc.addEventListener('touchend', handleTouchEnd, true);
                  });
                }}
              />
            )}
          </div>
        ) : (
          <div 
            ref={txtContainerRef}
            className="h-full w-full overflow-hidden px-6 py-8 pointer-events-none"
          >
            <div 
              ref={txtContentRef}
              className={`h-full book-content font-serif ${isInitialLoad ? '' : 'transition-transform duration-300 ease-in-out'}`}
              style={{
                columnWidth: `${containerWidth - 48}px`, // 48px is total horizontal padding (px-6 = 24px * 2)
                columnGap: '48px',
                height: '100%',
                transform: `translateX(-${(pageNum - 1) * containerWidth}px)`,
              }}
            >
              {txtContent.split(/\r?\n+/).filter(p => p.trim()).map((paragraph, index) => (
                <p key={index} className="mb-6 whitespace-pre-wrap text-justify">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer 
        className={`border-t absolute bottom-0 left-0 right-0 z-30 pb-safe transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`} 
        style={{ backgroundColor: activeTheme.bg, borderColor: activeTheme.text + '20' }}
      >
        <div className="px-6 py-2 flex items-center justify-between">
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}
            disabled={pageNum <= 1}
            className={`p-2 rounded-full ${pageNum <= 1 ? 'opacity-30' : 'hover:bg-black/5'}`}
          >
            <ChevronUp size={20} />
          </button>
          <span className="text-xs font-sans opacity-60">
            Page {pageNum} of {totalPages || 1}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNextPage(); }}
            disabled={pageNum >= totalPages}
            className={`p-2 rounded-full ${pageNum >= totalPages ? 'opacity-30' : 'hover:bg-black/5'}`}
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
