const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { authorize, createPresentation, addSlides } = require('./src/slides');
const { parseMarkdown } = require('./src/parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const themes = require('./src/theme');
const multer = require('multer');
const { convertToMarkdown } = require('./src/converter');
const { convertPdfToPptx } = require('./src/pdf_to_pptx');
const { google } = require('googleapis');

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Ensure credentials exist
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('Error: credentials.json not found in server directory.');
    process.exit(1);
}

app.post('/api/convert', async (req, res) => {
    try {
        const { markdown, title, themeId } = req.body;
        if (!markdown) {
            return res.status(400).json({ error: 'Markdown content is required' });
        }

        const selectedTheme = themes[themeId] || themes.default;

        // Create a temporary file for parsing (or refactor parser to accept string)
        // For now, let's write to a temp file
        const tempFilePath = path.join(__dirname, 'temp_input.md');
        fs.writeFileSync(tempFilePath, markdown);

        console.log('Parsing markdown...');
        const slides = parseMarkdown(tempFilePath);

        console.log('Authenticating...');
        const auth = await authorize();

        console.log(`Creating presentation: ${title || 'Converted Presentation'}...`);
        const presentationId = await createPresentation(auth, title || 'Converted Presentation');

        console.log(`Adding slides with theme: ${selectedTheme.name}...`);
        await addSlides(auth, presentationId, slides, selectedTheme);

        // Cleanup
        fs.unlinkSync(tempFilePath);

        res.json({ 
            success: true, 
            presentationId, 
            link: `https://docs.google.com/presentation/d/${presentationId}` 
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/refine', async (req, res) => {
    try {
        const { markdown, instruction, model } = req.body;
        
        // Use API Key from env ONLY
        const key = process.env.GEMINI_API_KEY;
        
        if (!key) {
            return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is missing.' });
        }

        const genAI = new GoogleGenerativeAI(key);
        
        const prompt = `
You are an expert presentation assistant. Your task is to modify the provided Markdown content based on the user's instructions.
The markdown represents slides for a presentation, where each slide is separated by "---".

CRITICAL RULES:
1. Return ONLY the updated Markdown content. No explanations, no code blocks.
2. PRESERVE the "---" delimiters. Do not merge slides unless explicitly asked.
3. If the user asks to modify a specific slide (e.g., "slide 1"), ONLY modify that slide's content and keep other slides exactly as they are.
4. Maintain the existing slide structure (headers, bullet points) unless instructed to change it.

User Instruction: ${instruction}

Current Markdown:
${markdown}
`;

        // Prioritize user selected model, then fallbacks
        const requestedModel = model || "gemini-2.0-flash-exp";
        const modelsToTry = [requestedModel, "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-pro"];
        
        // Remove duplicates
        const uniqueModels = [...new Set(modelsToTry)];

        let result;
        let lastError;

        for (const modelName of uniqueModels) {
            try {
                console.log(`Trying model: ${modelName}...`);
                const aiModel = genAI.getGenerativeModel({ model: modelName });
                result = await aiModel.generateContent(prompt);
                console.log(`Success with ${modelName}`);
                break; 
            } catch (error) {
                console.error(`Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (!result) {
            throw lastError || new Error("All models failed. Please check your API key.");
        }
        const response = await result.response;
        let text = response.text();
        
        // Cleanup potential markdown code blocks if Gemini adds them
        text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');

        res.json({ success: true, markdown: text });

    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/import/local', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        
        console.log(`Importing local file: ${originalName}`);
        
        const markdown = await convertToMarkdown(filePath, originalName);
        
        // Cleanup
        fs.unlinkSync(filePath);
        
        res.json({ success: true, markdown });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
        // Cleanup if exists
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

app.post('/api/import/pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const baseName = path.basename(originalName, path.extname(originalName));

        console.log(`Importing PDF: ${originalName}`);

        // 1. Convert PDF to PPTX
        const pptxPath = await convertPdfToPptx(filePath, path.join(__dirname, 'uploads'));
        
        // 2. Upload to Drive as Google Slides
        console.log('Authenticating with Google...');
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });

        console.log('Uploading to Google Drive...');
        const fileMetadata = {
            name: baseName, // Use original filename as title
            mimeType: 'application/vnd.google-apps.presentation' // Convert to Google Slides
        };
        
        const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            body: fs.createReadStream(pptxPath)
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        const presentationId = driveResponse.data.id;
        const webViewLink = driveResponse.data.webViewLink;

        console.log(`Uploaded to Drive. ID: ${presentationId}`);

        // Cleanup
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(pptxPath)) fs.unlinkSync(pptxPath);

        res.json({ 
            success: true, 
            presentationId,
            link: webViewLink
        });

    } catch (error) {
        console.error('PDF Import error:', error);
        // Cleanup
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/drive/list', async (req, res) => {
    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });
        
        const response = await drive.files.list({
            q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name, mimeType, modifiedTime)',
            pageSize: 20
        });
        
        res.json({ success: true, files: response.data.files });
    } catch (error) {
        console.error('Drive list error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/drive/import', async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        if (!fileId) return res.status(400).json({ error: 'File ID required' });
        
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });
        
        const destPath = path.join(__dirname, 'uploads', `drive_${fileId}_${fileName}`);
        
        console.log(`Downloading file from Drive: ${fileName} (${fileId})`);
        
        // Get file metadata to check mimeType
        const meta = await drive.files.get({ fileId, fields: 'mimeType' });
        const mimeType = meta.data.mimeType;
        
        let finalPath = destPath;
        let finalName = fileName;

        if (mimeType.startsWith('application/vnd.google-apps.')) {
            let exportMimeType;
            let ext;
            if (mimeType.includes('document')) {
                exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                ext = '.docx';
            } else if (mimeType.includes('spreadsheet')) {
                exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                ext = '.xlsx';
            } else if (mimeType.includes('presentation')) {
                exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
                ext = '.pptx';
            } else {
                throw new Error('Unsupported Google App file type');
            }
            
            finalPath = destPath + ext;
            finalName = fileName + ext;
            const destExport = fs.createWriteStream(finalPath);
            
            await new Promise((resolve, reject) => {
                drive.files.export({ fileId, mimeType: exportMimeType }, { responseType: 'stream' })
                    .then(res => {
                        res.data
                            .on('end', () => resolve())
                            .on('error', err => reject(err))
                            .pipe(destExport);
                    })
                    .catch(reject);
            });
            
        } else {
            // Binary file download
            const dest = fs.createWriteStream(destPath);
            await new Promise((resolve, reject) => {
                drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
                    .then(res => {
                        res.data
                            .on('end', () => resolve())
                            .on('error', err => reject(err))
                            .pipe(dest);
                    })
                    .catch(reject);
            });
        }
            
        const markdown = await convertToMarkdown(finalPath, finalName);
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        
        res.json({ success: true, markdown });

    } catch (error) {
        console.error('Drive import error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
