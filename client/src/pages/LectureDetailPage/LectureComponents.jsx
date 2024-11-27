import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";

// Initialize Supabase client

const FlashcardComponent = ({
  flashcards,
  subjectId,
  lectureId,
  onFlashcardsUploaded,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [fetchedFlashcards, setFetchedFlashcards] = useState([]);

  const { user } = useAuth();


console.log(fetchedFlashcards)
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("subjects")
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        const displayName = decodeURIComponent(name)
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        const subject = data?.subjects?.find(
          (s) => s.title.toLowerCase() === displayName.toLowerCase()
        );

        // console.log(subject)

        const lecture = subject?.lectures?.find((l) => l.id === lectureId);

        console.log(lecture)
        if (lecture) {
          setFetchedFlashcards(lecture.flashcards)
          // setFlashcards(lecture.flashcards || []);
          // setSubjectId(subject.id);
          // setBriefs(lecture.briefs || []);
          // setFiles(lecture.files || []);
        }
      } catch (error) {
        console.error("Error fetching lecture data:", error);
        // setError(error.message);
      }
    };

    fetchLectureData();
  }, [user, lectureId]);

  const handleFlashcardsUpload = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);
  
      // Validate flashcards
      if (!flashcards || flashcards.length === 0) {
        throw new Error('No flashcards to upload');
      }
  
      // Ensure each flashcard has a unique ID
      const flashcardsWithIds = flashcards.map(card => ({
        ...card,
        id: card.id || crypto.randomUUID()
      }));
  
      // Fetch current user's subjects
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("subjects")
        .eq("user_id", user.id)
        .single();
  
      if (fetchError) throw fetchError;
  
      // Update subjects array
      const updatedSubjects = userData.subjects.map((subject) => {
        // Find the subject that matches the current subject
        if (subject.id === subjectId) {
          return {
            ...subject,
            lectures: subject.lectures.map((lecture) => {
              // Find the specific lecture and update its flashcards
              if (lecture.id === lectureId) {
                return {
                  ...lecture,
                  flashcards: flashcardsWithIds
                };
              }
              return lecture;
            })
          };
        }
        return subject;
      });
  
      // Update the users table with new subjects array
      const { error: updateError } = await supabase
        .from("users")
        .update({ subjects: updatedSubjects })
        .eq("user_id", user.id);
  
      if (updateError) throw updateError;
  
      // Optional callback
      if (onFlashcardsUploaded) {
        onFlashcardsUploaded(flashcardsWithIds);
      }
  
      // Show success message
      alert('Flashcards uploaded successfully!');
    } catch (error) {
      console.error('Error uploading flashcards:', error);
      setUploadError(error.message || 'Failed to upload flashcards');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle moving to next card
  const handleNextCard = () => {
    setActiveCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
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
    return (
      <div className="text-center text-gray-500">No flashcards available</div>
    );
  }

  // Current active card
  const currentCard = flashcards[activeCardIndex];

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      {/* Flashcard Container */}
      <div
        className={`
          relative w-full max-w-md h-96 cursor-pointer
          transition-all duration-500 ease-in-out
          ${isFlipped ? "transform rotate-y-180" : ""}
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
            ${isFlipped ? "opacity-0 invisible" : "opacity-100"}
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
            ${isFlipped ? "opacity-100" : "opacity-0 invisible rotate-y-180"}
          `}
        >
          <p className="text-lg text-gray-700">{currentCard.answer}</p>
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

      {/* Upload Button */}
      <button
        onClick={handleFlashcardsUpload}
        disabled={isUploading}
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Upload Flashcards"}
      </button>

      {/* Error Message */}
      {uploadError && <div className="mt-4 text-red-500">{uploadError}</div>}
    </div>
  );
};

// PropTypes validation
FlashcardComponent.propTypes = {
  flashcards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  subjectId: PropTypes.string.isRequired,
  lectureId: PropTypes.string.isRequired,
  onFlashcardsUploaded: PropTypes.func,
};

export default FlashcardComponent;
