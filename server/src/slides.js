const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials',
  'https://www.googleapis.com/auth/classroom.announcements'
];
const TOKEN_PATH = path.join(__dirname, '../token.json');

/**
 * Get Google credentials from environment variables or credentials.json file
 */
function getGoogleCredentials() {
  // First try environment variables
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET
    };
  }
  // Fallback to credentials.json file
  const credPath = path.join(__dirname, '../credentials.json');
  if (fs.existsSync(credPath)) {
    const credentials = JSON.parse(fs.readFileSync(credPath));
    const { client_id, client_secret } = credentials.installed || credentials.web;
    return { client_id, client_secret };
  }
  throw new Error('Google credentials not found. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
}

/**
 * Load or request authorization to call APIs.
 */
async function authorize() {
  let client = loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  throw new Error('No saved credentials found. Please login first.');
}

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
function loadSavedCredentialsIfExist() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const content = fs.readFileSync(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    }
  } catch (err) {
    console.error('Error loading saved credentials:', err);
  }
  return null;
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  try {
    const { client_id, client_secret } = getGoogleCredentials();
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id,
      client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

/**
 * Creates a new presentation.
 * @param {google.auth.OAuth2} auth - The authenticated Google OAuth2 client.
 * @param {string} title - The title of the presentation.
 * @returns {Promise<string>} - The ID of the created presentation.
 */
async function createPresentation(auth, title) {
  const slidesService = google.slides({ version: 'v1', auth });
  const res = await slidesService.presentations.create({
    resource: {
      title,
    },
  });
  console.log(`Created presentation with ID: ${res.data.presentationId}`);
  return res.data.presentationId;
}

/**
 * Adds slides to the presentation with styling.
 * @param {google.auth.OAuth2} auth - The authenticated Google OAuth2 client.
 * @param {string} presentationId - The ID of the presentation.
 * @param {Array<{title: string, content: Array<{text: string, boldRanges: Array<{start: number, end: number}>}>}>} slides - Array of slide objects.
 * @param {object} theme - The theme configuration.
 */
/**
 * Adds slides to the presentation with a custom layout.
 * @param {google.auth.OAuth2} auth - The authenticated Google OAuth2 client.
 * @param {string} presentationId - The ID of the presentation.
 * @param {Array<{title: string, content: Array<{text: string, boldRanges: Array<{start: number, end: number}>}>}>} slides - Array of slide objects.
 * @param {object} globalTheme - The default theme configuration.
 * @param {object} slideThemes - Map of slide index to theme key.
 * @param {object} allThemes - All available themes.
 */
async function addSlides(auth, presentationId, slides, globalTheme, slideThemes = {}, allThemes = {}) {
  const slidesService = google.slides({ version: 'v1', auth });
  const requests = [];
  
  const PAGE_WIDTH = 720;
  const PAGE_HEIGHT = 405;
  const HEADER_HEIGHT = 50;
  const FOOTER_HEIGHT = 30;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const themeKey = slideThemes[i];
    const theme = themeKey && allThemes[themeKey] ? allThemes[themeKey] : globalTheme;

    const slideId = `slide_${Math.random().toString(36).substr(2, 9)}`;
    const headerId = `header_${Math.random().toString(36).substr(2, 9)}`;
    const footerId = `footer_${Math.random().toString(36).substr(2, 9)}`;
    const cardId = `card_${Math.random().toString(36).substr(2, 9)}`;
    const titleId = `title_${Math.random().toString(36).substr(2, 9)}`;
    const bodyId = `body_${Math.random().toString(36).substr(2, 9)}`;
    const footerTextId = `footer_text_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create a Blank Slide
    requests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: 'BLANK',
        },
      },
    });

    // 2. Set Slide Background
    if (theme && theme.backgroundColor) {
        requests.push({
            updatePageProperties: {
                objectId: slideId,
                pageProperties: {
                    pageBackgroundFill: {
                        solidFill: {
                            color: theme.backgroundColor
                        }
                    }
                },
                fields: 'pageBackgroundFill.solidFill.color'
            }
        });
    }

    // 3. Draw Header Bar (Rectangle) - Skip for Cover
    if (!theme || theme.category !== 'Cover') {
        requests.push({
            createShape: {
                objectId: headerId,
                shapeType: 'RECTANGLE',
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: PAGE_WIDTH, unit: 'PT' }, height: { magnitude: 60, unit: 'PT' } }, // Width > slide width to cover edges
                    transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
                }
            }
        });
        // Style Header Bar
        if (theme && theme.primaryColor) {
            requests.push({
                updateShapeProperties: {
                    objectId: headerId,
                    shapeProperties: {
                        shapeBackgroundFill: { solidFill: { color: theme.primaryColor } },
                        outline: { propertyState: 'NOT_RENDERED' }
                    },
                    fields: 'shapeBackgroundFill.solidFill.color,outline'
                }
            });
        }
    }

    // 4. Draw Footer Bar (Rectangle)
    requests.push({
        createShape: {
            objectId: footerId,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: PAGE_WIDTH, unit: 'PT' }, height: { magnitude: 30, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: PAGE_HEIGHT - FOOTER_HEIGHT, unit: 'PT' }
                // Standard 16:9 is 720pt x 405pt OR 960pt x 540pt. Google Slides default is 720pt x 405pt (10 inches x 5.625 inches).
                // Let's assume 720x405 for now, or check page properties.
                // Actually, let's use a safe bet. If we assume 720x405:
                // Footer Y = 405 - 30 = 375.
            }
        }
    });
    // Update Footer Position (We can set it directly in the createShape request above, no need to modify it here)
    // The previous code block was trying to modify the request object after pushing it, which is fine, but the indices were likely wrong.
    // Let's just define the correct transform in the createShape request directly.

    // Style Footer Bar
    if (theme && theme.primaryColor) {
        requests.push({
            updateShapeProperties: {
                objectId: footerId,
                shapeProperties: {
                    shapeBackgroundFill: { solidFill: { color: theme.primaryColor } },
                    outline: { propertyState: 'NOT_RENDERED' }
                },
                fields: 'shapeBackgroundFill.solidFill.color,outline'
            }
        });
    }

    // 5. Draw Content Card (Rounded Rectangle) - Skip for Cover
    if (!theme || theme.category !== 'Cover') {
        requests.push({
            createShape: {
                objectId: cardId,
                shapeType: 'ROUND_RECTANGLE',
                elementProperties: {
                    pageObjectId: slideId,
                    size: { 
                        width: { magnitude: PAGE_WIDTH - 40, unit: 'PT' }, 
                        height: { magnitude: PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 40, unit: 'PT' } 
                    },
                    transform: { 
                        scaleX: 1, 
                        scaleY: 1, 
                        translateX: 20, 
                        translateY: HEADER_HEIGHT + 20, 
                        unit: 'PT' 
                    }
                }
            }
        });
        // Style Card
        if (theme && theme.cardBackgroundColor) {
            requests.push({
                updateShapeProperties: {
                    objectId: cardId,
                    shapeProperties: {
                        shapeBackgroundFill: { solidFill: { color: theme.cardBackgroundColor } },
                        outline: { propertyState: 'NOT_RENDERED' } // No border
                    },
                    fields: 'shapeBackgroundFill.solidFill.color,outline'
                }
            });
        }
    }

    // 6. Add Title Text (Inside Header)
    requests.push({
        createShape: {
            objectId: titleId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: PAGE_WIDTH - 40, unit: 'PT' }, height: { magnitude: HEADER_HEIGHT, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 20, translateY: 0, unit: 'PT' }
            }
        }
    });

    if (slide.title && slide.title.trim().length > 0) {
        requests.push({
            insertText: {
                objectId: titleId,
                text: slide.title
            }
        });
        // Style Title
        if (theme && theme.headerTextStyle) {
            requests.push({
                updateTextStyle: {
                    objectId: titleId,
                    style: theme.headerTextStyle,
                    fields: 'fontFamily,fontSize,bold,foregroundColor'
                }
            });
            // Vertically align title
            requests.push({
                updateShapeProperties: {
                    objectId: titleId,
                    shapeProperties: {
                        contentAlignment: 'MIDDLE'
                    },
                    fields: 'contentAlignment'
                }
            });
        }
    }

    // 7. Add Footer Text
    requests.push({
        createShape: {
            objectId: footerTextId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: PAGE_WIDTH - 40, unit: 'PT' }, height: { magnitude: FOOTER_HEIGHT, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 20, translateY: PAGE_HEIGHT - FOOTER_HEIGHT, unit: 'PT' }
            }
        }
    });
    requests.push({
        insertText: {
            objectId: footerTextId,
            text: "2WINGS Coaching Mastery Program - AI Module | 2025, Milestonz" // Hardcoded footer for now based on image
        }
    });
    // Style Footer Text
    if (theme && theme.footerTextStyle) {
        requests.push({
            updateTextStyle: {
                objectId: footerTextId,
                style: theme.footerTextStyle,
                fields: 'fontFamily,fontSize,foregroundColor'
            }
        });
        requests.push({
            updateShapeProperties: {
                objectId: footerTextId,
                shapeProperties: {
                    contentAlignment: 'MIDDLE'
                },
                fields: 'contentAlignment'
            }
        });
    }

    // 8. Add Body Text (Inside Card)
    // We use the cardId itself if it can hold text, but ROUND_RECTANGLE can hold text.
    // However, to ensure padding, let's create a text box INSIDE the card.
    requests.push({
        createShape: {
            objectId: bodyId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
                pageObjectId: slideId,
                size: { 
                    width: { magnitude: PAGE_WIDTH - 80, unit: 'PT' }, 
                    height: { magnitude: PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 80, unit: 'PT' } 
                },
                transform: { 
                    scaleX: 1, 
                    scaleY: 1, 
                    translateX: 40, 
                    translateY: HEADER_HEIGHT + 40, 
                    unit: 'PT' 
                }
            }
        }
    });

    if (slide.content.length > 0) {
      const fullBodyText = slide.content.map(c => c.text).join('\n');
      
      requests.push({
        insertText: {
          objectId: bodyId,
          text: fullBodyText,
        },
      });

      // Calculate and apply bold ranges
      let currentIndex = 0;
      slide.content.forEach(line => {
          line.boldRanges.forEach(range => {
              requests.push({
                  updateTextStyle: {
                      objectId: bodyId,
                      textRange: {
                          type: 'FIXED_RANGE',
                          startIndex: currentIndex + range.start,
                          endIndex: currentIndex + range.end
                      },
                      style: {
                          bold: true
                      },
                      fields: 'bold'
                  }
              });
          });
          currentIndex += line.text.length + 1; // +1 for newline
      });

      // Style Body (General)
      if (theme && theme.bodyStyle) {
          requests.push({
              updateTextStyle: {
                  objectId: bodyId,
                  style: theme.bodyStyle,
                  fields: 'fontFamily,fontSize,foregroundColor'
              }
          });
      }
      
      // Left Alignment
      requests.push({
          updateParagraphStyle: {
              objectId: bodyId,
              textRange: {
                  type: 'ALL'
              },
              style: {
                  alignment: 'START'
              },
              fields: 'alignment'
          }
      });
      
      // Create paragraphs for bullet points - Skip for Cover
      if (!theme || theme.category !== 'Cover') {
          requests.push({
              createParagraphBullets: {
                  objectId: bodyId,
                  textRange: {
                      type: 'ALL'
                  },
                  bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
              }
          });
      }
    }
  }

  if (requests.length > 0) {
    const res = await slidesService.presentations.batchUpdate({
      presentationId,
      resource: {
        requests,
      },
    });
    console.log(`Added ${res.data.replies.length} slides.`);
  }
}

module.exports = { authorize, createPresentation, addSlides };
