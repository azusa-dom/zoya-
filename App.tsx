import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Shuffle, Quote, Sparkles, BookOpen, 
  Sprout, Tags, MessageSquareQuote, Download, Highlighter, 
  Trash2, Plus, X, Save, Loader2, Upload, FileText, Volume2, Mic,
  Clock, CheckCircle2, AlertCircle, Book
} from 'lucide-react';
import { ZoyaCard } from './types';
import { generateCardDetails } from './services/geminiService';
import { useGeminiTTS } from './hooks/useGeminiTTS';
import { FloatingToolbar } from './components/FloatingToolbar';
import { LiveSessionOverlay } from './components/LiveSessionOverlay';
import { getDueCards, calculateNextReview, GRADE } from './utils/srs';

// ----------------------------------------------------------------------
// Initial Data
// ----------------------------------------------------------------------
const initialZoyaCards: ZoyaCard[] = [
  {
    id: 1,
    term: "Opportunity Cost (机会成本)",
    chineseTranslation: "机会成本",
    roots: "Latin: opportunitas (fitness, convenience) + cost (price)",
    synonyms: ["Trade-off", "Alternative cost", "Sacrifice"],
    layman: "鱼和熊掌不可兼得。当你决定把资源 (resources) 用在一件事上时，你被迫放弃的其他选择中价值最高的那一个，就是你的成本 (cost)。",
    example: "你今晚花2小时刷抖音 (scrolling TikTok)。这2小时原本可以用来去健身房 (gym) 或者学习代码 (coding)。那么，你练出的肌肉或学到的知识，就是你刷抖音的机会成本。",
    sentences: [
      "Every financial decision involves an opportunity cost.",
      "The opportunity cost of going to college is the income you could have earned by working."
    ],
    definition: "The potential benefits that an individual, investor, or business misses out on when choosing one alternative over another.",
    nextReviewDate: 0, // Immediately due
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    createdAt: Date.now()
  }
];

// ----------------------------------------------------------------------
// Helper Components
// ----------------------------------------------------------------------

interface HighlightRendererProps {
  text?: string;
  highlights: string[];
  onRemove: (text: string) => void;
}

