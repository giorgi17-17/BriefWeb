import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { generateFlashcards } from '../../utils/api';

const FlashCards = ({ content }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (content) {
      loadFlashcards();
    }
  }, [content]);

  const loadFlashcards = async () => {
    try {
      console.log('Starting flashcard generation for file:', content);
      setIsLoading(true);
      const cards = await generateFlashcards(content);
      setFlashcards(cards);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setFlashcards([{
        question: "Error generating flashcards",
        answer: error.message || "An error occurred while generating flashcards"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center">Loading flashcards...</div>;
  }

  if (!flashcards.length) {
    return <div className="text-center">No flashcards available</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div 
        className="min-h-[200px] bg-white rounded-lg shadow-lg p-6 cursor-pointer mb-4"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="text-center">
          {isFlipped 
            ? flashcards[currentCard].answer 
            : flashcards[currentCard].question}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="py-2">
          {currentCard + 1} / {flashcards.length}
        </span>
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

FlashCards.propTypes = {
  content: PropTypes.object.isRequired,
};

export default FlashCards;