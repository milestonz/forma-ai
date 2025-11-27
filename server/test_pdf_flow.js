const { convertPdfToPptx } = require('./src/pdf_to_pptx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function test() {
    const testPdfPath = path.join(__dirname, 'test_sample.pdf');
    const outputDir = path.join(__dirname, 'uploads');

    try {
        // 1. Create a dummy PDF using ImageMagick
        console.log('Creating dummy PDF...');
        execSync(`magick -size 595x842 xc:white -pointsize 24 -draw "text 50,50 'Hello World'" "${testPdfPath}"`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // 2. Convert
        console.log('Converting PDF to PPTX...');
        const pptxPath = await convertPdfToPptx(testPdfPath, outputDir);

        // 3. Verify
        if (fs.existsSync(pptxPath)) {
            console.log('SUCCESS: PPTX created at', pptxPath);
            // Cleanup
            fs.unlinkSync(pptxPath);
        } else {
            console.error('FAILURE: PPTX not found');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        // Cleanup PDF
        if (fs.existsSync(testPdfPath)) {
            fs.unlinkSync(testPdfPath);
        }
    }
}

test();
