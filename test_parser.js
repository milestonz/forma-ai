const { parseMarkdown } = require('./src/parser');
const path = require('path');

const filePath = path.join(__dirname, 'rapport-spectrum-ssrs.md');
const slides = parseMarkdown(filePath);

console.log(JSON.stringify(slides, null, 2));
