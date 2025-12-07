import { useState, useEffect, useRef } from 'react';
import './App.css';

// FORMA Loading Spinner Component
const LoadingSpinner = () => <div className="loading-spinner" />;

// Google Icon SVG
const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Login Page Component
const LoginPage = ({ onLogin, loading }) => {
  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-logo"><span className="login-logo-accent">Forma</span>.ai</h1>
          <p className="login-tagline">지식에 형상을 부여하다</p>
          <p className="login-subtitle">Shape your insights into presentations</p>
        </div>

        <div className="login-card">
          <h2 className="login-title">시작하기</h2>
          <p className="login-description">
            Google 계정으로 로그인하여<br />
            슬라이드 생성을 시작하세요
          </p>

          <button
            className="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleIcon />
            <span>Google로 계속하기</span>
          </button>

          <p className="login-terms">
            계속 진행하면 <a href="#">서비스 약관</a> 및 <a href="#">개인정보 처리방침</a>에 동의하게 됩니다.
          </p>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="feature-icon">✨</span>
            <span>마크다운을 슬라이드로</span>
          </div>
          <div className="login-feature">
            <span className="feature-icon">🎨</span>
            <span>다양한 테마 지원</span>
          </div>
          <div className="login-feature">
            <span className="feature-icon">🤖</span>
            <span>AI 어시스턴트</span>
          </div>
        </div>

        <footer className="login-footer">
          <p>Poetic Tech by Lucere</p>
        </footer>
      </div>
    </div>
  );
};

