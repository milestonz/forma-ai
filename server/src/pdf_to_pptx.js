const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const PptxGenJS = require('pptxgenjs');

/**
 * Extracts text from PDF and converts to markdown format
 * @param {string} pdfPath - Path to the source PDF file.
 * @returns {Promise<string>} - Extracted text as markdown.
 */
async function extractPdfText(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    // Split by pages (pdf-parse provides page breaks as form feed characters)
    const pages = data.text.split(/\f/).filter(page => page.trim());

    // Convert to markdown with slide separators
    const markdown = pages.map((pageText, index) => {
        const lines = pageText.trim().split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            return `# Slide ${index + 1}`;
        }

        // First line as title
        const title = lines[0].trim();
        const content = lines.slice(1).map(line => line.trim()).filter(line => line);

        let slideMarkdown = `# ${title}`;

        if (content.length > 0) {
            // Add content as bullet points
            slideMarkdown += '\n\n' + content.map(line => `- ${line}`).join('\n');
        }

        return slideMarkdown;
    }).join('\n\n---\n\n');

    return markdown;
}

/**
 * Converts a PDF file to a PPTX file using text extraction.
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

        // Split by pages
        const pages = data.text.split(/\f/).filter(page => page.trim());

        if (pages.length === 0) {
            throw new Error('No text content found in PDF');
        }

        console.log(`Extracted ${pages.length} pages from PDF`);

        // Create PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        // Generate markdown for return
        const markdownSlides = [];

        for (let i = 0; i < pages.length; i++) {
            const pageText = pages[i].trim();
            const lines = pageText.split('\n').filter(line => line.trim());

            if (lines.length === 0) continue;

            const slide = pptx.addSlide();

            // First line as title
            const title = lines[0].trim();
            slide.addText(title, {
                x: 0.5,
                y: 0.5,
                w: '90%',
                h: 1,
                fontSize: 32,
                bold: true,
                color: '1a1a2e'
            });

            // Rest as content
            const content = lines.slice(1).map(line => line.trim()).filter(line => line);
            if (content.length > 0) {
                slide.addText(content.map(line => ({ text: `• ${line}`, options: { bullet: false } })), {
                    x: 0.5,
                    y: 1.8,
                    w: '90%',
                    h: 4,
                    fontSize: 18,
                    color: '333333',
                    valign: 'top'
                });
            }

            // Build markdown
            let slideMarkdown = `# ${title}`;
            if (content.length > 0) {
                slideMarkdown += '\n\n' + content.map(line => `- ${line}`).join('\n');
            }
            markdownSlides.push(slideMarkdown);
        }

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

module.exports = { convertPdfToPptx, extractPdfText };
