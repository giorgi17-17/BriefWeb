# Document Processing API

This API provides functionality to process PDF and PPTX files, extract text from them, and generate AI-powered summaries, flashcards, and quizzes.

## Features

- **Multi-format support**: Process both PDF and PPTX files
- **Text extraction**: Extract text from documents by pages/slides
- **AI Processing**: Generate summaries, flashcards, and quizzes from document content
- **Storage Integration**: Works with Supabase storage for file management
- **Robust Error Handling**: Resilient processing with fallbacks for AI response issues

## API Endpoints

- `/api/process-pdf`: Process a document to generate flashcards
- `/api/process-brief`: Process a document to generate a brief summary
- `/api/test-document-content`: Test extracting content by pages/slides
- `/api/detailed-brief`: Process a document to generate detailed content with summaries per page/slide
- `/api/process-quiz`: Process a document to generate a quiz with custom options

## File Format Support

### PDF Files

- Uses `pdf-parse` library to extract text from PDF files
- Supports both full document and page-by-page extraction

### PPTX Files

- Uses `officeparser` library to extract text from PPTX files (PowerPoint)
- Reliably handles complex PowerPoint presentations with images, shapes, and other elements
- Supports both full document and slide-by-slide extraction
- Automatically detects slides and formats text appropriately

## Implementation Details

The document processing flow works as follows:

1. Client uploads a file to Supabase storage
2. Client calls the API with user ID, lecture ID, and file ID
3. Server downloads the file from Supabase storage
4. Server detects file type (PDF or PPTX) based on extension
5. Server extracts text from the file using the appropriate parser
6. Server processes the extracted text using AI services
7. Server saves results to the database and returns them to the client

## Error Handling and Robustness

The system implements multiple layers of error handling to ensure reliable operation:

### AI Response Processing

- **Multi-stage JSON Repair**: Implements comprehensive regex-based repair for common JSON formatting issues
- **Fallback Content Extraction**: When JSON parsing fails, the system uses pattern matching to extract usable content
- **Emergency Recovery Methods**: Multiple fallback mechanisms ensure meaningful responses even with severely malformed AI outputs
- **Descriptive Errors**: User-friendly error messages with specific information about what went wrong

### Common JSON Issues Handled

- Missing commas between properties
- Unescaped quotes within text (e.g., `"John's "best practice" approach"`)
- Missing commas between JSON objects
- Inconsistent property name formatting
- Possessive apostrophes (e.g., `company's`)
- Non-JSON formatted responses with Question/Answer pattern

### API Endpoint Protection

- Robust parameter validation
- Graceful handling of processing failures
- Meaningful fallback responses for all scenarios
- Complete error logging for debugging

## Database Structure

The system uses several database tables for storing quiz data:

### quiz_sets

- `id`: Primary key
- `lecture_id`: Foreign key to the lecture
- `name`: Name of the quiz set
- `created_at`: Creation timestamp
- `last_updated`: Last update timestamp

### quiz_questions

- `id`: Primary key
- `quiz_set_id`: Foreign key to the quiz set
- `question_text`: The text of the question
- `question_type`: Type of question (multiple_choice, open_ended, case_study_moderate, case_study_advanced)
- `explanation`: Optional explanation for multiple choice questions

### quiz_options

- `id`: Primary key
- `question_id`: Foreign key to the question
- `option_text`: Text of the option or sample answer
- `is_correct`: Boolean indicating if this is the correct answer (for multiple choice)

## Dependencies

- officeparser: For extracting content from PPTX files
- pdf-parse: For extracting text from PDF files
- Supabase: For storage and database

## Testing

Use the provided test scripts to verify functionality:

- `test-pptx.js`: Tests PPTX parsing functionality
- `test-file-service.js`: Tests file type detection and processing logic
- `test-flashcard.js`: Tests robustness of flashcard generation with problematic inputs
- `test-real-flashcard.js`: Tests flashcard generation with real OpenAI API calls

### Running Tests

To test the flashcard generation with simulated problematic responses:

```bash
node test-flashcard.js
```

To test the flashcard generation with real OpenAI API calls:

```bash
node test-real-flashcard.js
```

## Recent Changes

### v1.1.5

- Removed non-existent `user_id` field from quiz_sets table operations
- Resolved "Could not find the 'user_id' column of 'quiz_sets'" error

### v1.1.4

- Fixed column name in quiz processing: Changed 'updated_at' to 'last_updated' to match the database schema
- Resolved "Could not find the 'updated_at' column of 'quiz_sets'" error

### v1.1.3

- Fixed database schema error in quiz processing
- Corrected quiz data processing to properly handle the structure returned by the AI service
- Ensured proper storage of quiz options in the quiz_options table

### v1.1.2

- Reverted to original AI prompts while maintaining robust error handling
- Enhanced detection of non-JSON formatted responses
- Added direct handling of Question/Answer format in plaintext responses
- Fixed issues with modified AI prompts not generating proper responses
