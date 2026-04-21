const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract plain text from a resume file (PDF or DOCX).
 * @param {string} filePath - Absolute path to the resume file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Cleaned plain text
 */
const extractText = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let rawText = '';

  if (mimeType === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse(new Uint8Array(dataBuffer));
    const pdfData = await parser.getText();
    rawText = pdfData.text || '';
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    rawText = result.value || '';
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  return cleanText(rawText);
};

/**
 * Clean extracted text by removing excessive whitespace and normalizing line breaks.
 */
const cleanText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

module.exports = { extractText };
