const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

// Dynamic imports for PDF rendering
let pdfjsLib = null;

async function initPdfJs() {
    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return pdfjsLib;
}

/**
 * Converts a PDF file to a PPTX file by rendering each page as an image.
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<{pptxPath: string, markdown: string}>} - Path to PPTX and basic markdown.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const tempImages = [];

    try {
        // Initialize PDF.js
        const pdfjs = await initPdfJs();

        // Load the PDF
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjs.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        const numPages = pdfDocument.numPages;
        console.log(`PDF loaded: ${numPages} pages`);

        // Create PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const markdownSlides = [];

        // Render each page as an image
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            console.log(`Rendering page ${pageNum}/${numPages}...`);

            try {
                const page = await pdfDocument.getPage(pageNum);

                // Calculate dimensions for good quality (scale 2x for clarity)
                const viewport = page.getViewport({ scale: 2.0 });

                // Create canvas using node-canvas
                const { createCanvas } = require('canvas');
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');

                // Render PDF page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Save as PNG
                const imageFileName = `page_${pageNum}_${Date.now()}.png`;
                const imagePath = path.join(outputDir, imageFileName);
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(imagePath, buffer);
                tempImages.push(imagePath);

                // Add slide with the image
                const slide = pptx.addSlide();

                // Add image to fill the slide
                slide.addImage({
                    path: imagePath,
                    x: 0,
                    y: 0,
                    w: '100%',
                    h: '100%',
                    sizing: { type: 'contain', w: '100%', h: '100%' }
                });

                // Simple markdown for this slide
                markdownSlides.push(`# Slide ${pageNum}\n\n[Image from PDF page ${pageNum}]`);

            } catch (pageError) {
                console.error(`Error rendering page ${pageNum}:`, pageError.message);
                // Add a placeholder slide for failed pages
                const slide = pptx.addSlide();
                slide.addText(`Page ${pageNum}`, {
                    x: 0.5,
                    y: 2.5,
                    w: '90%',
                    h: 1,
                    fontSize: 24,
                    align: 'center',
                    color: '666666'
                });
                markdownSlides.push(`# Slide ${pageNum}\n\n[Page rendering failed]`);
            }
        }

        // Save PPTX
        const pptxFileName = `${baseName}.pptx`;
        const pptxPath = path.join(outputDir, pptxFileName);
        await pptx.writeFile({ fileName: pptxPath });

        console.log(`PPTX created at: ${pptxPath}`);

        // Cleanup temp images
        for (const imgPath of tempImages) {
            try {
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            } catch (e) {
                console.error(`Failed to cleanup temp image: ${imgPath}`);
            }
        }

        const markdown = markdownSlides.join('\n\n---\n\n');
        return { pptxPath, markdown };

    } catch (err) {
        // Cleanup temp images on error
        for (const imgPath of tempImages) {
            try {
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            } catch (e) {}
        }

        console.error('PDF Processing Error:', err);
        throw err;
    }
}

module.exports = { convertPdfToPptx };