function HighlightRenderer({ text, highlights, onRemove }: HighlightRendererProps) {
  if (!text) return null;
  if (!highlights || highlights.length === 0) return <>{highlightStandardEnglish(text)}</>;

  const escapedHighlights = highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  escapedHighlights.sort((a, b) => b.length - a.length);

  const pattern = new RegExp(`(${escapedHighlights.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isHighlighted = highlights.some(h => h.toLowerCase() === part.toLowerCase());
        if (isHighlighted) {
          return (
            <mark 
              key={i} 
              onClick={(e) => { e.stopPropagation(); onRemove(part); }}
              className="bg-[#ccff00] text-black rounded-sm px-1 box-decoration-clone cursor-pointer hover:bg-red-200 transition-colors mx-0.5"
              title="Click to remove highlight"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{highlightStandardEnglish(part)}</span>;
      })}
    </>
  );
}

function highlightStandardEnglish(text: string) {
  const parts = text.split(/(\([a-zA-Z\s]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('(') && part.endsWith(')')) {
      return <span key={i} className="font-bold text-stone-900 decoration-stone-300 underline decoration-1 underline-offset-2 mx-1">{part}</span>;
    }
    return part;
  });
}

// ----------------------------------------------------------------------
// Add Card Modal
// ----------------------------------------------------------------------

interface AddCardModalProps {
  onClose: () => void;
  onAdd: (card: ZoyaCard) => void;
}

function AddCardModal({ onClose, onAdd }: AddCardModalProps) {
  const [formData, setFormData] = useState({
    term: '',
    chineseTranslation: '',
    roots: '',
    synonyms: '',
    layman: '',
    example: '',
    sentences: '',
    definition: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAutoGenerate = async () => {
    if (!formData.term) {
        alert("Please enter a term first!");
        return;
    }
    setIsGenerating(true);
    try {
        const aiData = await generateCardDetails(formData.term);
        setFormData(prev => ({
            ...prev,
            chineseTranslation: aiData.chineseTranslation || prev.chineseTranslation,
            roots: aiData.roots || prev.roots,
            synonyms: aiData.synonyms?.join(", ") || prev.synonyms,
            layman: aiData.layman || prev.layman,
            example: aiData.example || prev.example,
            definition: aiData.definition || prev.definition,
            sentences: aiData.sentences?.join("\n") || prev.sentences
        }));
    } catch (error) {
        alert("Failed to generate content. Please check your API key.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.term) return;

    const newCard: ZoyaCard = {
      id: Date.now(),
      term: formData.term,
      chineseTranslation: formData.chineseTranslation || undefined,
      roots: formData.roots || "N/A",
      synonyms: formData.synonyms.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      layman: formData.layman || "No explanation provided.",
      example: formData.example || "No example provided.",
      sentences: formData.sentences.split('\n').map(s => s.trim()).filter(Boolean),
      definition: formData.definition || "No definition provided.",
      nextReviewDate: 0,
      interval: 0,
      repetition: 0,
      easeFactor: 2.5,
      createdAt: Date.now()
    };

    onAdd(newCard);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#FDFBF7] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
            <Plus size={20} /> Add New Card
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Term (术语名称)</label>
              <div className="flex gap-2">
                  <input 
                    name="term"
                    value={formData.term}
                    onChange={handleChange}
                    placeholder="e.g. Entropy (熵)"
                    className="flex-1 p-3 bg-white border border-stone-300 rounded focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all font-serif text-lg"
                    required
                  />
                  <button 
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={isGenerating || !formData.term}
                    className="px-4 bg-purple-600 text-white rounded font-bold uppercase text-xs tracking-wider hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all min-w-[140px] justify-center"
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? "Thinking..." : "Auto-Fill AI"}
                  </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Chinese Translation (中文翻译)</label>
              <input 
                name="chineseTranslation"
                value={formData.chineseTranslation}
                onChange={handleChange}
                placeholder="e.g. 熵"
                className="w-full p-3 bg-white border border-stone-300 rounded"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Roots</label>
                <input name="roots" value={formData.roots} onChange={handleChange} className="w-full p-3 bg-white border border-stone-300 rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Synonyms</label>
                <input name="synonyms" value={formData.synonyms} onChange={handleChange} className="w-full p-3 bg-white border border-stone-300 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Layman</label>
              <textarea name="layman" value={formData.layman} onChange={handleChange} rows={3} className="w-full p-3 bg-white border border-stone-300 rounded" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Example</label>
              <textarea name="example" value={formData.example} onChange={handleChange} rows={3} className="w-full p-3 bg-white border border-stone-300 rounded" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Definition</label>
              <textarea name="definition" value={formData.definition} onChange={handleChange} rows={2} className="w-full p-3 bg-white border border-stone-300 rounded" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Sentences</label>
              <textarea name="sentences" value={formData.sentences} onChange={handleChange} rows={3} className="w-full p-3 bg-white border border-stone-300 rounded" />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-stone-500 uppercase tracking-widest hover:bg-stone-100 rounded">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-stone-900 text-white text-sm font-bold uppercase tracking-widest rounded shadow-lg flex items-center gap-2"><Save size={16} /> Save Card</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Import Cards Modal
// ----------------------------------------------------------------------

interface ImportModalProps {
  onClose: () => void;
  onImport: (cards: ZoyaCard[]) => void;
}

function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [fileContent, setFileContent] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setFileContent(content);
        setError('');
      } catch (err) {
        setError('Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => {
      setFileContent(text);
      setError('');
    }).catch(() => {
      setError('Failed to read clipboard');
    });
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(fileContent);
      let importedCards: ZoyaCard[] = [];

      if (Array.isArray(parsed)) {
        // 如果是数组，直接使用
        importedCards = parsed.map((item: any, index: number) => ({
          id: item.id || Date.now() + index,
          term: item.term || '',
          chineseTranslation: item.chineseTranslation,
          roots: item.roots || 'N/A',
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          layman: item.layman || '',
          example: item.example || '',
          sentences: Array.isArray(item.sentences) ? item.sentences : [],
          definition: item.definition || '',
          nextReviewDate: item.nextReviewDate || 0,
          interval: item.interval || 0,
          repetition: item.repetition || 0,
          easeFactor: item.easeFactor || 2.5,
          createdAt: item.createdAt || Date.now()
        }));
      } else if (parsed.cards && Array.isArray(parsed.cards)) {
        // 如果是包含cards字段的对象
        importedCards = parsed.cards.map((item: any, index: number) => ({
          id: item.id || Date.now() + index,
          term: item.term || '',
          chineseTranslation: item.chineseTranslation,
          roots: item.roots || 'N/A',
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          layman: item.layman || '',
          example: item.example || '',
          sentences: Array.isArray(item.sentences) ? item.sentences : [],
          definition: item.definition || '',
          nextReviewDate: item.nextReviewDate || 0,
          interval: item.interval || 0,
          repetition: item.repetition || 0,
          easeFactor: item.easeFactor || 2.5,
          createdAt: item.createdAt || Date.now()
        }));
      } else {
        throw new Error('Invalid format');
      }

      if (importedCards.length === 0) {
        setError('No valid cards found in file');
        return;
      }

      onImport(importedCards);
      onClose();
    } catch (err) {
      setError('Invalid JSON format. Please check your file.');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#FDFBF7] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
            <Upload size={20} /> Import Cards
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Upload JSON File</label>
            <input 
              type="file" 
              accept=".json"
              onChange={handleFileChange}
              className="w-full p-3 bg-white border border-stone-300 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-stone-200"></div>
            <span className="text-xs text-stone-400 uppercase">or</span>
            <div className="flex-1 h-px bg-stone-200"></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Paste JSON Content</label>
            <button 
              onClick={handlePaste}
              className="mb-2 px-4 py-2 bg-stone-100 text-stone-700 rounded text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-colors"
            >
              Paste from Clipboard
            </button>
            <textarea 
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setError('');
              }}
              placeholder='Paste JSON content here, e.g. [{"term": "...", "roots": "...", ...}]'
              rows={10}
              className="w-full p-3 bg-white border border-stone-300 rounded font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-stone-500 uppercase tracking-widest hover:bg-stone-100 rounded">Cancel</button>
            <button 
              onClick={handleImport} 
              disabled={!fileContent.trim()}
              className="px-6 py-2.5 bg-stone-900 text-white text-sm font-bold uppercase tracking-widest rounded shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} /> Import Cards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main Application Component
// ----------------------------------------------------------------------

export default function App() {
  const [allCards, setAllCards] = useState<ZoyaCard[]>([]); // Store all cards
  const [reviewQueue, setReviewQueue] = useState<ZoyaCard[]>([]); // Cards to review
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Helper to get current active list
  const cards = isReviewMode ? reviewQueue : allCards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(700);
  
  // TTS and Voice Practice
  const { speak, stopAudio, isPlaying: isPlayingTTS, isLoading: isTTSLoading } = useGeminiTTS();
  const [selectedText, setSelectedText] = useState('');
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [showLiveSession, setShowLiveSession] = useState(false);
  
  const [savedHighlights, setSavedHighlights] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('zoya_highlights');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const savedCards = localStorage.getItem('zoya_cards_v1');
    if (savedCards) {
      try {
        setAllCards(JSON.parse(savedCards));
      } catch (e) {
        setAllCards(initialZoyaCards);
      }
    } else {
      setAllCards(initialZoyaCards);
    }
  }, []);

  useEffect(() => {
    if (allCards.length > 0) {
      localStorage.setItem('zoya_cards_v1', JSON.stringify(allCards));
    }
  }, [allCards]);

  // ... (rest of useEffects) ...

  const handleStartReview = () => {
    const due = getDueCards(allCards);
    if (due.length === 0) {
      alert("No cards due for review! Great job!");
      return;
    }
    setReviewQueue(due);
    setIsReviewMode(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleExitReview = () => {
    setIsReviewMode(false);
    setReviewQueue([]);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReviewGrade = (grade: number) => {
    if (!isReviewMode || cards.length === 0) return;
    
    const currentCard = cards[currentIndex];
    const updatedCard = calculateNextReview(currentCard, grade);
    
    // Update in main storage
    setAllCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    
    // Remove from review queue if not AGAIN, otherwise requeue
    if (grade !== GRADE.AGAIN) {
       const newQueue = reviewQueue.filter((_, i) => i !== currentIndex);
       setReviewQueue(newQueue);
       
       // If queue empty, exit review
       if (newQueue.length === 0) {
         alert("Review session complete!");
         setIsReviewMode(false);
         setCurrentIndex(0);
       } else {
         // Move to next card (or stay at 0 if we removed current)
         // If we are at the end, go to 0. If we removed current index 0, we are still at 0.
         setCurrentIndex(prev => prev >= newQueue.length ? 0 : prev); 
       }
    } else {
       // If AGAIN, keep in queue, maybe move to end? For simplicity, just keep it and move next
       // Real Anki moves it to 'learning' queue. 
       // Here we just keep it.
       handleNext();
    }
    
    setIsFlipped(false);
  };

  // ... (rest of handlers) ...

  const handleAddCard = (newCard: ZoyaCard) => {
    setAllCards(prev => [...prev, newCard]);
  };

  const handleImportCards = (importedCards: ZoyaCard[]) => {
    setAllCards(prev => [...prev, ...importedCards]);
    alert(`Successfully imported ${importedCards.length} card(s)!`);
  };

  const handleDeleteCurrentCard = () => {
    if (cards.length <= 1 && !isReviewMode) {
      alert("Cannot delete the last card.");
      return;
    }
    if (confirm("Delete this card?")) {
      const cardToDelete = cards[currentIndex];
      const newAllCards = allCards.filter(c => c.id !== cardToDelete.id);
      setAllCards(newAllCards);
      
      if (isReviewMode) {
          const newQueue = reviewQueue.filter(c => c.id !== cardToDelete.id);
          setReviewQueue(newQueue);
          if (newQueue.length === 0) {
              setIsReviewMode(false);
              setCurrentIndex(0);
          } else {
              setCurrentIndex(prev => prev >= newQueue.length ? 0 : prev);
          }
      } else {
          setCurrentIndex(prev => prev >= newAllCards.length ? 0 : prev);
      }
      setIsFlipped(false);
    }
  };
  
  // ...


  useEffect(() => {
    localStorage.setItem('zoya_highlights', JSON.stringify(savedHighlights));
  }, [savedHighlights]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddModal) return;
      if ((e.key === ' ' || e.key === 'Enter') && !highlightMode) {
        e.preventDefault();
        handleFlip();
      }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, highlightMode, showAddModal, cards.length]);

  // 动态计算卡片高度
  useEffect(() => {
    if (cards.length === 0) return;
    
    const updateCardHeight = () => {
      if (cardBackRef.current) {
        const height = cardBackRef.current.scrollHeight;
        setCardHeight(Math.max(height, 700)); // 最小高度700px
      }
    };

    updateCardHeight();
    // 延迟一下确保DOM已渲染
    const timer = setTimeout(updateCardHeight, 100);
    const timer2 = setTimeout(updateCardHeight, 300);
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateCardHeight);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateCardHeight);
    };
  }, [currentIndex, cards, isFlipped, savedHighlights]);

  const handleFlip = () => setIsFlipped(!isFlipped);
  
  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 200);
  };
  
  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1)), 200);
  };
  
  const handleShuffle = () => {
    setIsFlipped(false);
    if (isReviewMode) {
        const shuffled = [...reviewQueue].sort(() => Math.random() - 0.5);
        setReviewQueue(shuffled);
    } else {
        const shuffled = [...allCards].sort(() => Math.random() - 0.5);
        setAllCards(shuffled);
    }
    setCurrentIndex(0);
  };

  const handleAddCard = (newCard: ZoyaCard) => {
    setAllCards(prev => [...prev, newCard]);
  };

  const handleImportCards = (importedCards: ZoyaCard[]) => {
    setAllCards(prev => [...prev, ...importedCards]);
    alert(`Successfully imported ${importedCards.length} card(s)!`);
  };

  const handleDeleteCurrentCard = () => {
    if (allCards.length <= 1 && !isReviewMode) {
      alert("Cannot delete the last card.");
      return;
    }
    if (confirm("Delete this card?")) {
      const cardToDelete = cards[currentIndex];
      const newAllCards = allCards.filter(c => c.id !== cardToDelete.id);
      setAllCards(newAllCards);
      
      if (isReviewMode) {
          const newQueue = reviewQueue.filter(c => c.id !== cardToDelete.id);
          setReviewQueue(newQueue);
          if (newQueue.length === 0) {
              setIsReviewMode(false);
              setCurrentIndex(0);
          } else {
              setCurrentIndex(prev => prev >= newQueue.length ? 0 : prev);
          }
      } else {
          setCurrentIndex(prev => prev >= newAllCards.length ? 0 : prev);
      }
      setIsFlipped(false);
    }
  };
  
  // ... (rest remains similar but using 'cards' variable)

  const handleTextMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    
    if (text.trim().length > 0) {
      // Show floating toolbar for text selection
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setToolbarPosition({
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX
        });
        setSelectedText(text);
      }
      
      // Handle highlight mode
      if (highlightMode) {
        setSavedHighlights(prev => {
          const currentCardId = cards[currentIndex].id.toString();
          const currentList = prev[currentCardId] || [];
          if (!currentList.includes(text)) {
             return { ...prev, [currentCardId]: [...currentList, text] };
          }
          return prev;
        });
        selection?.removeAllRanges();
      }
    } else {
      setToolbarPosition(null);
    }
  };

  const handleTTS = () => {
    if (selectedText) {
      speak(selectedText);
    }
    setToolbarPosition(null);
  };

  const handlePractice = () => {
    if (selectedText) {
      setShowLiveSession(true);
      setToolbarPosition(null);
    }
  };

  const handleCloseToolbar = () => {
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (textToRemove: string) => {
    if (!highlightMode) return; 
    setSavedHighlights(prev => {
      const currentCardId = cards[currentIndex].id.toString();
      return { ...prev, [currentCardId]: (prev[currentCardId] || []).filter(t => t !== textToRemove) };
    });
  };

  const clearAllHighlights = () => {
     setSavedHighlights(prev => {
        const newHighlights = { ...prev };
        delete newHighlights[cards[currentIndex].id.toString()];
        return newHighlights;
     });
  };

  const handleExport = () => {
    // 导出为完整的卡片数据（用于导入）
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cards: allCards.map(card => ({
        id: card.id,
        term: card.term,
        chineseTranslation: card.chineseTranslation,
        roots: card.roots,
        synonyms: card.synonyms,
        layman: card.layman,
        example: card.example,
        sentences: card.sentences,
        definition: card.definition,
        nextReviewDate: card.nextReviewDate,
        interval: card.interval,
        repetition: card.repetition,
        easeFactor: card.easeFactor
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoya_cards_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAICards = () => {
    // 导出为AI训练数据集格式
    const exportData = allCards.map(card => ({
      input_text: `Explain the term "${card.term}"${card.chineseTranslation ? ` (${card.chineseTranslation})` : ''}`,
      output_text: `Term: ${card.term}${card.chineseTranslation ? ` (${card.chineseTranslation})` : ''}\nRoots: ${card.roots}\nLayman Explanation: ${card.layman}\nExample: ${card.example}\nDefinition: ${card.definition}`
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoya_ai_dataset_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const cardHighlights = savedHighlights[currentCard.id.toString()] || [];

  return (
    <div className={`min-h-screen bg-[#EBE9E4] flex flex-col items-center justify-center p-6 font-serif text-stone-800 ${highlightMode ? 'selection:bg-[#ccff00] selection:text-black cursor-text' : 'selection:bg-stone-300 selection:text-black'}`}>
      
      {/* Header */}
      <div className="mb-6 text-center tracking-wide mt-12 md:mt-0 relative z-10">
        <div className="inline-block border-b-2 border-stone-800 pb-1 mb-2">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-stone-900">
                {isReviewMode ? "Review Session" : "Zoya 快去背单词"}
            </h1>
        </div>
        <div className="flex items-center justify-center gap-4 text-stone-500 text-xs font-medium uppercase tracking-widest">
            {isReviewMode ? (
                <span className="text-purple-600 font-bold flex items-center gap-1">
                    <Clock size={14} /> Due Today: {reviewQueue.length}
                </span>
            ) : (
                <span>Master Terminology & Context</span>
            )}
        </div>
      </div>

      {/* Card Container */}
      <div 
        ref={cardContainerRef}
        className="relative w-full max-w-2xl perspective-1000 group z-0 mb-32"
        style={{ minHeight: `${cardHeight}px` }}
      >
        <div 
          className={`relative w-full transition-all duration-700 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ height: `${cardHeight}px` }}
          onClick={(e) => {
            const selection = window.getSelection();
            const selectionText = selection?.toString() || '';
            if (highlightMode && selectionText.length > 0) return;
            // @ts-ignore
            if (e.target.tagName === 'MARK') return;
            if (e.target instanceof HTMLElement && e.target.closest('button')) return;
            handleFlip();
          }}
        >
          {/* FRONT */}
          <div 
            className="absolute w-full backface-hidden rounded-sm shadow-2xl bg-[#FDFBF7] flex flex-col items-center justify-center p-12 border border-stone-200"
            style={{ height: `${cardHeight}px` }}
          >
             <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-stone-300"></div>
            <div className="absolute top-4 right-4 w-3 h-3 border-t border-r border-stone-300"></div>
            <div className="absolute bottom-4 left-4 w-3 h-3 border-b border-l border-stone-300"></div>
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-stone-300"></div>
            
            <div className="flex-1 flex flex-col items-center justify-center w-full text-center">
                <span className="text-stone-400 text-xs font-bold tracking-[0.2em] mb-12 uppercase">Zoya Card No. {currentIndex + 1}</span>
                <h2 className="text-4xl md:text-6xl font-bold text-stone-900 leading-tight mb-8 break-words max-w-full">
                  {currentCard.term.split(/[(（]/)[0]}
                </h2>
                <div className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center text-stone-300 mb-8"><span className="text-sm italic font-serif">i</span></div>
                <div className="text-xl md:text-2xl text-stone-500 font-normal italic">
                  {currentCard.term.match(/[(（](.*?)[)）]/)?.[1] || ""}
                </div>
            </div>
            <div className="mt-auto text-stone-400 text-xs tracking-widest uppercase opacity-60">Tap to Reveal</div>
          </div>

          {/* BACK - 使用ref来测量实际高度 */}
          <div 
            ref={cardBackRef}
            className="absolute w-full backface-hidden rotate-y-180 rounded-sm shadow-2xl bg-[#FDFBF7] flex flex-col border border-stone-200 text-left" 
            onClick={(e) => e.stopPropagation()} 
            onMouseUp={handleTextMouseUp}
            style={{ 
              minHeight: '700px',
              height: 'auto'
            }}
          >
            <div className="p-6 md:p-8">
                <div className="border-b border-stone-200 pb-3 mb-5 flex justify-between items-baseline">
                    <div className="flex-1">
                      <span className="font-bold text-xl text-stone-900 truncate pr-4 block">{currentCard.term.split(/[(（]/)[0]}</span>
                      {currentCard.chineseTranslation && (
                        <span className="text-base text-stone-600 mt-1 block">{currentCard.chineseTranslation}</span>
                      )}
                    </div>
                    <div className="flex gap-3 items-center">
                      <button 
                        onClick={() => speak(currentCard.term)} 
                        className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                        title="Listen to term"
                        disabled={isTTSLoading}
                      >
                        {isTTSLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedText(currentCard.term);
                          setShowLiveSession(true);
                        }} 
                        className="p-2 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                        title="Practice pronunciation"
                      >
                        <Mic size={16} />
                      </button>
                      <button onClick={handleDeleteCurrentCard} className="text-stone-300 hover:text-red-500 transition-colors" title="Delete Card">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={handleFlip} className="text-[10px] font-bold text-stone-400 tracking-widest uppercase hover:text-stone-800 transition-colors pt-1">Close ✕</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-stone-50 p-3 rounded-sm border border-stone-100">
                        <div className="flex items-center gap-2 mb-1.5 text-stone-500"><Sprout size={12} /><span className="text-[10px] uppercase tracking-wider font-bold">Roots</span></div>
                        <p className="text-sm text-stone-700 italic leading-snug"><HighlightRenderer text={currentCard.roots} highlights={cardHighlights} onRemove={removeHighlight} /></p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-sm border border-stone-100">
                        <div className="flex items-center gap-2 mb-1.5 text-stone-500"><Tags size={12} /><span className="text-[10px] uppercase tracking-wider font-bold">Synonyms</span></div>
                        <p className="text-sm text-stone-700 leading-snug"><HighlightRenderer text={currentCard.synonyms.join(", ")} highlights={cardHighlights} onRemove={removeHighlight} /></p>
                    </div>
                </div>

                <div className="mb-5">
                    <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14} /> The Concept (Layman)</h3>
                    <p className="text-stone-800 leading-snug text-base"><HighlightRenderer text={currentCard.layman} highlights={cardHighlights} onRemove={removeHighlight} /></p>
                </div>

                <div className="mb-5 pl-4 border-l-4 border-stone-200 hover:border-[#ccff00] transition-colors duration-300">
                    <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-2"><BookOpen size={14} /> Real World Scenario</h3>
                    <p className="text-stone-700 leading-snug text-sm italic"><HighlightRenderer text={currentCard.example} highlights={cardHighlights} onRemove={removeHighlight} /></p>
                </div>

                <div className="mb-5">
                    <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquareQuote size={14} /> Common Usage</h3>
                    <ul className="list-disc list-inside space-y-1.5">
                        {currentCard.sentences.map((sent, idx) => (
                            <li key={idx} className="text-stone-700 text-sm leading-snug pl-1 marker:text-stone-400"><HighlightRenderer text={sent} highlights={cardHighlights} onRemove={removeHighlight} /></li>
                        ))}
                    </ul>
                </div>

                <div className="mt-5 pt-5 border-t border-stone-100">
                    <div className="flex gap-3">
                        <Quote size={20} className="text-stone-300 flex-shrink-0 fill-current" />
                        <div>
                            <p className="text-stone-900 font-medium text-base leading-snug font-serif"><HighlightRenderer text={currentCard.definition} highlights={cardHighlights} onRemove={removeHighlight} /></p>
                            <p className="text-stone-400 text-[9px] mt-1.5 tracking-wide uppercase">— Technical Definition</p>
                        </div>
                    </div>
                </div>

                {/* Review Buttons */}
                {isReviewMode && (
                    <div className="mt-8 pt-6 border-t border-stone-200 flex justify-between gap-2">
                        <button onClick={() => handleReviewGrade(GRADE.AGAIN)} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold uppercase tracking-widest border border-red-200 transition-colors">
                            Again <span className="block text-[9px] font-normal opacity-70">1 min</span>
                        </button>
                        <button onClick={() => handleReviewGrade(GRADE.HARD)} className="flex-1 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded text-xs font-bold uppercase tracking-widest border border-orange-200 transition-colors">
                            Hard <span className="block text-[9px] font-normal opacity-70">2 days</span>
                        </button>
                        <button onClick={() => handleReviewGrade(GRADE.GOOD)} className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold uppercase tracking-widest border border-blue-200 transition-colors">
                            Good <span className="block text-[9px] font-normal opacity-70">4 days</span>
                        </button>
                        <button onClick={() => handleReviewGrade(GRADE.EASY)} className="flex-1 py-3 bg-green-50 hover:bg-green-100 text-green-600 rounded text-xs font-bold uppercase tracking-widest border border-green-200 transition-colors">
                            Easy <span className="block text-[9px] font-normal opacity-70">7 days</span>
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 w-full max-w-2xl z-10">
        {/* Navigation Section */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {!isReviewMode && (
             <>
              <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-stone-300 hover:bg-stone-800 hover:text-white transition-all flex items-center justify-center bg-white shadow-sm" title="Previous Card">
                <ArrowLeft size={20} />
              </button>
              <span className="font-serif text-xl font-bold text-stone-800 min-w-[60px] text-center">
                {currentIndex + 1} <span className="text-stone-400 font-light">/</span> {cards.length}
              </span>
              <button onClick={handleNext} className="w-12 h-12 rounded-full border border-stone-300 hover:bg-stone-800 hover:text-white transition-all flex items-center justify-center bg-white shadow-sm" title="Next Card">
                <ArrowRight size={20} />
              </button>
             </>
          )}
          {isReviewMode && (
              <span className="font-serif text-xl font-bold text-stone-800 min-w-[60px] text-center">
                Reviewing: {currentIndex + 1} / {reviewQueue.length}
              </span>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-col gap-3">
          {/* Primary Actions */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {!isReviewMode ? (
                <>
                    <button 
                      onClick={handleStartReview}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg border border-purple-600 hover:bg-purple-700 text-xs font-bold uppercase tracking-widest shadow-md transition-all"
                    >
                      <Clock size={18} /> Review ({getDueCards(allCards).length})
                    </button>
                    <button 
                      onClick={() => setShowAddModal(true)} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg border border-stone-900 hover:bg-stone-700 text-xs font-bold uppercase tracking-widest shadow-md transition-all"
                    >
                      <Plus size={18} /> Add
                    </button>
                </>
            ) : (
                <button 
                  onClick={handleExitReview}
                  className="flex items-center gap-2 px-5 py-2.5 bg-stone-200 text-stone-700 rounded-lg border border-stone-300 hover:bg-stone-300 text-xs font-bold uppercase tracking-widest shadow-md transition-all"
                >
                  <X size={18} /> Exit Review
                </button>
            )}

            <button 
              onClick={() => setShowImportModal(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-stone-700 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-bold uppercase tracking-widest shadow-sm transition-all" 
              title="Import Cards"
            >
              <Upload size={18} /> Import
            </button>

            <button 
              onClick={handleShuffle} 
              className="flex items-center gap-2 px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-300 transition-all" 
              title="Shuffle Cards"
            >
              <Shuffle size={18} />
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button 
              onClick={() => setHighlightMode(!highlightMode)} 
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg border transition-all ${
                highlightMode 
                  ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-md' 
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
              }`} 
              title={highlightMode ? "Highlighter ON" : "Turn on Highlighter"}
            >
              <Highlighter size={16} className={highlightMode ? "fill-black" : ""} /> 
              {highlightMode ? 'ON' : 'Highlight'}
            </button>
            
            {cardHighlights.length > 0 && (
              <button 
                onClick={clearAllHighlights} 
                className="flex items-center gap-2 px-4 py-2.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-stone-300 transition-all" 
                title="Clear all highlights"
              >
                <Trash2 size={16} />
              </button>
            )}
            
            <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 rounded-lg border border-stone-200">
              <button 
                onClick={handleExport} 
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-white rounded transition-colors" 
                title="Export Cards"
              >
                <Download size={18} />
              </button>
              
              <div className="w-px h-6 bg-stone-300"></div>
              
              <button 
                onClick={handleExportAICards} 
                className="p-2 text-stone-500 hover:text-purple-600 hover:bg-white rounded transition-colors" 
                title="Export AI Dataset"
              >
                <FileText size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} onAdd={handleAddCard} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImportCards} />}
      
      {/* Floating Toolbar for Text Selection */}
      <FloatingToolbar
        position={toolbarPosition}
        onClose={handleCloseToolbar}
        onTTS={handleTTS}
        onPractice={handlePractice}
        isTTSLoading={isTTSLoading}
        isPlayingTTS={isPlayingTTS}
        selectedText={selectedText}
      />
      
      {/* Live Session Overlay */}
      {showLiveSession && (
        <LiveSessionOverlay
          selectedText={selectedText || currentCard.term}
          onClose={() => {
            setShowLiveSession(false);
            stopAudio();
          }}
        />
      )}

      <style>{`.perspective-1000 { perspective: 1500px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 2px; }`}</style>
    </div>
  );
}