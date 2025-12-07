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
const {
  ssoAuthMiddleware,
  ssoRequiredMiddleware,
  getUserServices,
  getServiceStats,
  getAllServices,
  registerService,
  getUsersByOriginService,
  SERVICE_SLUG
} = require('./src/sso');
const { isSupabaseConfigured } = require('./src/supabase');

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// OAuth2 Web Flow Configuration
const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials',
  'https://www.googleapis.com/auth/classroom.announcements',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Get Google credentials from env or file
function getGoogleCredentials() {
  // First try environment variables
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET
    };
  }
  // Fallback to credentials.json file
  const credPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(credPath)) {
    const credentials = JSON.parse(fs.readFileSync(credPath));
    const { client_id, client_secret } = credentials.installed || credentials.web;
    return { client_id, client_secret };
  }
  throw new Error('Google credentials not found. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
}

function getOAuth2Client() {
  const { client_id, client_secret } = getGoogleCredentials();
  return new OAuth2Client(client_id, client_secret, REDIRECT_URI);
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH));
    }
  } catch (err) {
    console.error('Error loading tokens:', err);
  }
  return null;
}

function saveTokens(tokens, userInfo = {}) {
  const { client_id, client_secret } = getGoogleCredentials();
  const payload = {
    type: 'authorized_user',
    client_id,
    client_secret,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
    user: userInfo
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload));
}

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Serve React static files in production
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// ============ OAuth Web Flow Endpoints ============

// Get OAuth URL for login
app.get('/api/auth/url', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url: authUrl });
});

// Handle OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Set credentials with access_token for the API call
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });

    // Get user info using direct API call
    let userInfo = { name: 'User', email: '' };
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      if (userInfoRes.ok) {
        const data = await userInfoRes.json();
        userInfo = {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture
        };
      }
    } catch (userInfoError) {
      console.error('Failed to get user info:', userInfoError.message);
      // Continue with default user info
    }

    // Save tokens with user info
    saveTokens(tokens, userInfo);

    // Redirect to frontend with success
    res.redirect(`${FRONTEND_URL}?auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}?auth=error`);
  }
});

