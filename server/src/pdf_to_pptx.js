const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const PptxGenJS = require('pptxgenjs');

/**
 * Converts a PDF file to a PPTX file using text extraction.
 * Note: Image-based PDFs will have limited content extraction.
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<{pptxPath: string, markdown: string}>} - Path to PPTX and extracted markdown.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));

    try {
        // Extract text from PDF
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);

        // Get page count from PDF info
        const numPages = data.numpages || 1;
        const fullText = data.text || '';

        console.log(`PDF parsed: ${numPages} pages, ${fullText.length} chars`);

        // Try to split by form feed characters (page breaks)
        let pages = fullText.split(/\f/).filter(page => page.trim());

        // If no page breaks found, try to split evenly
        if (pages.length <= 1 && numPages > 1) {
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
        if (pages.length === 0) {
            pages = [fullText || 'No text content extracted'];
        }

        console.log(`Extracted ${pages.length} pages from PDF`);

        // Create PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const markdownSlides = [];

        for (let i = 0; i < pages.length; i++) {
            const pageText = pages[i].trim();
            const lines = pageText.split('\n').map(l => l.trim()).filter(l => l);

            if (lines.length === 0) {
                lines.push(`Slide ${i + 1}`);
            }

            const slide = pptx.addSlide();

            // First line as title
            const title = lines[0];
            slide.addText(title, {
                x: 0.5,
                y: 0.5,
                w: '90%',
                h: 1,
                fontSize: 28,
                bold: true,
                color: '1a1a2e'
            });

            // Rest as content
            const content = lines.slice(1);
            if (content.length > 0) {
                const bulletText = content.slice(0, 10).map(line => ({
                    text: line.length > 100 ? line.substring(0, 100) + '...' : line,
                    options: { bullet: true, paraSpaceAfter: 6 }
                }));

                slide.addText(bulletText, {
                    x: 0.5,
                    y: 1.6,
                    w: '90%',
                    h: 4,
                    fontSize: 16,
                    color: '333333',
                    valign: 'top'
                });
            }

            // Build markdown
            let slideMarkdown = `# ${title}`;
            if (content.length > 0) {
                slideMarkdown += '\n\n' + content.slice(0, 10).map(line => `- ${line}`).join('\n');
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

module.exports = { convertPdfToPptx };
