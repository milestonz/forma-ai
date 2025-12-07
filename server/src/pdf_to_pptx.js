const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const PptxGenJS = require('pptxgenjs');

// PDF.js setup for Node.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

/**
 * Converts a PDF file to a PPTX file by rendering pages as images.
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<{pptxPath: string, markdown: string}>} - Path to PPTX and extracted markdown.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const tempImgDir = path.join(outputDir, `temp_imgs_${baseName}_${Date.now()}`);

    if (!fs.existsSync(tempImgDir)) {
        fs.mkdirSync(tempImgDir, { recursive: true });
    }

    try {
        // Load PDF document
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdfDoc.numPages;

        console.log(`PDF loaded: ${numPages} pages`);

        // Create PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const markdownSlides = [];
        const scale = 2.0; // Higher scale for better quality

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            // Render PDF page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Save as PNG
            const imgFileName = `slide_${String(pageNum).padStart(3, '0')}.png`;
            const imgPath = path.join(tempImgDir, imgFileName);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(imgPath, buffer);

            console.log(`Rendered page ${pageNum}/${numPages}`);

            // Add to PPTX
            const slide = pptx.addSlide();
            slide.addImage({
                path: imgPath,
                x: 0,
                y: 0,
                w: '100%',
                h: '100%'
            });

            // Extract text for markdown (optional, for text-based PDFs)
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ').trim();

            if (pageText) {
                const lines = pageText.split(/\s{2,}/).filter(line => line.trim());
                const title = lines[0] || `Slide ${pageNum}`;
                const content = lines.slice(1);

                let slideMarkdown = `# ${title}`;
                if (content.length > 0) {
                    slideMarkdown += '\n\n' + content.map(line => `- ${line}`).join('\n');
                }
                markdownSlides.push(slideMarkdown);
            } else {
                markdownSlides.push(`# Slide ${pageNum}\n\n[Image-based content]`);
            }
        }

        // Save PPTX
        const pptxFileName = `${baseName}.pptx`;
        const pptxPath = path.join(outputDir, pptxFileName);
        await pptx.writeFile({ fileName: pptxPath });

        console.log(`PPTX created at: ${pptxPath}`);

        // Cleanup temp images
        fs.rmSync(tempImgDir, { recursive: true, force: true });

        const markdown = markdownSlides.join('\n\n---\n\n');
        return { pptxPath, markdown };

    } catch (err) {
        console.error('PDF Processing Error:', err);
        // Cleanup on error
        if (fs.existsSync(tempImgDir)) {
            fs.rmSync(tempImgDir, { recursive: true, force: true });
        }
        throw err;
    }
}

module.exports = { convertPdfToPptx };
