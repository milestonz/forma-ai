const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');
const { createCanvas, Image } = require('canvas');

// Custom canvas factory for pdf.js to work with node-canvas
class NodeCanvasFactory {
    create(width, height) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        return { canvas, context };
    }

    reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

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

        // Load the PDF with custom canvas factory
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const canvasFactory = new NodeCanvasFactory();
        const loadingTask = pdfjs.getDocument({
            data,
            canvasFactory: canvasFactory,
            // Disable worker for Node.js
            useWorkerFetch: false,
            isEvalSupported: false,
            // Disable font loading issues
            disableFontFace: true,
            useSystemFonts: true
        });
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
                console.log(`  Page ${pageNum} viewport: ${viewport.width}x${viewport.height}`);

                // Create canvas using canvas factory
                const canvasData = canvasFactory.create(viewport.width, viewport.height);
                const canvas = canvasData.canvas;
                const context = canvasData.context;

                // Fill with white background first
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, viewport.width, viewport.height);

                // Render PDF page to canvas with canvas factory
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    canvasFactory: canvasFactory,
                    background: 'white'
                };

                await page.render(renderContext).promise;
                console.log(`  Page ${pageNum} rendered to canvas`);

                // Save as PNG
                const imageFileName = `page_${pageNum}_${Date.now()}.png`;
                const imagePath = path.join(outputDir, imageFileName);
                const buffer = canvas.toBuffer('image/png');

                // Verify image has content (not just white)
                console.log(`  Page ${pageNum} image size: ${buffer.length} bytes`);

                fs.writeFileSync(imagePath, buffer);
                tempImages.push(imagePath);
                console.log(`  Page ${pageNum} saved to: ${imagePath}`);

                // Add slide with the image
                const slide = pptx.addSlide();

                // Add image using data URI for more reliable embedding
                const base64Image = buffer.toString('base64');
                slide.addImage({
                    data: `image/png;base64,${base64Image}`,
                    x: 0,
                    y: 0,
                    w: 10,  // 10 inches (full width for 16:9)
                    h: 5.625  // 5.625 inches (full height for 16:9)
                });
                console.log(`  Page ${pageNum} added to PPTX`);

                // Simple markdown for this slide
                markdownSlides.push(`# Slide ${pageNum}\n\n[Image from PDF page ${pageNum}]`);

            } catch (pageError) {
                console.error(`Error rendering page ${pageNum}:`, pageError.message);
                console.error(`  Stack:`, pageError.stack);
                // Add a placeholder slide for failed pages
                const slide = pptx.addSlide();
                slide.addText(`Page ${pageNum} - Rendering Failed`, {
                    x: 0.5,
                    y: 2.5,
                    w: 9,
                    h: 1,
                    fontSize: 24,
                    align: 'center',
                    color: '666666'
                });
                markdownSlides.push(`# Slide ${pageNum}\n\n[Page rendering failed: ${pageError.message}]`);
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
