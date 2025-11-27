const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const PptxGenJS = require('pptxgenjs');

/**
 * Converts a PDF file to a PPTX file.
 * @param {string} pdfPath - Path to the source PDF file.
 * @param {string} outputDir - Directory to save the generated PPTX file.
 * @returns {Promise<string>} - Path to the generated PPTX file.
 */
async function convertPdfToPptx(pdfPath, outputDir) {
    return new Promise(async (resolve, reject) => {
        const baseName = path.basename(pdfPath, path.extname(pdfPath));
        const tempImgDir = path.join(outputDir, `temp_imgs_${baseName}_${Date.now()}`);
        
        if (!fs.existsSync(tempImgDir)) {
            fs.mkdirSync(tempImgDir, { recursive: true });
        }

        // 1. Convert PDF to Images using ImageMagick
        // -density 150: Good balance for screen viewing
        // -scene 1: Start numbering at 1
        const outputPattern = path.join(tempImgDir, 'slide_%03d.png');
        const command = `magick -density 150 "${pdfPath}" -scene 1 "${outputPattern}"`;

        console.log(`Converting PDF to images: ${command}`);

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error(`ImageMagick error: ${error.message}`);
                // Cleanup
                fs.rmSync(tempImgDir, { recursive: true, force: true });
                return reject(error);
            }

            try {
                // 2. Create PPTX
                const pptx = new PptxGenJS();
                pptx.layout = 'LAYOUT_16x9'; // Default layout

                const files = fs.readdirSync(tempImgDir).filter(f => f.endsWith('.png')).sort();
                
                if (files.length === 0) {
                    throw new Error('No images generated from PDF');
                }

                console.log(`Generated ${files.length} images. Creating PPTX...`);

                for (const file of files) {
                    const slide = pptx.addSlide();
                    const imgPath = path.join(tempImgDir, file);
                    
                    // Add image to slide, filling the slide
                    slide.addImage({
                        path: imgPath,
                        x: 0,
                        y: 0,
                        w: '100%',
                        h: '100%'
                    });
                }

                const pptxFileName = `${baseName}.pptx`;
                const pptxPath = path.join(outputDir, pptxFileName);

                await pptx.writeFile({ fileName: pptxPath });
                console.log(`PPTX created at: ${pptxPath}`);

                // 3. Cleanup
                fs.rmSync(tempImgDir, { recursive: true, force: true });

                resolve(pptxPath);

            } catch (err) {
                console.error('PPTX Generation Error:', err);
                // Cleanup
                if (fs.existsSync(tempImgDir)) {
                    fs.rmSync(tempImgDir, { recursive: true, force: true });
                }
                reject(err);
            }
        });
    });
}

module.exports = { convertPdfToPptx };
