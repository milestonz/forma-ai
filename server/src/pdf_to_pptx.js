const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const PptxGenJS = require('pptxgenjs');
const { extractTextFromPdfWithGemini, isImageBasedPdf } = require('./gemini_ocr');

/**
 * Converts a PDF file to a PPTX file using text extraction.
 * Falls back to Gemini OCR for image-based PDFs.
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<{pptxPath: string, markdown: string}>} - Path to PPTX and extracted markdown.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));

    try {
        // First, try standard text extraction
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);

        const numPages = data.numpages || 1;
        const fullText = data.text || '';

        console.log(`PDF parsed: ${numPages} pages, ${fullText.length} chars`);

        let pages = [];

        // Check if this is an image-based PDF (very little text extracted)
        if (isImageBasedPdf(fullText, numPages)) {
            console.log('Detected image-based PDF, using Gemini OCR...');

            // Check if Gemini API key is available
            if (process.env.GEMINI_API_KEY) {
                try {
                    pages = await extractTextFromPdfWithGemini(pdfPath);
                    console.log(`Gemini OCR extracted ${pages.length} pages`);
                } catch (ocrError) {
                    console.error('Gemini OCR failed, falling back to basic extraction:', ocrError.message);
                    pages = extractPagesFromText(fullText, numPages);
                }
            } else {
                console.log('GEMINI_API_KEY not set, using basic text extraction');
                pages = extractPagesFromText(fullText, numPages);
            }
        } else {
            // Use standard text extraction
            pages = extractPagesFromText(fullText, numPages);
        }

        // Ensure we have at least one page
        if (pages.length === 0) {
            pages = ['No text content extracted from this PDF'];
        }

        console.log(`Creating PPTX with ${pages.length} slides`);

        // Create PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const markdownSlides = [];

        for (let i = 0; i < pages.length; i++) {
            const pageText = pages[i].trim();
            const isCover = pageText.startsWith('[COVER]');
            const cleanText = pageText.replace('[COVER]', '').trim();

            const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

            if (lines.length === 0) {
                lines.push(`Slide ${i + 1}`);
            }

            const slide = pptx.addSlide();

            // First line as title
            const title = lines[0];
            slide.addText(title, {
                x: 0.5,
                y: isCover ? 2 : 0.5,
                w: '90%',
                h: 1,
                fontSize: isCover ? 36 : 28,
                bold: true,
                color: '1a1a2e',
                align: isCover ? 'center' : 'left'
            });

            // Rest as content
            const content = lines.slice(1);
            if (content.length > 0) {
                const bulletText = content.slice(0, 12).map(line => {
                    // Check if line starts with bullet-like characters
                    const cleanLine = line.replace(/^[-•*]\s*/, '');
                    return {
                        text: cleanLine.length > 120 ? cleanLine.substring(0, 120) + '...' : cleanLine,
                        options: { bullet: !isCover, paraSpaceAfter: 6 }
                    };
                });

                slide.addText(bulletText, {
                    x: 0.5,
                    y: isCover ? 3.2 : 1.6,
                    w: '90%',
                    h: 4,
                    fontSize: isCover ? 18 : 16,
                    color: '333333',
                    valign: 'top',
                    align: isCover ? 'center' : 'left'
                });
            }

            // Build markdown
            let slideMarkdown = `# ${title}`;
            if (content.length > 0) {
                slideMarkdown += '\n\n' + content.slice(0, 12).map(line => {
                    const cleanLine = line.replace(/^[-•*]\s*/, '');
                    return `- ${cleanLine}`;
                }).join('\n');
            }
            markdownSlides.push(slideMarkdown);
        }

        // Save PPTX
        const pptxFileName = `${baseName}.pptx`;
        const pptxPath = path.join(outputDir, pptxFileName);
        await pptx.writeFile({ fileName: pptxPath });

        console.log(`PPTX created at: ${pptxPath}`);

        const markdown = markdownSlides.join('\n\n---\n\n');
        return { pptxPath, markdown };

    } catch (err) {
        console.error('PDF Processing Error:', err);
        throw err;
    }
}

/**
 * Extract pages from text using standard methods
 */
function extractPagesFromText(fullText, numPages) {
    // Try to split by form feed characters (page breaks)
    let pages = fullText.split(/\f/).filter(page => page.trim());

    // If no page breaks found, try to split evenly
    if (pages.length <= 1 && numPages > 1 && fullText.length > 0) {
        const avgCharsPerPage = Math.ceil(fullText.length / numPages);
        pages = [];
        for (let i = 0; i < numPages; i++) {
            const start = i * avgCharsPerPage;
            const end = Math.min((i + 1) * avgCharsPerPage, fullText.length);
            const pageText = fullText.slice(start, end).trim();
            if (pageText) {
                pages.push(pageText);
            }
        }
    }

    // If still no pages, use the whole text as one page
    if (pages.length === 0 && fullText.trim()) {
        pages = [fullText.trim()];
    }

    return pages;
}

module.exports = { convertPdfToPptx };