// Check auth status
app.get('/api/auth/status', async (req, res) => {
  const tokenData = loadTokens();

  if (!tokenData || !tokenData.refresh_token) {
    return res.json({ authenticated: false });
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
      access_token: tokenData.access_token,
      expiry_date: tokenData.expiry_date
    });

    // Refresh if expired
    if (tokenData.expiry_date && Date.now() >= tokenData.expiry_date) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      saveTokens(credentials, tokenData.user);
    }

    res.json({
      authenticated: true,
      user: tokenData.user || { name: 'User', email: '' }
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    // Token invalid, clear it
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ End OAuth Endpoints ============

// ============ SSO Endpoints (Supabase) ============

// Check SSO configuration status
app.get('/api/sso/status', (req, res) => {
  res.json({
    enabled: isSupabaseConfigured(),
    service: SERVICE_SLUG
  });
});

// Get current user's services (requires SSO auth)
app.get('/api/sso/user/services', ssoRequiredMiddleware, async (req, res) => {
  try {
    const { data, error } = await getUserServices(req.ssoToken);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ services: data });
  } catch (err) {
    console.error('Error getting user services:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all registered services
app.get('/api/sso/services', async (req, res) => {
  try {
    const { data, error } = await getAllServices();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ services: data });
  } catch (err) {
    console.error('Error getting services:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get service statistics (admin only - add your own admin check)
app.get('/api/sso/stats{/:serviceSlug}', async (req, res) => {
  try {
    const serviceSlug = req.params.serviceSlug || SERVICE_SLUG;
    const { data, error } = await getServiceStats(serviceSlug);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ stats: data });
  } catch (err) {
    console.error('Error getting service stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Register a new service (admin only - add your own admin check)
app.post('/api/sso/services', async (req, res) => {
  try {
    const { slug, display_name, domain, description, logo_url } = req.body;
    if (!slug || !display_name) {
      return res.status(400).json({ error: 'slug and display_name are required' });
    }
    const { data, error } = await registerService({ slug, display_name, domain, description, logo_url });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ service: data });
  } catch (err) {
    console.error('Error registering service:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get users by origin service (admin only)
app.get('/api/sso/users/:serviceSlug', async (req, res) => {
  try {
    const { serviceSlug } = req.params;
    const { data, error } = await getUsersByOriginService(serviceSlug);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ users: data });
  } catch (err) {
    console.error('Error getting users by origin:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ End SSO Endpoints ============

app.post('/api/convert', async (req, res) => {
    try {
        const { markdown, title, themeId } = req.body;
        console.log(`Received conversion request. ThemeId: ${themeId}`);
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

        const slideThemes = req.body.slideThemes || {};
        console.log(`Adding slides with global theme: ${selectedTheme.name}...`);
        await addSlides(auth, presentationId, slides, selectedTheme, slideThemes, themes);

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
        // Use filename from form field (properly encoded) or fallback to originalname
        const originalName = req.body.filename || req.file.originalname;

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
    let filePath = null;
    let pptxPath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        filePath = req.file.path;
        // Use filename from form field (properly encoded) or fallback to originalname
        const originalName = req.body.filename || req.file.originalname;
        const baseName = path.basename(originalName, path.extname(originalName));

        console.log(`Importing PDF: ${originalName}`);

        // 1. Convert PDF to PPTX (text extraction method)
        let conversionResult;
        try {
            conversionResult = await convertPdfToPptx(filePath, path.join(__dirname, 'uploads'));
            pptxPath = conversionResult.pptxPath;
        } catch (conversionError) {
            console.error('PDF to PPTX conversion failed:', conversionError);
            return res.status(500).json({
                success: false,
                error: `PDF conversion failed: ${conversionError.message || 'Unknown error'}`
            });
        }

        if (!pptxPath || !fs.existsSync(pptxPath)) {
            return res.status(500).json({
                success: false,
                error: 'PDF conversion failed: PPTX file was not created'
            });
        }

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
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (pptxPath && fs.existsSync(pptxPath)) fs.unlinkSync(pptxPath);

        return res.json({
            success: true,
            presentationId,
            link: webViewLink,
            markdown: conversionResult.markdown // Return extracted markdown for editing
        });

    } catch (error) {
        console.error('PDF Import error:', error);
        // Cleanup
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (pptxPath && fs.existsSync(pptxPath)) fs.unlinkSync(pptxPath);

        const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
        return res.status(500).json({ success: false, error: errorMessage });
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

// --- Google Classroom Endpoints ---

app.get('/api/classroom/courses', async (req, res) => {
    try {
        const auth = await authorize();
        const classroom = google.classroom({ version: 'v1', auth });
        
        const response = await classroom.courses.list({
            courseStates: ['ACTIVE'],
            teacherId: 'me' // Only courses where the user is a teacher
        });
        
        // If no courses found, response.data.courses might be undefined
        const courses = response.data.courses || [];
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Classroom list error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/classroom/share', async (req, res) => {
    try {
        const { courseId, type, text, link } = req.body;
        
        if (!courseId || !type || !link) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const auth = await authorize();
        const classroom = google.classroom({ version: 'v1', auth });
        
        const linkMaterial = {
            link: {
                url: link
            }
        };

        if (type === 'material') {
            const response = await classroom.courses.courseWorkMaterials.create({
                courseId,
                requestBody: {
                    title: text || 'New Presentation',
                    description: `Created with MD2Slides AI`,
                    materials: [
                        { link: linkMaterial.link }
                    ],
                    state: 'PUBLISHED'
                }
            });
            res.json({ success: true, id: response.data.id, link: response.data.alternateLink });
        } else if (type === 'announcement') {
            const response = await classroom.courses.announcements.create({
                courseId,
                requestBody: {
                    text: text || 'Check out this presentation!',
                    materials: [
                        { link: linkMaterial.link }
                    ],
                    state: 'PUBLISHED'
                }
            });
            res.json({ success: true, id: response.data.id, link: response.data.alternateLink });
        } else {
            res.status(400).json({ error: 'Invalid share type' });
        }

    } catch (error) {
        console.error('Classroom share error:', error);
        res.status(500).json({ error: error.message });
    }
});



// Catch-all: serve React app for any non-API routes
app.get('/{*splat}', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not built. Run npm run build in client directory.');
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
