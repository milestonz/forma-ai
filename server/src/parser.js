const fs = require("fs");

/**
 * Parses a markdown file and extracts slides.
 * @param {string} filePath - Path to the markdown file.
 * @returns {Array<{title: string, content: Array<{text: string, boldRanges: Array<{start: number, end: number}>}>}>} - Array of slide objects.
 */
function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const slides = [];
  let currentSlide = { title: '', content: [] };
  let hasTitle = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Split by '---'
    if (trimmedLine === '---') {
        if (currentSlide.title || currentSlide.content.length > 0) {
            slides.push(currentSlide);
        }
        currentSlide = { title: '', content: [] };
        hasTitle = false;
    } else if (trimmedLine.length > 0) {
        // Check for title (first header in the slide)
        if (!hasTitle && (trimmedLine.startsWith('# ') || trimmedLine.startsWith('## ') || trimmedLine.startsWith('### '))) {
            currentSlide.title = trimmedLine.replace(/^#+\s+/, '');
            hasTitle = true;
        } else {
            // Add content
            const { plainText, boldRanges } = parseLine(trimmedLine);
            currentSlide.content.push({ text: plainText, boldRanges });
        }
    }
  });

  // Push the last slide
  if (currentSlide.title || currentSlide.content.length > 0) {
    slides.push(currentSlide);
  }

  return slides;
}

/**
 * Parses a line of markdown text to extract bold ranges.
 * Removes leading bullets and '**' markers.
 * @param {string} text 
 * @returns {{plainText: string, boldRanges: Array<{start: number, end: number}>}}
 */
function parseLine(text) {
    // Remove leading bullet if present
    let cleanText = text;
    if (cleanText.startsWith('- ')) {
        cleanText = cleanText.substring(2);
    }
    
    let plainText = "";
    const boldRanges = [];
    
    const regex = /(\*\*.*?\*\*)/g;
    const parts = cleanText.split(regex);
    
    parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.slice(2, -2);
            boldRanges.push({ start: plainText.length, end: plainText.length + content.length });
            plainText += content;
        } else {
            plainText += part;
        }
    });
    
    return { plainText, boldRanges };
}

module.exports = { parseMarkdown };
