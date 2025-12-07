const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extract text from a PDF file using Gemini Vision API
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string[]>} - Array of text content per page
 */
async function extractTextFromPdfWithGemini(pdfPath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Read PDF as base64
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    console.log('Sending PDF to Gemini for OCR...');

    const prompt = `You are a document text extractor. Extract ALL text content from this PDF document.

Rules:
1. Extract text from EACH page separately
2. Preserve the structure and formatting as much as possible
3. For each page, identify:
   - The main title or heading (if any)
   - Bullet points or numbered lists
   - Regular paragraphs
4. Separate each page's content with "---PAGE_BREAK---"
5. If a page appears to be a title/cover slide, mark it with [COVER] at the beginning
6. Output ONLY the extracted text, no explanations

Format example:
[COVER]
Presentation Title
Subtitle or author info
---PAGE_BREAK---
Page 2 Title
- Bullet point 1
- Bullet point 2
Some paragraph text
---PAGE_BREAK---
Page 3 Title
...`;

    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBase64
                }
            },
            prompt
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('Gemini OCR completed successfully');

        // Split by page breaks
        const pages = text.split('---PAGE_BREAK---').map(page => page.trim()).filter(page => page);

        if (pages.length === 0) {
            return [text.trim() || 'No content extracted'];
        }

        return pages;

    } catch (error) {
        console.error('Gemini OCR error:', error);
        throw new Error(`Gemini OCR failed: ${error.message}`);
    }
}

/**
 * Check if PDF text extraction result is mostly empty (image-based PDF)
 * @param {string} text - Extracted text
 * @param {number} numPages - Number of pages in PDF
 * @returns {boolean} - True if PDF appears to be image-based
 */
function isImageBasedPdf(text, numPages) {
    const avgCharsPerPage = text.length / numPages;
    // If less than 50 characters per page on average, it's likely image-based
    return avgCharsPerPage < 50;
}

module.exports = { extractTextFromPdfWithGemini, isImageBasedPdf };
