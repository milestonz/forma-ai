const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('pdf value:', pdf);
if (typeof pdf !== 'function') {
    console.log('Keys:', Object.keys(pdf));
}
