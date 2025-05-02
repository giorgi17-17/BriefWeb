# LectureDetailPage Component Structure

This directory contains the refactored components for the LectureDetailPage feature. The refactoring was done to improve maintainability by splitting a large monolithic component into smaller, focused components with single responsibilities.

## Component Structure
..
### Main Component

- `LectureDetailPage.jsx` - Container component that orchestrates the feature and manages high-level state.

### UI Components

- `LectureHeader.jsx` - Displays the header with back navigation button.
- `TabNavigation.jsx` - Handles tab switching UI and file selection.
- `FlashcardsTab.jsx` - Manages the flashcards tab content with generation and display.
- `ErrorMessage.jsx` - Simple display component for error messages.

### Custom Hooks

- `useLectureData.js` - Manages lecture data fetching, state, and file operations.
- `useFlashcardGeneration.js` - Handles flashcard generation logic.

### Utilities

- `navigationUtils.js` - Provides navigation helpers with proper cleanup.

## Component Responsibilities

### LectureDetailPage

- Coordinates between different components
- Manages active tab state
- Provides data and callbacks to child components

### LectureHeader

- Displays the lecture title and back navigation
- Single responsibility: header UI

### TabNavigation

- Handles tab selection and UI
- Integrates with FileSelector
- Single responsibility: navigation between tabs

### FlashcardsTab

- Handles flashcard-specific UI and functionality
- Wraps FlashcardComponent with proper props
- Single responsibility: flashcard tab content

### ErrorMessage

- Simple UI component for displaying error messages
- Single responsibility: error presentation

## State Management

The refactoring follows these state management principles:

- **Parent-level state**: Active tab, selected file, UI loading states
- **Hook-managed state**: Data fetching, file operations, flashcard generation
- **Component-level state**: UI-specific state within each component

## Benefits of the Refactoring

1. **Improved maintainability**: Smaller components with clear responsibilities
2. **Better code organization**: Related functionality grouped together
3. **Enhanced reusability**: Components can be more easily reused in other parts of the application
4. **Simplified testing**: Components with single responsibilities are easier to test
5. **Better performance**: Potential for more targeted re-renders

## Usage

The main entry point is still `LectureDetailPage.jsx`, which uses these components internally.
