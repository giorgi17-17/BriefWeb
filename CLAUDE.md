# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BriefWeb is a full-stack web application that processes educational documents (PDF/PPTX) and generates AI-powered study materials including briefs, flashcards, and quizzes. The application consists of a React frontend (client) and Node.js/Express backend (server) with Supabase integration for authentication and storage.

## Architecture

### Frontend (client/)
- **React 18** with Vite for development and building
- **TailwindCSS** for styling with PostCSS processing
- **React Router** for navigation
- **i18next** for internationalization (English/Georgian)
- **Supabase** for authentication and storage
- **Context API** for state management (Auth, Language, Theme, User Plans)

### Backend (server/)
- **Express.js** server running on port 5000 (main) and 3000 (secondary)
- **AI Services**: OpenAI and Google Gemini for content generation
- **Document Processing**: PDF (pdf-parse) and PPTX (officeparser) file processing
- **Supabase** for database operations and file storage
- **Robust error handling** with fallback strategies for AI responses

## Development Commands

### Client Development
```bash
cd client
npm run dev              # Start development server (Vite)
npm run test-auth        # Start with test mode for auth
npm run build            # Build for production
npm run postbuild        # Generate sitemap after build
npm run lint             # Run ESLint
npm run preview          # Preview production build
npm run generate-sitemap # Generate sitemap manually
```

### Server Development
```bash
cd server
npm run start            # Start production server
npm run dev              # Start with nodemon (port 5000)
npm run dev3000          # Start secondary server (port 3000)
npm run dev-both         # Run both servers concurrently
```

### Testing Scripts (server/)
```bash
node test-pptx.js           # Test PPTX parsing functionality
node test-file-service.js   # Test file processing logic
node test-flashcard.js      # Test flashcard generation robustness
node test-real-flashcard.js # Test with real OpenAI API calls
```

## Key Architecture Patterns

### AI Content Generation Pipeline
1. **Document Upload**: Files uploaded to Supabase storage
2. **Text Extraction**: PDF/PPTX content extraction using specialized parsers
3. **AI Processing**: Content sent to OpenAI/Gemini with structured prompts
4. **Response Handling**: Multi-stage JSON repair and fallback content extraction
5. **Database Storage**: Results stored in Supabase with proper relationships

### Error Handling Strategy
The system implements comprehensive error recovery:
- **JSON Repair**: Regex-based fixing of malformed AI responses
- **Fallback Extraction**: Pattern matching for content when JSON parsing fails
- **Emergency Recovery**: Multiple fallback mechanisms ensure meaningful responses
- **User-Friendly Errors**: Descriptive error messages with specific failure information

### Database Schema (Supabase)
- **quiz_sets**: Quiz collections with lecture relationships
- **quiz_questions**: Individual questions with types (multiple_choice, open_ended, case_study)
- **quiz_options**: Answer options and sample responses
- **briefs**: Generated summaries and educational content
- **user_plans**: User subscription and usage tracking

### State Management Contexts
- **AuthContext**: User authentication and session management with automatic refresh
- **LanguageContext**: i18n language switching (en/ka)
- **ThemeContext**: Dark/light theme management
- **UserPlanContext**: Subscription status and usage tracking

## Important File Locations

### Configuration
- `server/config/ai/promptTemplates.js` - AI prompt templates for different content types
- `server/config/ai/aiConfig.js` - AI service configuration and limits
- `server/config/gemini.js` - Google Gemini AI service setup
- `server/config/openai.js` - OpenAI service configuration
- `client/src/config/firebase.js` - Firebase configuration (if used)

### Core Services
- `server/services/ai/briefService.js` - Brief generation with batch processing
- `server/services/ai/flashcardService.js` - Flashcard generation
- `server/services/ai/quizService.js` - Quiz generation with multiple question types
- `server/utils/pptxParser.js` - PowerPoint content extraction
- `server/utils/pdfParser.js` - PDF text extraction

### Frontend Core
- `client/src/contexts/` - React contexts for global state
- `client/src/utils/api.js` - API communication utilities
- `client/src/utils/supabaseClient.js` - Supabase client configuration
- `client/src/pages/` - Main application pages and routing

## Development Notes

### Proxy Configuration
The Vite development server proxies `/api` requests to `http://localhost:5000` (backend server).

### CORS Configuration
The backend accepts requests from:
- `https://www.briefly.ge`
- `https://briefly.ge`
- `http://localhost:5173` (Vite dev server)
- Environment-specific CLIENT_URL

### File Processing Support
- **PDF**: Uses `pdf-parse` for text extraction with page-by-page support
- **PPTX**: Uses `officeparser` for PowerPoint content extraction with slide-by-slide processing
- **Error Recovery**: Robust handling of malformed documents and AI responses

### AI Token Management
The system includes comprehensive token counting and cost tracking:
- Input token estimation before API calls
- Actual cost tracking from AI responses
- Usage monitoring for paid tier reporting
- Cost optimization through batch processing

### Internationalization
- Supports English (en) and Georgian (ka) languages
- Language detection and switching
- SEO optimization for multilingual content
- Translation files in `client/src/locales/`

## Environment Variables Required
- `OPENAI_API_KEY` - OpenAI API access
- `GEMINI_API_KEY` - Google Gemini API access
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `CLIENT_URL` - Frontend URL for CORS

## Deployment Notes
- Frontend builds to `client/dist/` with automatic sitemap generation
- Backend serves from port 5000 (main) or 3000 (secondary)
- Uses Supabase for database and file storage
- Requires proper environment variables for AI services and database access