// Loading messages for poetic progress
const LOADING_MESSAGES = [
  { text: '지식의 뼈대를 세우는 중...', subtext: 'Structuring your insights' },
  { text: '형상을 빚어내는 중...', subtext: 'Shaping your content' },
  { text: '색을 입히는 중...', subtext: 'Adding the finishing touches' },
];

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Content State
  const [markdown, setMarkdown] = useState('');
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('highlight_issue');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-exp');
  const [googleSlidesId, setGoogleSlidesId] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // UI State
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [orientation, setOrientation] = useState('landscape');
  const [selectedSlideIndices, setSelectedSlideIndices] = useState([]);
  const [slideThemes, setSlideThemes] = useState({});
  const [templateCategory, setTemplateCategory] = useState('All');
  const [showTemplates, setShowTemplates] = useState(true);
  const [editorWidth, setEditorWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Presentation Mode State
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [shareType, setShareType] = useState('announcement');
  const [shareText, setShareText] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [sharingToClassroom, setSharingToClassroom] = useState(false);

  // Cycle through loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  // Resizer drag handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(280, Math.min(e.clientX, window.innerWidth - 600));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Themes
  const themes = {
    highlight_issue: { name: "Highlight Issue", category: "Pitch Deck", previewColor: "#ffffff", bgColor: "#000000", cardColor: "#000000", textColor: "#ffffff", headerColor: "#000000" },
    default: { name: "Professional Card", category: "Business", previewColor: "#268f80", bgColor: "#f5f5f0", cardColor: "#ffffff", textColor: "#333333" },
    dark: { name: "Dark Modern", category: "Business", previewColor: "#3399db", bgColor: "#1a1a1e", cardColor: "#2e2e33", textColor: "#e6e6e6" },
    light: { name: "Clean Light", category: "Business", previewColor: "#4d4d4d", bgColor: "#ffffff", cardColor: "#fafafa", textColor: "#1a1a1a" },
    quarterly: { name: "Quarterly Report", category: "Business", previewColor: "#1a3366", bgColor: "#f2f2f8", cardColor: "#ffffff", textColor: "#33334d" },
    bw_simple: { name: "B&W Simple", category: "Cover", previewColor: "#ffffff", bgColor: "#000000", cardColor: "#000000", textColor: "#ffffff" },
    product_pitch: { name: "Showstopping Pitch", category: "Cover", previewColor: "#ffffff", bgColor: "#000000", cardColor: "#000000", textColor: "#ffffff" },
    vibrant_yellow: { name: "Vibrant Yellow", category: "Cover", previewColor: "#ffd700", bgColor: "#333333", cardColor: "#333333", textColor: "#ffd700" },
    academic: { name: "Academic Blue", category: "Lecture", previewColor: "#1a4d99", bgColor: "#f2f7ff", cardColor: "#ffffff", textColor: "#1a1a33" },
    blackboard: { name: "Blackboard", category: "Lecture", previewColor: "#e6cc66", bgColor: "#334d40", cardColor: "#40594d", textColor: "#ffffff" },
    startup: { name: "Startup Bold", category: "Pitch Deck", previewColor: "#ff4d00", bgColor: "#ffffff", cardColor: "#fafafa", textColor: "#1a1a1a" },
    investor: { name: "Investor Clean", category: "Pitch Deck", previewColor: "#1a1a66", bgColor: "#fafafe", cardColor: "#ffffff", textColor: "#333333" }
  };

  // Keyboard Navigation for Presentation Mode
  useEffect(() => {
    if (!isPresenting) return;
    const handleKeyDown = (e) => {
      const slides = markdown.split(/^---$/m);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsPresenting(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, markdown]);

  // Helper Functions
  const updateMarkdown = (newMarkdown) => {
    setHistory(prev => [...prev, markdown]);
    setMarkdown(newMarkdown);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    setMarkdown(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
  };

  const startPresentation = () => {
    setCurrentSlideIndex(selectedSlideIndices.length > 0 ? selectedSlideIndices[0] : 0);
    setIsPresenting(true);
  };

  // API Handlers
  const handleConvert = async () => {
    const title = window.prompt("프레젠테이션 제목을 입력하세요:", "My Presentation");
    if (!title) return;
    setLoading(true);
    setLoadingMessageIndex(0);
    setResult(null);
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, title, themeId: selectedTheme, slideThemes, aspectRatio, orientation }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
        setGoogleSlidesId(data.presentationId);
      } else {
        alert('구조적인 조정이 필요합니다: ' + data.error);
      }
    } catch (error) {
      alert('연결에 문제가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportLocal = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    setLoading(true);
    setLoadingMessageIndex(0);
    setGoogleSlidesId(null);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const endpoint = isPdf ? '/api/import/pdf' : '/api/import/local';
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        alert('가져오기에 실패했습니다: ' + (errorData.error || 'Unknown error'));
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (isPdf) {
          setGoogleSlidesId(data.presentationId);
        } else {
          updateMarkdown(data.markdown);
        }
        setShowImportModal(false);
      } else {
        alert('가져오기에 실패했습니다: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const fetchDriveFiles = async () => {
    setLoadingDrive(true);
    try {
      const res = await fetch('/api/drive/list');
      const data = await res.json();
      if (data.success) setDriveFiles(data.files);
      else alert('파일 목록을 불러오지 못했습니다: ' + data.error);
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleImportDrive = async (fileId, fileName) => {
    setLoading(true);
    setLoadingMessageIndex(0);
    try {
      const res = await fetch('/api/drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName })
      });
      const data = await res.json();
      if (data.success) {
        updateMarkdown(data.markdown);
        setShowImportModal(false);
      } else {
        alert('가져오기에 실패했습니다: ' + data.error);
      }
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch('/api/classroom/courses');
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
        if (data.courses.length > 0) setSelectedCourse(data.courses[0].id);
      } else {
        alert('수업 목록을 불러오지 못했습니다: ' + data.error);
      }
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleShareToClassroom = async () => {
    if (!selectedCourse) return alert('수업을 선택해 주세요');
    if (!result?.link) return alert('공유할 프레젠테이션이 없습니다');
    setSharingToClassroom(true);
    try {
      const res = await fetch('/api/classroom/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, type: shareType, text: shareText, link: result.link })
      });
      const data = await res.json();
      if (data.success) {
        alert('준비되었습니다. 당신의 수업이 학생들에게 빛이 되기를.');
        setShowClassroomModal(false);
      } else {
        alert('공유에 실패했습니다: ' + data.error);
      }
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      setSharingToClassroom(false);
    }
  };

  const handleSave = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presentation.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleAIRefine = async (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const instruction = e.target.value.trim();
    if (!instruction) return;
    e.target.value = '생각하는 중...';
    e.target.disabled = true;
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, instruction, model: selectedModel }),
      });
      const data = await response.json();
      if (data.success) updateMarkdown(data.markdown);
      else alert('AI 응답에 문제가 발생했습니다: ' + data.error);
    } catch (err) {
      alert('연결에 문제가 발생했습니다: ' + err.message);
    } finally {
      e.target.value = '';
      e.target.disabled = false;
      e.target.focus();
    }
  };

  // Toolbar Helpers
  const wrapText = (before, after) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = markdown.substring(0, start) + before + markdown.substring(start, end) + after + markdown.substring(end);
    updateMarkdown(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, end + before.length); }, 0);
  };

  const applyHeader = (level) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    let lineStart = markdown.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = markdown.indexOf('\n', lineStart);
    const line = markdown.substring(lineStart, lineEnd === -1 ? markdown.length : lineEnd);
    const newLine = '#'.repeat(level) + ' ' + line.replace(/^#+\s*/, '');
    const newText = markdown.substring(0, lineStart) + newLine + markdown.substring(lineEnd === -1 ? markdown.length : lineEnd);
    updateMarkdown(newText);
  };

  const applyColor = (color) => wrapText(`<span style="color: ${color}">`, '</span>');

  // Slide Operations
  const addSlide = () => {
    const slides = markdown.split(/^---$/m);
    const insertIndex = selectedSlideIndices.length > 0 ? Math.max(...selectedSlideIndices) + 1 : slides.length;
    slides.splice(insertIndex, 0, '\n\n# New Slide\n\n- Content');
    updateMarkdown(slides.join('\n---\n'));
    setSelectedSlideIndices([insertIndex]);
  };

  const deleteSlides = () => {
    if (selectedSlideIndices.length === 0) return;
    const slides = markdown.split(/^---$/m).filter((_, i) => !selectedSlideIndices.includes(i));
    updateMarkdown(slides.join('\n---\n'));
    setSelectedSlideIndices([]);
  };

  const moveSlides = (direction) => {
    const slides = markdown.split(/^---$/m);
    const sorted = [...selectedSlideIndices].sort((a, b) => direction === 'up' ? a - b : b - a);
    if (direction === 'up' && sorted[0] === 0) return;
    if (direction === 'down' && sorted[0] === slides.length - 1) return;
    sorted.forEach(i => {
      const target = direction === 'up' ? i - 1 : i + 1;
      [slides[i], slides[target]] = [slides[target], slides[i]];
    });
    updateMarkdown(slides.join('\n---\n'));
    setSelectedSlideIndices(sorted.map(i => direction === 'up' ? i - 1 : i + 1));
  };

  const handleThemeSelect = (themeKey) => {
    if (selectedSlideIndices.length > 0) {
      const newThemes = { ...slideThemes };
      selectedSlideIndices.forEach(i => newThemes[i] = themeKey);
      setSlideThemes(newThemes);
    } else {
      setSelectedTheme(themeKey);
    }
  };

  // Render Helper for Styled Text
  const renderStyledText = (text) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
  };

  // Render Slide Preview
  const renderSlide = (slideContent, index, forPresentation = false) => {
    const lines = slideContent.trim().split('\n');
    const titleIndex = lines.findIndex(l => l.trim().startsWith('#'));
    const titleLine = titleIndex !== -1 ? lines[titleIndex] : null;
    const title = titleLine ? titleLine.replace(/^#+\s+/, '') : 'No Title';
    const bodyLines = lines.filter((_, i) => i !== titleIndex && lines[i].trim().length > 0);

    const themeKey = slideThemes[index] || selectedTheme;
    const theme = themes[themeKey];
    const isCover = theme.category === 'Cover';

    let ratio = aspectRatio === '4/3' ? '4 / 3' : aspectRatio === '1/1' ? '1 / 1' : '16 / 9';
    if (orientation === 'portrait') {
      const [w, h] = ratio.split(' / ');
      ratio = `${h} / ${w}`;
    }

    const isSelected = selectedSlideIndices.includes(index);
    const toggleSelection = (e) => {
      if (e.metaKey || e.ctrlKey) {
        setSelectedSlideIndices(prev => isSelected ? prev.filter(i => i !== index) : [...prev, index]);
      } else {
        setSelectedSlideIndices([index]);
      }
    };

    // Parse content blocks
    const blocks = [];
    let currentTable = [];
    bodyLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|')) {
        currentTable.push(line);
      } else {
        if (currentTable.length > 0) {
          blocks.push({ type: 'table', lines: currentTable });
          currentTable = [];
        }
        if (trimmed.startsWith('#')) {
          const level = trimmed.match(/^#+/)[0].length;
          blocks.push({ type: 'header', level, content: trimmed.replace(/^#+\s+/, '') });
        } else if (trimmed.length > 0) {
          blocks.push({ type: 'text', content: line });
        }
      }
    });
    if (currentTable.length > 0) blocks.push({ type: 'table', lines: currentTable });

    // For presentation mode, let CSS handle the sizing
    // For preview mode, use aspect ratio
    let dimensions;
    if (forPresentation) {
      // Calculate aspect ratio for presentation based on user selection
      let presRatio = aspectRatio === '4/3' ? '4 / 3' : aspectRatio === '1/1' ? '1 / 1' : '16 / 9';
      if (orientation === 'portrait') {
        const [w, h] = presRatio.split(' / ');
        presRatio = `${h} / ${w}`;
      }
      dimensions = { aspectRatio: presRatio };
    } else {
      dimensions = { width: '100%', aspectRatio: ratio };
    }

    return (
      <div
        key={`${index}-${aspectRatio}-${orientation}`}
        className={`slide-preview ${isSelected ? 'selected' : ''}`}
        style={{ backgroundColor: theme.bgColor, color: theme.textColor, ...dimensions, position: 'relative' }}
        onClick={forPresentation ? undefined : toggleSelection}
      >
        {!isCover && (
          <div className="slide-header" style={{ backgroundColor: theme.headerColor || theme.previewColor }}>
            {title}
          </div>
        )}
        {isCover && (
          <div className="slide-cover-title" style={{ color: theme.textColor }}>
            {title}
          </div>
        )}
        <div className="slide-card" style={{ backgroundColor: isCover ? 'transparent' : theme.cardColor }}>
          <div className="slide-body" style={{ color: theme.textColor }}>
            {blocks.map((block, i) => {
              if (block.type === 'table') {
                return (
                  <table key={i} className="slide-table">
                    <tbody>
                      {block.lines.map((row, rIndex) => {
                        let cells = row.split('|');
                        if (cells.length > 2) cells = cells.slice(1, -1);
                        if (cells.every(c => c.trim().match(/^:?-+:?$/))) return null;
                        const isHeader = rIndex === 0 && block.lines.length > 1 && block.lines[1].includes('---');
                        return (
                          <tr key={rIndex}>
                            {cells.map((cell, cIndex) => isHeader
                              ? <th key={cIndex}>{renderStyledText(cell.trim())}</th>
                              : <td key={cIndex}>{renderStyledText(cell.trim())}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              } else if (block.type === 'header') {
                const Tag = `h${Math.min(block.level, 6)}`;
                const fontSize = block.level === 1 ? '1.5em' : block.level === 2 ? '1.3em' : '1.1em';
                return <Tag key={i} style={{ color: theme.previewColor, fontSize, marginTop: '0.5em', marginBottom: '0.2em', fontWeight: 'bold' }}>{renderStyledText(block.content)}</Tag>;
              } else {
                const line = block.content;
                return (
                  <div key={i} className="slide-line">
                    {!isCover && line.startsWith('- ') && <span className="bullet" style={{ color: theme.previewColor }}>•</span>}
                    {renderStyledText(line.replace(/^- /, ''))}
                  </div>
                );
              }
            })}
          </div>
        </div>
        <div className="slide-footer" style={{ backgroundColor: theme.headerColor || theme.previewColor }}>
          Forma.ai | Poetic Tech by Lucere
        </div>
      </div>
    );
  };

  // Preview Content
  const previewContent = googleSlidesId ? (
    <div className="slides-embed-container">
      <div className="slides-embed-header">
        <span className="slides-embed-title">Google Slides 미리보기</span>
        <div className="app-bar-section">
          <button className="forma-btn forma-btn-primary" onClick={() => { fetchCourses(); setShowClassroomModal(true); }}>
            Classroom에 공유
          </button>
          <button className="forma-btn forma-btn-ghost" onClick={() => setGoogleSlidesId(null)}>닫기</button>
        </div>
      </div>
      <iframe
        className="slides-embed-frame"
        src={`https://docs.google.com/presentation/d/${googleSlidesId}/embed?start=false&loop=false&delayms=3000`}
        allowFullScreen
      />
    </div>
  ) : markdown.trim() ? (
    markdown.split(/^---$/m).map((slide, i) => renderSlide(slide, i))
  ) : (
    <div className="empty-state">
      당신의 통찰을 이곳에 적어 내려가세요.<br />
      Forma.ai가 아름답게 빚어내겠습니다.
    </div>
  );

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="auth-loading">
        <LoadingSpinner />
        <span className="loading-text">연결 중...</span>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={checkAuthStatus} loading={authLoading} />;
  }

  return (
    <div className="app-container">
      {/* App Bar */}
      <header className="app-bar">
        <div className="app-bar-section">
          <h1 className="app-bar-title"><span className="app-bar-logo">Forma</span>.ai</h1>
          <select className="forma-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} title="비율">
            <option value="16/9">16:9</option>
            <option value="4/3">4:3</option>
            <option value="1/1">1:1</option>
          </select>
          <button className="forma-btn-icon" onClick={() => setOrientation(p => p === 'landscape' ? 'portrait' : 'landscape')} title="방향 전환">
            {orientation === 'landscape' ? '⬒' : '⬓'}
          </button>
        </div>
        <div className="app-bar-section">
          {user && (
            <div className="user-info">
              {user.picture && <img src={user.picture} alt="" className="user-avatar" />}
              <span className="user-name">{user.name}</span>
            </div>
          )}
          <button className="forma-btn forma-btn-ghost" onClick={handleLogout}>로그아웃</button>
          <button className="forma-btn forma-btn-ghost" onClick={handleSave}>저장</button>
          <button className="forma-btn forma-btn-outlined" onClick={() => setShowImportModal(true)} disabled={loading}>가져오기</button>
          <button className="forma-btn forma-btn-transform" onClick={handleConvert} disabled={loading}>
            {loading ? '형상화 중...' : 'Shape it'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`app-main ${isResizing ? 'resizing' : ''}`}>
        {/* Editor Panel */}
        <div className="editor-panel" style={{ width: editorWidth, flexShrink: 0 }}>
          <div className="editor-header">
            <span className="editor-header-title">Editor</span>
          </div>
          <div className="editor-toolbar">
            <button className="forma-btn-icon" onClick={() => wrapText('**', '**')} title="Bold"><b>B</b></button>
            <div className="editor-toolbar-divider" />
            <button className="forma-btn-icon" onClick={() => applyHeader(1)} title="제목 1">H1</button>
            <button className="forma-btn-icon" onClick={() => applyHeader(2)} title="제목 2">H2</button>
            <button className="forma-btn-icon" onClick={() => applyHeader(3)} title="제목 3">H3</button>
            <div className="editor-toolbar-divider" />
            <select className="forma-select" onChange={(e) => { if (e.target.value) applyColor(e.target.value); e.target.value = ''; }} title="글자 색상">
              <option value="">색상</option>
              <option value="#ff0000">빨강</option>
              <option value="#00aa00">초록</option>
              <option value="#0066cc">파랑</option>
              <option value="#ff9900">주황</option>
            </select>
          </div>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="당신의 통찰을 이곳에 적어 내려가세요...&#10;&#10;# 제목&#10;- 내용&#10;&#10;---&#10;&#10;# 다음 슬라이드"
          />
        </div>

        {/* Resizer */}
        <div className="panel-resizer" onMouseDown={handleResizeStart} />

        {/* Preview Panel */}
        <div className="preview-panel">
          <div className="preview-header">
            <span className="preview-header-title">Preview</span>
            <div className="preview-toolbar">
              <button className="forma-btn forma-btn-primary" onClick={startPresentation}>PT Mode</button>
              <button className="forma-btn-icon" onClick={addSlide} title="슬라이드 추가">+</button>
              <button className="forma-btn-icon" onClick={deleteSlides} disabled={selectedSlideIndices.length === 0} title="삭제">🗑</button>
              <button className="forma-btn-icon" onClick={() => moveSlides('up')} disabled={selectedSlideIndices.length === 0 || selectedSlideIndices.includes(0)} title="위로">↑</button>
              <button className="forma-btn-icon" onClick={() => moveSlides('down')} disabled={selectedSlideIndices.length === 0 || selectedSlideIndices.includes(markdown.split(/^---$/m).length - 1)} title="아래로">↓</button>
            </div>
          </div>
          <div className="slides-container">{previewContent}</div>

          {/* AI Assistant */}
          <div className="ai-panel">
            <div className="ai-header">
              <span className="ai-header-title">
                AI 어시스턴트
                {history.length > 0 && <button className="forma-btn forma-btn-ghost" onClick={handleUndo}>되돌리기</button>}
              </span>
              <select className="forma-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div className="ai-input-container">
              <input className="ai-input" type="text" placeholder="슬라이드를 어떻게 다듬어 드릴까요?" onKeyDown={handleAIRefine} />
            </div>
          </div>
        </div>

        {/* Templates Panel */}
        <div className={`templates-panel ${showTemplates ? '' : 'collapsed'}`}>
          <div className="templates-header">
            {showTemplates && <span className="templates-header-title">Templates</span>}
            <button className="forma-btn-icon" onClick={() => setShowTemplates(!showTemplates)}>
              {showTemplates ? '»' : '«'}
            </button>
          </div>
          {showTemplates && (
            <>
              <div className="templates-filter">
                <select className="forma-select" style={{ width: '100%' }} value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)}>
                  <option value="All">전체</option>
                  <option value="Cover">커버</option>
                  <option value="Business">비즈니스</option>
                  <option value="Lecture">강의</option>
                  <option value="Pitch Deck">피치덱</option>
                </select>
              </div>
              <div className="template-list">
                {Object.entries(themes)
                  .filter(([, t]) => templateCategory === 'All' || t.category === templateCategory)
                  .map(([key, theme]) => (
                    <div
                      key={key}
                      className={`template-item ${selectedTheme === key && selectedSlideIndices.length === 0 ? 'selected' : ''}`}
                      onClick={() => handleThemeSelect(key)}
                    >
                      <div className="template-thumbnail" style={{ backgroundColor: theme.bgColor }}>
                        <div className="thumb-header" style={{ backgroundColor: theme.previewColor }} />
                        <div className="thumb-card" style={{ backgroundColor: theme.cardColor }} />
                      </div>
                      <div className="template-name">{theme.name}</div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading Overlay (Poetic Progress) */}
      {loading && (
        <div className="loading-overlay">
          <LoadingSpinner />
          <span className="loading-text">{LOADING_MESSAGES[loadingMessageIndex].text}</span>
          <span className="loading-subtext">{LOADING_MESSAGES[loadingMessageIndex].subtext}</span>
        </div>
      )}

      {/* Presentation Mode */}
      {isPresenting && (
        <div className="presentation-overlay">
          <div className="presentation-content">
            {renderSlide(markdown.split(/^---$/m)[currentSlideIndex], currentSlideIndex, true)}
          </div>
          <div className="presentation-controls">
            <button className="forma-btn forma-btn-primary" onClick={() => setCurrentSlideIndex(p => Math.max(p - 1, 0))} disabled={currentSlideIndex === 0}>이전</button>
            <span>{currentSlideIndex + 1} / {markdown.split(/^---$/m).length}</span>
            <button className="forma-btn forma-btn-primary" onClick={() => setCurrentSlideIndex(p => Math.min(p + 1, markdown.split(/^---$/m).length - 1))} disabled={currentSlideIndex === markdown.split(/^---$/m).length - 1}>다음</button>
            <button className="forma-btn forma-btn-transform" onClick={() => setIsPresenting(false)}>종료</button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="forma-dialog-overlay" onClick={() => setShowImportModal(false)}>
          <div className="forma-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="forma-dialog-title">파일 가져오기</h2>
            <div className="forma-dialog-content">
              <div className="form-field">
                <label className="section-header">로컬 파일</label>
                <div className="file-input-wrapper">
                  <input type="file" onChange={handleImportLocal} accept=".md,.txt,.pdf,.docx,.pptx,.xlsx" />
                </div>
                <p className="helper-text">지원 형식: .md, .pdf, .docx, .pptx, .xlsx</p>
              </div>
              <div className="forma-divider" />
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="section-header" style={{ marginBottom: 0 }}>Google Drive</label>
                  <button className="forma-btn forma-btn-ghost" onClick={fetchDriveFiles} disabled={loadingDrive}>
                    {loadingDrive ? '불러오는 중...' : '새로고침'}
                  </button>
                </div>
                {driveFiles.length > 0 ? (
                  <ul className="file-list">
                    {driveFiles.map(file => (
                      <li key={file.id} className="file-list-item" onClick={() => handleImportDrive(file.id, file.name)}>
                        <span className="file-list-item-icon">📄</span>
                        <span className="file-list-item-name">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">새로고침을 눌러 파일을 불러오세요</p>
                )}
              </div>
            </div>
            <div className="forma-dialog-actions">
              <button className="forma-btn forma-btn-ghost" onClick={() => setShowImportModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Modal */}
      {showClassroomModal && (
        <div className="forma-dialog-overlay" onClick={() => setShowClassroomModal(false)}>
          <div className="forma-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="forma-dialog-title">Google Classroom에 공유</h2>
            <div className="forma-dialog-content">
              {loadingCourses ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /></div>
              ) : (
                <>
                  <div className="form-field">
                    <label>수업 선택</label>
                    <select className="forma-select" style={{ width: '100%' }} value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>게시 유형</label>
                    <select className="forma-select" style={{ width: '100%' }} value={shareType} onChange={(e) => setShareType(e.target.value)}>
                      <option value="announcement">스트림 (공지)</option>
                      <option value="material">수업 자료</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>메시지</label>
                    <textarea className="ai-input" style={{ borderRadius: '8px', minHeight: '80px' }} value={shareText} onChange={(e) => setShareText(e.target.value)} placeholder="학생들에게 전할 메시지를 작성하세요..." />
                  </div>
                </>
              )}
            </div>
            <div className="forma-dialog-actions">
              <button className="forma-btn forma-btn-ghost" onClick={() => setShowClassroomModal(false)}>취소</button>
              <button className="forma-btn forma-btn-transform" onClick={handleShareToClassroom} disabled={sharingToClassroom}>
                {sharingToClassroom ? '전송 중...' : '공유하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
