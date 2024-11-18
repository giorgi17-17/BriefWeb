import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

async function extractTextFromPDF(url) {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    
    console.log('Extracted PDF text length:', text.length);
    return text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

async function extractTextFromDOCX(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('Extracted DOCX text length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw error;
  }
}

async function extractTextFromFile(file) {
  console.log('Extracting text from:', file.type);
  
  switch (file.type) {
    case 'application/pdf':
      return await extractTextFromPDF(file.url);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return await extractTextFromDOCX(file.url);
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

export async function generateFlashcards(file) {
  try {
    console.log('Starting text extraction from file:', file.name);
    const extractedText = await extractTextFromFile(file);
    console.log('Extracted text length:', extractedText.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI that creates educational flashcards. Generate 5 flashcards in JSON format with 'question' and 'answer' fields. Keep questions concise and answers brief but informative. Return ONLY the JSON array."
        },
        {
          role: "user",
          content: `Generate 5 flashcards from this content: ${extractedText}`
        }
      ],
      temperature: 0.7,
    });

    console.log('Received response from OpenAI');
    const flashcardsText = completion.choices[0].message.content;
    const parsedCards = JSON.parse(flashcardsText);
    console.log('Generated flashcards:', parsedCards);
    
    return parsedCards;
  } catch (error) {
    console.error('Error in generateFlashcards:', error);
    throw error;
  }
}
