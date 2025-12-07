const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PptxGenJS = require('pptxgenjs');

/**
 * Check if ImageMagick is available
 */
function isImageMagickAvailable() {
    try {
        execSync('which convert', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if Ghostscript is available (required by ImageMagick for PDF)
 */
function isGhostscriptAvailable() {
    try {
        execSync('which gs', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the number of pages in a PDF using Ghostscript
 */
function getPdfPageCount(pdfPath) {
    try {
        const result = execSync(
            `gs -q -dNODISPLAY -c "(${pdfPath}) (r) file runpdfbegin pdfpagecount = quit"`,
            { encoding: 'utf8' }
        );
        return parseInt(result.trim(), 10);
    } catch (error) {
        // Fallback: try using pdfinfo if available
        try {
            const result = execSync(`pdfinfo "${pdfPath}" | grep Pages`, { encoding: 'utf8' });
            const match = result.match(/Pages:\s*(\d+)/);
            if (match) return parseInt(match[1], 10);
        } catch {}

        // Last resort: estimate from file or default
        console.warn('Could not determine PDF page count, defaulting to 100');
        return 100;
    }
}

/**
 * Convert PDF to images using ImageMagick
 * @param {string} pdfPath - Path to PDF file
 * @param {string} outputDir - Output directory for images
 * @returns {Promise<string[]>} - Array of image paths
 */
async function convertPdfToImagesWithImageMagick(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const imagePaths = [];

    console.log('Using ImageMagick for PDF to image conversion');

    // Get page count
    let pageCount;
    try {
        pageCount = getPdfPageCount(pdfPath);
        console.log(`PDF has ${pageCount} pages`);
    } catch (err) {
        console.warn('Could not get page count, will convert all pages');
        pageCount = null;
    }

    // Convert all pages at once with ImageMagick
    // -density 150 for good quality, -quality 90 for PNG compression
    const outputPattern = path.join(outputDir, `${baseName}_page_%d.png`);

    try {
        console.log('Converting PDF pages to images...');

        // ImageMagick convert command
        // -density 200 = 200 DPI for good quality
        // -background white -alpha remove = ensure white background
        // -colorspace sRGB = standard color space
        const cmd = `convert -density 200 -background white -alpha remove -colorspace sRGB "${pdfPath}" "${outputPattern}"`;

        execSync(cmd, {
            timeout: 300000, // 5 minute timeout
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });

        // Find all generated images (ImageMagick names them _page_0.png, _page_1.png, etc.)
        const files = fs.readdirSync(outputDir);
        const pagePattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_page_(\\d+)\\.png$`);

        const pageFiles = files
            .filter(f => pagePattern.test(f))
            .map(f => {
                const match = f.match(pagePattern);
                return { file: f, num: parseInt(match[1], 10) };
            })
            .sort((a, b) => a.num - b.num);

        for (const { file } of pageFiles) {
            imagePaths.push(path.join(outputDir, file));
        }

        // If single page PDF, ImageMagick might name it without page number
        if (imagePaths.length === 0) {
            const singlePagePath = path.join(outputDir, `${baseName}_page_.png`);
            const altSinglePagePath = path.join(outputDir, `${baseName}.png`);

            if (fs.existsSync(singlePagePath)) {
                imagePaths.push(singlePagePath);
            } else if (fs.existsSync(altSinglePagePath)) {
                imagePaths.push(altSinglePagePath);
            }
        }

        console.log(`Converted ${imagePaths.length} pages`);

    } catch (error) {
        console.error('ImageMagick conversion error:', error.message);
        throw new Error(`Failed to convert PDF with ImageMagick: ${error.message}`);
    }

    return imagePaths;
}

/**
 * Fallback: Convert PDF using pdf.js and node-canvas
 */
async function convertPdfToImagesWithPdfJs(pdfPath, outputDir) {
    const { createCanvas } = require('canvas');
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const imagePaths = [];

    console.log('Using pdf.js for PDF to image conversion (fallback)');

    // Custom canvas factory for pdf.js
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

    // Dynamic import pdf.js
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const canvasFactory = new NodeCanvasFactory();

    const loadingTask = pdfjsLib.getDocument({
        data,
        canvasFactory,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: true
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF loaded: ${numPages} pages`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        console.log(`Rendering page ${pageNum}/${numPages}...`);

        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvasData = canvasFactory.create(viewport.width, viewport.height);
            const { canvas, context } = canvasData;

            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, viewport.width, viewport.height);

            await page.render({
                canvasContext: context,
                viewport,
                canvasFactory,
                background: 'white'
            }).promise;

            const imagePath = path.join(outputDir, `${baseName}_page_${pageNum - 1}.png`);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(imagePath, buffer);
            imagePaths.push(imagePath);

            console.log(`  Page ${pageNum} saved`);

        } catch (pageError) {
            console.error(`Error rendering page ${pageNum}:`, pageError.message);
            // Continue with other pages
        }
    }

    return imagePaths;
}

/**
 * Converts a PDF file to a PPTX file by rendering each page as an image.
 * Uses ImageMagick if available, falls back to pdf.js
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<{pptxPath: string, markdown: string}>} - Path to PPTX and basic markdown.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    let imagePaths = [];

    try {
        console.log(`Importing PDF: ${path.basename(pdfPath)}`);

        // Check available tools
        const hasImageMagick = isImageMagickAvailable();
        const hasGhostscript = isGhostscriptAvailable();

        console.log(`ImageMagick available: ${hasImageMagick}`);
        console.log(`Ghostscript available: ${hasGhostscript}`);

        // Use ImageMagick if both ImageMagick and Ghostscript are available
        if (hasImageMagick && hasGhostscript) {
            try {
                imagePaths = await convertPdfToImagesWithImageMagick(pdfPath, outputDir);
            } catch (imError) {
                console.warn('ImageMagick conversion failed, trying pdf.js fallback:', imError.message);
                imagePaths = await convertPdfToImagesWithPdfJs(pdfPath, outputDir);
            }
        } else {
            // Fallback to pdf.js
            imagePaths = await convertPdfToImagesWithPdfJs(pdfPath, outputDir);
        }

        if (imagePaths.length === 0) {
            throw new Error('No pages were converted from PDF');
        }

        // Create PPTX
        console.log(`Creating PPTX with ${imagePaths.length} slides...`);
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        const markdownSlides = [];

        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            const pageNum = i + 1;

            try {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');

                const slide = pptx.addSlide();
                slide.addImage({
                    data: `image/png;base64,${base64Image}`,
                    x: 0,
                    y: 0,
                    w: 10,
                    h: 5.625
                });

                markdownSlides.push(`# Slide ${pageNum}\n\n[Image from PDF page ${pageNum}]`);
                console.log(`  Added page ${pageNum} to PPTX`);

            } catch (slideError) {
                console.error(`Error adding page ${pageNum} to PPTX:`, slideError.message);

                // Add placeholder slide
                const slide = pptx.addSlide();
                slide.addText(`Page ${pageNum} - Image Load Failed`, {
                    x: 0.5,
                    y: 2.5,
                    w: 9,
                    h: 1,
                    fontSize: 24,
                    align: 'center',
                    color: '666666'
                });
                markdownSlides.push(`# Slide ${pageNum}\n\n[Page load failed]`);
            }
        }

        // Save PPTX
        const pptxFileName = `${baseName}.pptx`;
        const pptxPath = path.join(outputDir, pptxFileName);
        await pptx.writeFile({ fileName: pptxPath });

        console.log(`PPTX created at: ${pptxPath}`);

        // Cleanup temp images
        for (const imgPath of imagePaths) {
            try {
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            } catch (e) {
                console.warn(`Failed to cleanup temp image: ${imgPath}`);
            }
        }

        const markdown = markdownSlides.join('\n\n---\n\n');
        return { pptxPath, markdown };

    } catch (err) {
        // Cleanup on error
        for (const imgPath of imagePaths) {
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
