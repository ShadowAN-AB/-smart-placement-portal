const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract plain text from a resume buffer (PDF or DOCX).
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Cleaned plain text
 */
const extractText = async (buffer, mimeType) => {
  if (!buffer || !buffer.length) {
    throw new Error('Empty file buffer');
  }

  let rawText = '';

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse(new Uint8Array(buffer));
    const pdfData = await parser.getText();
    rawText = pdfData.text || '';
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value || '';
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  return cleanText(rawText);
};

const cleanText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

module.exports = { extractText };
