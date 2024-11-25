import  { useState } from 'react';
import PropTypes from 'prop-types';

const FlashcardComponent = ({ flashcards }) => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Handle moving to next card
  const handleNextCard = () => {
    setActiveCardIndex((prevIndex) => 
      (prevIndex + 1) % flashcards.length
    );
    setIsFlipped(false);
  };

  // Handle moving to previous card
  const handlePrevCard = () => {
    setActiveCardIndex((prevIndex) => 
      prevIndex === 0 ? flashcards.length - 1 : prevIndex - 1
    );
    setIsFlipped(false);
  };

  // If no flashcards, return nothing
  if (!flashcards || flashcards.length === 0) {
    return <div className="text-center text-gray-500">No flashcards available</div>;
  }
console.log(flashcards)
  // Current active card
  const currentCard = flashcards[activeCardIndex];

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      {/* Flashcard Container */}
      <div 
        className={`
          relative w-full max-w-md h-96 cursor-pointer
          transition-all duration-500 ease-in-out
          ${isFlipped ? 'transform rotate-y-180' : ''}
        `}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of Card */}
        <div 
          className={`
            absolute w-full h-full bg-white rounded-xl shadow-lg
            flex items-center justify-center text-center p-6
            transition-all duration-500 ease-in-out
            border-2 border-blue-500
            ${isFlipped ? 'opacity-0 invisible' : 'opacity-100'}
          `}
        >
          <h3 className="text-xl font-semibold text-gray-800">
            {currentCard.question}
          </h3>
        </div>

        {/* Back of Card */}
        <div 
          className={`
            absolute w-full h-full bg-blue-100 rounded-xl shadow-lg
            flex items-center justify-center text-center p-6
            transition-all duration-500 ease-in-out
            border-2 border-blue-600
            ${isFlipped ? 'opacity-100' : 'opacity-0 invisible rotate-y-180'}
          `}
        >
          <p className="text-lg text-gray-700">
            {currentCard.answer}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mt-6">
        <button 
          onClick={handlePrevCard}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Previous
        </button>
        <button 
          onClick={handleNextCard}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Next
        </button>
      </div>

      {/* Card Counter */}
      <div className="mt-4 text-gray-600">
        Card {activeCardIndex + 1} of {flashcards.length}
      </div>
    </div>
  );
};

// PropTypes validation
FlashcardComponent.propTypes = {
  flashcards: PropTypes.arrayOf(
    PropTypes.shape({
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired
    })
  ).isRequired
};

export default FlashcardComponent;