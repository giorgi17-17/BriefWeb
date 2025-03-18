# Changelog

## Version 1.1.5 - 2024-03-15

### Fixed

- Removed non-existent `user_id` field from quiz_sets table operations
- Resolved "Could not find the 'user_id' column of 'quiz_sets'" error

## Version 1.1.4 - 2024-03-15

### Fixed

- Fixed column name in quiz processing: Changed 'updated_at' to 'last_updated' to match the database schema
- Resolved "Could not find the 'updated_at' column of 'quiz_sets'" error

## Version 1.1.3 - 2024-03-15

### Fixed

- Fixed database schema error in quiz processing: "Could not find the 'options' column of 'quiz_sets'"
- Corrected quiz data processing to properly handle the structure returned by the AI service
- Updated quiz question insertion to properly save multiple choice, open-ended, and case study questions
- Ensured proper storage of quiz options in the quiz_options table instead of the quiz_sets table

## Version 1.1.2 - 2024-03-15

### Changed

- Reverted to original AI prompts while maintaining robust error handling
- Enhanced detection of non-JSON formatted responses
- Added direct handling of Question/Answer format in plaintext responses

### Fixed

- Fixed issue with modified AI prompts not generating proper responses
- Added special handling for Question/Answer format in emergency extraction
- Improved compatibility with various AI response formats

## Version 1.1.1 - 2024-03-15

### Added

- More robust JSON parsing for flashcard generation
- New emergency extraction methods for flashcard content
- Comprehensive test script for handling problematic AI responses

### Changed

- Improved system prompts for AI model to emphasize proper JSON formatting
- Enhanced regex patterns for fixing various JSON formatting issues
- Updated temperature settings for more consistent AI responses

### Fixed

- Fixed parsing errors with missing commas between properties
- Fixed issues with unescaped quotes in AI responses
- Improved handling of possessive apostrophes (e.g., "KLM's")
- Added protection against broken JSON format while still extracting usable content

## Version 1.1.0 - 2024-03-14

### Added

- Support for PPTX files using the `officeparser` library
- Robust error handling in AI service and API routes
- Fallback responses for all error scenarios

### Changed

- Replaced custom PPTX parser with `officeparser` for better reliability
- Enhanced JSON parsing in flashcard generation
- Updated API routes for graceful error handling
- Improved debugging with better logging

### Fixed

- Resolved "Cannot resolve QName a" error in PPTX parsing
- Fixed JSON parsing errors in AI service
- Addressed client-side error handling for failed API requests
