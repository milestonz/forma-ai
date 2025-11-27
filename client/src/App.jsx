import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [markdown, setMarkdown] = useState(`# Sample Slide Title

- Bullet point 1
- Bullet point 2
- **Bold Text**

---

# Second Slide

- More content here
`);
  const [history, setHistory] = useState([]);
  const textareaRef = React.useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-exp');
  const [googleSlidesId, setGoogleSlidesId] = useState(null);
  
  // UI State
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [orientation, setOrientation] = useState('landscape');
  const [selectedSlideIndices, setSelectedSlideIndices] = useState([]);
  const [slideThemes, setSlideThemes] = useState({});

  const [templateCategory, setTemplateCategory] = useState('All');
  const [showTemplates, setShowTemplates] = useState(true);

  // Presentation Mode State
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(false);

  // Keyboard Navigation for Presentation Mode
  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyDown = (e) => {
      const slides = markdown.split(/^---$/m);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
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

  const startPresentation = () => {
      if (selectedSlideIndices.length > 0) {
          setCurrentSlideIndex(selectedSlideIndices[0]);
      } else {
          setCurrentSlideIndex(0);
      }
      setIsPresenting(true);
  };

  // ... (existing renderPreview function) ...

  // Helper to render a single slide for presentation
  const renderSingleSlide = (slideContent, index) => {
      // Reuse logic from renderPreview but return just the slide content
      // We need to wrap it in a scaler to fit the screen
      const lines = slideContent.trim().split('\n');
      const titleLine = lines.find(l => l.startsWith('#'));
      const title = titleLine ? titleLine.replace(/^#+\s+/, '') : 'No Title';
      
      const themeKey = slideThemes[index] || selectedTheme;
      const theme = themes[themeKey];
      const isCover = theme.category === 'Cover';

      // Dimensions
      let width = 1280; // Base width for high quality
      let height = 720; // Default 16:9

      if (aspectRatio === '4/3') { width = 960; height = 720; }
      if (aspectRatio === '1/1') { width = 720; height = 720; }

      if (orientation === 'portrait') {
          const temp = width;
          width = height;
          height = temp;
      }

      return (
          <div 
            className="presentation-slide"
            style={{ 
                backgroundColor: theme.bgColor, 
                color: theme.textColor,
                width: `${width}px`,
                height: `${height}px`,
                position: 'relative',
                overflow: 'hidden'
            }}
          >
            {!isCover && <div className="slide-header" style={{ backgroundColor: theme.previewColor, height: '80px', fontSize: '32px', paddingLeft: '40px' }}>{title}</div>}
            {isCover && (
                <div style={{ 
                    position: 'absolute', 
                    top: '80px', 
                    left: '80px', 
                    right: '80px', 
                    fontSize: '64px', 
                    fontWeight: 'bold',
                    color: theme.textColor 
                }}>
                    {title}
                </div>
            )}
            <div className="slide-card" style={{ 
                backgroundColor: isCover ? 'transparent' : theme.cardColor,
                top: '120px',
                left: '40px',
                right: '40px',
                bottom: '60px',
                padding: '40px',
                borderRadius: '16px'
            }}>
                <div className="slide-body" style={{ fontSize: '24px' }}>
                {(() => {
                    const lines = slideContent.trim().split('\n');
                    const bodyLines = lines.filter(l => !l.startsWith('#'));
                    
                    const blocks = [];
                    let currentTable = [];
                    
                    bodyLines.forEach(line => {
                        if (line.trim().startsWith('|')) {
                            currentTable.push(line);
                        } else {
                            if (currentTable.length > 0) {
                                blocks.push({ type: 'table', lines: currentTable });
                                currentTable = [];
                            }
                            if (line.trim().length > 0) {
                                blocks.push({ type: 'text', content: line });
                            }
                        }
                    });
                    if (currentTable.length > 0) {
                        blocks.push({ type: 'table', lines: currentTable });
                    }

                    // Helper to render text with bold support
                    const renderStyledText = (text) => {
                        const parts = text.split(/(\*\*.*?\*\*)/g);
                        return parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={j}>{part}</span>;
                        });
                    };

                    return blocks.map((block, i) => {
                        if (block.type === 'table') {
                            return (
                                <table key={i} className="slide-table" style={{ fontSize: '0.9em' }}>
                                    <tbody>
                                        {block.lines.map((row, rIndex) => {
                                            let cells = row.split('|');
                                            if (cells.length > 2) cells = cells.slice(1, -1);
                                            if (cells.every(c => c.trim().match(/^:?-+:?$/))) return null;
                                            
                                            const isHeader = rIndex === 0 && block.lines.length > 1 && block.lines[1].includes('---');

                                            return (
                                                <tr key={rIndex}>
                                                    {cells.map((cell, cIndex) => {
                                                        const cellContent = cell.trim();
                                                        return isHeader ? (
                                                            <th key={cIndex} style={{ padding: '12px 16px' }}>{renderStyledText(cellContent)}</th>
                                                        ) : (
                                                            <td key={cIndex} style={{ padding: '12px 16px' }}>{renderStyledText(cellContent)}</td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        } else {
                            const line = block.content;
                            return (
                                <div key={i} className="slide-line" style={{ marginBottom: '16px' }}>
                                    {!isCover && line.startsWith('- ') && <span className="bullet" style={{ color: theme.previewColor, marginRight: '10px' }}>• </span>}
                                    {renderStyledText(line.replace(/^- /, ''))}
                                </div>
                            );
                        }
                    });
                })()}
                </div>
            </div>
            <div className="slide-footer" style={{ backgroundColor: theme.previewColor, height: '40px', fontSize: '16px', paddingLeft: '40px' }}>2WINGS Coaching Mastery Program - AI Module | 2025, Milestonz</div>
          </div>
      );
  };

  const themes = {
    // --- Business ---
    default: {
      name: "Professional Card",
      category: "Business",
      previewColor: "#268f80",
      bgColor: "#f5f5f0",
      cardColor: "#ffffff",
      textColor: "#333333"
    },
    dark: {
      name: "Dark Modern",
      category: "Business",
      previewColor: "#3399db",
      bgColor: "#1a1a1e",
      cardColor: "#2e2e33",
      textColor: "#e6e6e6"
    },
    light: {
      name: "Clean Light",
      category: "Business",
      previewColor: "#4d4d4d",
      bgColor: "#ffffff",
      cardColor: "#fafafa",
      textColor: "#1a1a1a"
    },
    quarterly: {
      name: "Quarterly Report",
      category: "Business",
      previewColor: "#1a3366",
      bgColor: "#f2f2f8",
      cardColor: "#ffffff",
      textColor: "#33334d"
    },
    // --- Cover ---
    bw_simple: {
      name: "B&W Simple",
      category: "Cover",
      previewColor: "#ffffff",
      bgColor: "#000000",
      cardColor: "#000000",
      textColor: "#ffffff"
    },
    product_pitch: {
      name: "Showstopping Pitch",
      category: "Cover",
      previewColor: "#ffffff",
      bgColor: "#000000",
      cardColor: "#000000",
      textColor: "#ffffff"
    },
    vibrant_yellow: {
      name: "Vibrant Yellow",
      category: "Cover",
      previewColor: "#ffd700",
      bgColor: "#333333",
      cardColor: "#333333",
      textColor: "#ffd700"
    },
    // --- Lecture ---
    academic: {
      name: "Academic Blue",
      category: "Lecture",
      previewColor: "#1a4d99",
      bgColor: "#f2f7ff",
      cardColor: "#ffffff",
      textColor: "#1a1a33"
    },
    blackboard: {
      name: "Blackboard",
      category: "Lecture",
      previewColor: "#e6cc66",
      bgColor: "#334d40",
      cardColor: "#40594d",
      textColor: "#ffffff"
    },
    // --- Pitch Deck ---
    startup: {
      name: "Startup Bold",
      category: "Pitch Deck",
      previewColor: "#ff4d00",
      bgColor: "#ffffff",
      cardColor: "#fafafa",
      textColor: "#1a1a1a"
    },
    investor: {
      name: "Investor Clean",
      category: "Pitch Deck",
      previewColor: "#1a1a66",
      bgColor: "#fafafe",
      cardColor: "#ffffff",
      textColor: "#333333"
    }
  };

  const updateMarkdown = (newMarkdown) => {
    setHistory(prev => [...prev, markdown]);
    setMarkdown(newMarkdown);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousMarkdown = history[history.length - 1];
    setMarkdown(previousMarkdown);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleConvert = async () => {
    const title = window.prompt("Please enter a title for the presentation:", "My Presentation");
    if (!title) return; // Cancelled

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          markdown, 
          title, 
          themeId: selectedTheme,
          aspectRatio,
          orientation
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error connecting to server: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportLocal = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      setLoading(true);
      setGoogleSlidesId(null); // Reset previous slides

      try {
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
              // Handle PDF Import
              const res = await fetch('/api/import/pdf', {
                  method: 'POST',
                  body: formData
              });
              const data = await res.json();
              if (data.success) {
                  setGoogleSlidesId(data.presentationId);
                  setShowImportModal(false);
              } else {
                  alert('PDF Import failed: ' + data.error);
              }
          } else {
              // Handle other files (Markdown, etc.)
              const res = await fetch('/api/import/local', {
                  method: 'POST',
                  body: formData
              });
              const data = await res.json();
              if (data.success) {
                  updateMarkdown(data.markdown);
                  setShowImportModal(false);
              } else {
                  alert('Import failed: ' + data.error);
              }
          }
      } catch (err) {
          alert('Error: ' + err.message);
      } finally {
          setLoading(false);
          // Reset input
          e.target.value = null;
      }
  };

  const fetchDriveFiles = async () => {
      setLoadingDrive(true);
      try {
          const res = await fetch('/api/drive/list');
          const data = await res.json();
          if (data.success) {
              setDriveFiles(data.files);
          } else {
              alert('Failed to list Drive files: ' + data.error);
          }
      } catch (err) {
          alert('Error: ' + err.message);
      } finally {
          setLoadingDrive(false);
      }
  };

  const handleImportDrive = async (fileId, fileName) => {
      setLoading(true);
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
              alert('Import failed: ' + data.error);
          }
      } catch (err) {
          alert('Error: ' + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSave = () => {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // --- Toolbar Helpers ---
  const insertText = (text) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = markdown;
      const newText = currentText.substring(0, start) + text + currentText.substring(end);
      
      updateMarkdown(newText);
      
      // Restore selection/cursor
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
  };

  const wrapText = (before, after) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = markdown;
      const selectedText = currentText.substring(start, end);
      
      const newText = currentText.substring(0, start) + before + selectedText + after + currentText.substring(end);
      
      updateMarkdown(newText);
      
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, end + before.length);
      }, 0);
  };

  const applyHeader = (level) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const currentText = markdown;
      
      // Find start of line
      let lineStart = currentText.lastIndexOf('\n', start - 1) + 1;
      if (lineStart === -1) lineStart = 0;
      
      // Check if already has header
      const lineEnd = currentText.indexOf('\n', lineStart);
      const lineContent = currentText.substring(lineStart, lineEnd === -1 ? currentText.length : lineEnd);
      
      let newLineContent = lineContent;
      if (lineContent.startsWith('#')) {
          // Remove existing header
          newLineContent = lineContent.replace(/^#+\s*/, '');
      }
      
      // Add new header
      const hashes = '#'.repeat(level);
      newLineContent = `${hashes} ${newLineContent}`;
      
      const newText = currentText.substring(0, lineStart) + newLineContent + currentText.substring(lineEnd === -1 ? currentText.length : lineEnd);
      
      updateMarkdown(newText);
      
      setTimeout(() => {
          textarea.focus();
          // Cursor at end of line
          const newCursorPos = lineStart + newLineContent.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };

  const applyColor = (color) => {
      wrapText(`<span style="color: ${color}">`, '</span>');
  };

  const handleCopy = async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const text = markdown.substring(textarea.selectionStart, textarea.selectionEnd);
      if (!text) return;
      
      try {
          await navigator.clipboard.writeText(text);
      } catch (err) {
          console.error('Failed to copy:', err);
      }
  };

  const handleCut = async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = markdown.substring(start, end);
      if (!text) return;
      
      try {
          await navigator.clipboard.writeText(text);
          const newText = markdown.substring(0, start) + markdown.substring(end);
          updateMarkdown(newText);
          setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start);
          }, 0);
      } catch (err) {
          console.error('Failed to cut:', err);
      }
  };

  const handlePaste = async () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      try {
          const text = await navigator.clipboard.readText();
          insertText(text);
      } catch (err) {
          console.error('Failed to paste:', err);
          alert('Please allow clipboard access to paste.');
      }
  };

  // Simple Preview Parser (Approximation)
  const renderPreview = (md) => {
    const slides = md.split(/^---$/m);

    return slides.map((slide, index) => {
      const lines = slide.trim().split('\n');
      // Find the first line starting with # as the title
      const titleIndex = lines.findIndex(l => l.trim().startsWith('#'));
      const titleLine = titleIndex !== -1 ? lines[titleIndex] : null;
      const title = titleLine ? titleLine.replace(/^#+\s+/, '') : 'No Title';
      
      // Filter out ONLY the main title line, keep other headers
      const bodyLines = lines.filter((_, i) => i !== titleIndex && lines[i].trim().length > 0);

      // Determine Theme
      const themeKey = slideThemes[index] || selectedTheme;
      const theme = themes[themeKey];

      // Determine Dimensions
      // Use CSS aspect-ratio instead of fixed pixels
      let ratio = '16 / 9';
      if (aspectRatio === '4/3') ratio = '4 / 3';
      if (aspectRatio === '1/1') ratio = '1 / 1';

      if (orientation === 'portrait') {
          const [w, h] = ratio.split(' / ');
          ratio = `${h} / ${w}`;
      }

      // Handle Selection
      const isSelected = selectedSlideIndices.includes(index);
      const toggleSelection = (e) => {
          if (e.metaKey || e.ctrlKey) {
              // Multi-select
              if (isSelected) {
                  setSelectedSlideIndices(prev => prev.filter(i => i !== index));
              } else {
                  setSelectedSlideIndices(prev => [...prev, index]);
              }
          } else {
              // Single select
              setSelectedSlideIndices([index]);
          }
      };

      const isCover = theme.category === 'Cover';

      return (
        <div 
            key={`${index}-${aspectRatio}-${orientation}`} 
            className={`slide-preview ${isSelected ? 'selected' : ''}`} 
            style={{ 
                backgroundColor: theme.bgColor, 
                color: theme.textColor,
                width: '100%',
                aspectRatio: ratio,
                position: 'relative'
            }}
            onClick={toggleSelection}
        >
          {!isCover && <div className="slide-header" style={{ backgroundColor: theme.previewColor }}>{title}</div>}
          {isCover && (
              <div style={{ 
                  position: 'absolute', 
                  top: '40px', 
                  left: '40px', 
                  right: '40px', 
                  fontSize: '32px', 
                  fontWeight: 'bold',
                  color: theme.textColor 
              }}>
                  {title}
              </div>
          )}
          <div className="slide-card" style={{ backgroundColor: isCover ? 'transparent' : theme.cardColor }}>
            <div className="slide-body">
              {(() => {
                  const blocks = [];
                  let currentTable = [];
                  
                  bodyLines.forEach(line => {
                      const trimmedLine = line.trim();
                      if (trimmedLine.startsWith('|')) {
                          currentTable.push(line);
                      } else {
                          if (currentTable.length > 0) {
                              blocks.push({ type: 'table', lines: currentTable });
                              currentTable = [];
                          }
                          
                          if (trimmedLine.startsWith('#')) {
                              const level = trimmedLine.match(/^#+/)[0].length;
                              const content = trimmedLine.replace(/^#+\s+/, '');
                              blocks.push({ type: 'header', level, content });
                          } else if (trimmedLine.length > 0) {
                              blocks.push({ type: 'text', content: line });
                          }
                      }
                  });
                  if (currentTable.length > 0) {
                      blocks.push({ type: 'table', lines: currentTable });
                  }

                  // Helper to render text with bold support
                  const renderStyledText = (text) => {
                      const parts = text.split(/(\*\*.*?\*\*)/g);
                      return parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={j}>{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                      });
                  };

                  return blocks.map((block, i) => {
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
                                                  {cells.map((cell, cIndex) => {
                                                      const cellContent = cell.trim();
                                                      return isHeader ? (
                                                          <th key={cIndex}>{renderStyledText(cellContent)}</th>
                                                      ) : (
                                                          <td key={cIndex}>{renderStyledText(cellContent)}</td>
                                                      );
                                                  })}
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          );
                      } else if (block.type === 'header') {
                          // Dynamic header tag
                          const Tag = `h${Math.min(block.level, 6)}`;
                          // Adjust font size based on level relative to slide body
                          const fontSize = block.level === 1 ? '1.5em' : 
                                         block.level === 2 ? '1.3em' : 
                                         block.level === 3 ? '1.1em' : '1em';
                          
                          return (
                              <Tag key={i} style={{ 
                                  color: theme.previewColor, 
                                  fontSize: fontSize,
                                  marginTop: '0.5em', 
                                  marginBottom: '0.2em',
                                  fontWeight: 'bold'
                              }}>
                                  {renderStyledText(block.content)}
                              </Tag>
                          );
                      } else {
                          const line = block.content;
                          return (
                              <div key={i} className="slide-line">
                                  {!isCover && line.startsWith('- ') && <span className="bullet" style={{ color: theme.previewColor }}>• </span>}
                                  {renderStyledText(line.replace(/^- /, ''))}
                              </div>
                          );
                      }
                  });
              })()}
            </div>
          </div>
          <div className="slide-footer" style={{ backgroundColor: theme.previewColor }}>2WINGS Coaching Mastery Program - AI Module | 2025, Milestonz</div>
        </div>
      );
    });
  };

  const handleThemeSelect = (themeKey) => {
    if (selectedSlideIndices.length > 0) {
      // Apply to selected slides
      const newSlideThemes = { ...slideThemes };
      selectedSlideIndices.forEach(index => {
        newSlideThemes[index] = themeKey;
      });
      setSlideThemes(newSlideThemes);
    } else {
      // Apply globally
      setSelectedTheme(themeKey);
    }
  };

  // Preview Content
  const previewContent = googleSlidesId ? (
      <div className="google-slides-preview" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>Google Slides Preview</strong></span>
              <button onClick={() => setGoogleSlidesId(null)} style={{ padding: '5px 10px', fontSize: '0.8em' }}>Close Preview</button>
          </div>
          <iframe 
              src={`https://docs.google.com/presentation/d/${googleSlidesId}/embed?start=false&loop=false&delayms=3000`} 
              frameBorder="0" 
              width="100%" 
              height="100%" 
              allowFullScreen={true} 
              mozallowfullscreen="true" 
              webkitallowfullscreen="true"
              style={{ flex: 1 }}
          ></iframe>
      </div>
  ) : (
      renderPreview(markdown)
  );

  return (
    <div className="app-container">
      {/* Presentation Overlay */}
      {isPresenting && (
          <div className="presentation-overlay">
              <div className="presentation-content">
                  {renderSingleSlide(markdown.split(/^---$/m)[currentSlideIndex], currentSlideIndex)}
              </div>
              <div className="presentation-controls">
                  <button onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))} disabled={currentSlideIndex === 0}>Prev</button>
                  <span>{currentSlideIndex + 1} / {markdown.split(/^---$/m).length}</span>
                  <button onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, markdown.split(/^---$/m).length - 1))} disabled={currentSlideIndex === markdown.split(/^---$/m).length - 1}>Next</button>
                  <button onClick={() => setIsPresenting(false)} style={{ marginLeft: '20px', backgroundColor: '#d9534f' }}>Exit</button>
              </div>
          </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }} onClick={() => setShowImportModal(false)}>
              <div style={{
                  backgroundColor: '#2e2e33', padding: '20px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto', color: 'white'
              }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ marginTop: 0 }}>Import File</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ borderBottom: '1px solid #444', paddingBottom: '5px' }}>Local File</h4>
                      <input type="file" onChange={handleImportLocal} accept=".md,.txt,.pdf,.docx,.pptx,.xlsx,.xls,application/pdf,text/plain,text/markdown" style={{ width: '100%' }} />
                      <p style={{ fontSize: '0.8em', color: '#aaa' }}>Supported: .md, .pdf, .docx, .pptx, .xlsx</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0 }}>Google Drive</h4>
                          <button onClick={fetchDriveFiles} disabled={loadingDrive} style={{ padding: '5px 10px', fontSize: '0.8em' }}>
                              {loadingDrive ? 'Loading...' : 'Refresh List'}
                          </button>
                      </div>
                      
                      {driveFiles.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid #444' }}>
                              {driveFiles.map(file => (
                                  <li key={file.id} 
                                      onClick={() => handleImportDrive(file.id, file.name)}
                                      style={{ padding: '8px', borderBottom: '1px solid #444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#444'}
                                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                      <span style={{ marginRight: '10px' }}>📄</span>
                                      {file.name}
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          <p style={{ color: '#aaa', fontStyle: 'italic' }}>Click Refresh to load files.</p>
                      )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                      <button onClick={() => setShowImportModal(false)} style={{ padding: '8px 16px', backgroundColor: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Editor Pane) */}
      <div className="editor-pane">
        <div className="pane-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2>Markdown Editor</h2>
                <div className="toolbar">
                    <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        style={{ 
                            backgroundColor: '#444', 
                            color: 'white', 
                            border: '1px solid #555', 
                            padding: '5px', 
                            borderRadius: '4px',
                            marginRight: '5px'
                        }}
                        title="Aspect Ratio"
                    >
                        <option value="16/9">16:9</option>
                        <option value="4/3">4:3</option>
                        <option value="1/1">1:1</option>
                    </select>
                    <button 
                        className="tool-btn" 
                        onClick={() => setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
                        title="Toggle Orientation"
                    >
                        {orientation === 'landscape' ? '⬒' : '⬓'}
                    </button>
                </div>
            </div>
            <button onClick={handleSave} style={{ marginRight: '10px', backgroundColor: '#555' }} title="Save to local file">
                💾 Save
            </button>
            <button onClick={() => setShowImportModal(true)} disabled={loading} style={{ marginRight: '10px', backgroundColor: '#555' }}>
                📂 Import
            </button>
            <button onClick={handleConvert} disabled={loading} style={{ padding: '8px 12px', fontSize: '0.9em' }}>
                {loading ? 'Converting...' : 'Google Slides'}
            </button>
        </div>
        <div className="editor-toolbar" style={{ 
            display: 'flex', gap: '5px', padding: '5px', backgroundColor: '#333', borderBottom: '1px solid #444', flexWrap: 'wrap' 
        }}>
            <button className="tool-btn" onClick={() => wrapText('**', '**')} title="Bold"><b>B</b></button>
            <div style={{ width: '1px', backgroundColor: '#555', margin: '0 5px' }}></div>
            <button className="tool-btn" onClick={() => applyHeader(1)} title="Header 1">H1</button>
            <button className="tool-btn" onClick={() => applyHeader(2)} title="Header 2">H2</button>
            <button className="tool-btn" onClick={() => applyHeader(3)} title="Header 3">H3</button>
            <div style={{ width: '1px', backgroundColor: '#555', margin: '0 5px' }}></div>
            <select 
                onChange={(e) => { applyColor(e.target.value); e.target.value = ''; }} 
                style={{ backgroundColor: '#444', color: 'white', border: 'none', padding: '5px', borderRadius: '4px' }}
                title="Text Color"
            >
                <option value="">Color</option>
                <option value="#ff0000">Red</option>
                <option value="#00ff00">Green</option>
                <option value="#0000ff">Blue</option>
                <option value="#ffff00">Yellow</option>
                <option value="#ff00ff">Magenta</option>
                <option value="#00ffff">Cyan</option>
            </select>
            <div style={{ width: '1px', backgroundColor: '#555', margin: '0 5px' }}></div>
            <button className="tool-btn" onClick={handleCopy} title="Copy">📋</button>
            <button className="tool-btn" onClick={handleCut} title="Cut">✂️</button>
            <button className="tool-btn" onClick={handlePaste} title="Paste">📌</button>
        </div>
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Enter markdown here..."
        />
      </div>

      <div className="preview-pane">
        {/* ... (Live Preview Header) */}
        <div className="pane-header">
            <h2>Live Preview</h2>
            <div className="toolbar">
                <button 
                    className="tool-btn" 
                    onClick={startPresentation}
                    title="Presentation Mode"
                >
                    📺 Present
                </button>
                <button 
                    className="tool-btn" 
                    onClick={() => {
                        const slides = markdown.split(/^---$/m);
                        const insertIndex = selectedSlideIndices.length > 0 ? Math.max(...selectedSlideIndices) + 1 : slides.length;
                        const newSlide = `\n\n# New Slide\n\n- Content`;
                        
                        const newSlides = [...slides];
                        newSlides.splice(insertIndex, 0, newSlide);
                        updateMarkdown(newSlides.join('\n---\n'));
                        setSelectedSlideIndices([insertIndex]);
                    }}
                    title="Add Slide"
                >
                    + Add
                </button>
                <button 
                    className="tool-btn" 
                    onClick={() => {
                        if (selectedSlideIndices.length === 0) return;
                        const slides = markdown.split(/^---$/m);
                        const newSlides = slides.filter((_, index) => !selectedSlideIndices.includes(index));
                        updateMarkdown(newSlides.join('\n---\n'));
                        setSelectedSlideIndices([]);
                    }}
                    disabled={selectedSlideIndices.length === 0}
                    title="Delete Selected"
                >
                    🗑️ Delete
                </button>
                <button 
                    className="tool-btn" 
                    onClick={() => {
                        if (selectedSlideIndices.length === 0) return;
                        const slides = markdown.split(/^---$/m);
                        const newSlides = [...slides];
                        const sortedIndices = [...selectedSlideIndices].sort((a, b) => a - b);
                        
                        // Check if can move up
                        if (sortedIndices[0] === 0) return;

                        sortedIndices.forEach(index => {
                            const temp = newSlides[index - 1];
                            newSlides[index - 1] = newSlides[index];
                            newSlides[index] = temp;
                        });

                        updateMarkdown(newSlides.join('\n---\n'));
                        setSelectedSlideIndices(sortedIndices.map(i => i - 1));
                    }}
                    disabled={selectedSlideIndices.length === 0 || selectedSlideIndices.includes(0)}
                    title="Move Up"
                >
                    ⬆️ Up
                </button>
                <button 
                    className="tool-btn" 
                    onClick={() => {
                        const slides = markdown.split(/^---$/m);
                        if (selectedSlideIndices.length === 0) return;
                        const newSlides = [...slides];
                        const sortedIndices = [...selectedSlideIndices].sort((a, b) => b - a); // Reverse order for moving down
                        
                        // Check if can move down
                        if (sortedIndices[0] === slides.length - 1) return;

                        sortedIndices.forEach(index => {
                            const temp = newSlides[index + 1];
                            newSlides[index + 1] = newSlides[index];
                            newSlides[index] = temp;
                        });

                        updateMarkdown(newSlides.join('\n---\n'));
                        setSelectedSlideIndices(sortedIndices.map(i => i + 1));
                    }}
                    disabled={selectedSlideIndices.length === 0 || selectedSlideIndices.includes(markdown.split(/^---$/m).length - 1)}
                    title="Move Down"
                >
                    ⬇️ Down
                </button>
            </div>
        </div>
        
        {/* ... (Slides Container) */}
        <div className="slides-container">
          {previewContent}
        </div>

        <div className="chat-pane">
            <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3>AI Assistant</h3>
                    {history.length > 0 && (
                        <button 
                            className="undo-button" 
                            onClick={handleUndo}
                            title="Undo last AI change"
                        >
                            ↩ Undo
                        </button>
                    )}
                </div>
                <select 
                    className="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                >
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Exp)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
            </div>
            <div className="chat-input-area">
                <input 
                    type="text" 
                    placeholder="Ask AI to refine slides (e.g., 'Translate to Korean', 'Summarize slide 2')..." 
                    onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            const instruction = e.target.value;
                            if (!instruction.trim()) return;
                            
                            e.target.value = 'Processing...';
                            e.target.disabled = true;

                            try {
                                const response = await fetch('/api/refine', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        markdown, 
                                        instruction,
                                        model: selectedModel
                                    }),
                                });
                                const data = await response.json();
                                if (data.success) {
                                    updateMarkdown(data.markdown);
                                } else {
                                    alert('AI Error: ' + data.error);
                                }
                            } catch (err) {
                                alert('Network Error: ' + err.message);
                            } finally {
                                e.target.value = '';
                                e.target.disabled = false;
                                e.target.focus();
                            }
                        }
                    }}
                />
            </div>
        </div>
      </div>
      <div className="sidebar-pane" style={{ width: showTemplates ? '250px' : '40px', transition: 'width 0.3s' }}>
        <div className="pane-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: showTemplates ? '0 10px' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: showTemplates ? '0' : '10px 0', flexDirection: showTemplates ? 'row' : 'column' }}>
                {showTemplates && <h2>Templates</h2>}
                <button 
                    onClick={() => setShowTemplates(!showTemplates)}
                    style={{ 
                        padding: '4px 8px', 
                        backgroundColor: 'transparent', 
                        border: '1px solid #444', 
                        color: '#ccc',
                        cursor: 'pointer',
                        width: showTemplates ? 'auto' : '30px',
                        height: '30px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    title={showTemplates ? "Close Sidebar" : "Open Sidebar"}
                >
                    {showTemplates ? '»' : '«'}
                </button>
            </div>
            {showTemplates && (
                <select 
                    value={templateCategory} 
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '5px', 
                        backgroundColor: '#333', 
                        color: '#ccc', 
                        border: '1px solid #444',
                        borderRadius: '4px'
                    }}
                >
                    <option value="All">All Categories</option>
                    <option value="Cover">Cover</option>
                    <option value="Business">Business</option>
                    <option value="Lecture">Lecture</option>
                    <option value="Pitch Deck">Pitch Deck</option>
                </select>
            )}
        </div>
        {showTemplates && (
            <div className="template-list">
                {Object.entries(themes)
                    .filter(([_, theme]) => templateCategory === 'All' || theme.category === templateCategory)
                    .map(([key, theme]) => (
                    <div 
                        key={key} 
                        className={`template-item ${selectedTheme === key && selectedSlideIndices.length === 0 ? 'selected' : ''}`}
                        onClick={() => handleThemeSelect(key)}
                    >
                        <div className="template-thumbnail" style={{ backgroundColor: theme.bgColor }}>
                            <div className="thumb-header" style={{ backgroundColor: theme.previewColor }}></div>
                            <div className="thumb-card" style={{ backgroundColor: theme.cardColor }}></div>
                        </div>
                        <div className="template-name">{theme.name}</div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
