const { parseMarkdown } = require('./src/parser');
const { authorize, createPresentation, addSlides } = require('./src/slides');
const theme = require('./src/theme');
const path = require('path');

async function main() {
  try {
    const filePath = process.argv[2] || path.join(__dirname, 'rapport-spectrum-ssrs.md');
    console.log(`Parsing markdown file: ${filePath}`);
    const slides = parseMarkdown(filePath);

    console.log('Authenticating with Google...');
    const auth = await authorize();

    console.log('Creating presentation...');
    const presentationId = await createPresentation(auth, 'Rapport Spectrum SSRS');

    console.log('Adding slides...');
    await addSlides(auth, presentationId, slides, theme);

    console.log(`Successfully converted ${filePath} to Google Slides!`);
    console.log(`Presentation ID: ${presentationId}`);
    console.log(`Link: https://docs.google.com/presentation/d/${presentationId}`);
  } catch (error) {
    console.error('Error converting markdown to slides:', error);
  }
}

main();
