import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../../utils/supabaseClient";

const FlashcardComponent = ({
  flashcards,
  lectureId,
  onFlashcardsUploaded,
  onFlashcardsModified,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [editingSetId, setEditingSetId] = useState(null);
  const [editingSetName, setEditingSetName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Update local state when flashcards prop changes
  useEffect(() => {
    if (flashcards && Array.isArray(flashcards)) {
      setFlashcardSets(flashcards.filter(set => set.isUploaded !== false));
    }
  }, [flashcards]);

  // Process and upload new flashcards when they arrive
  useEffect(() => {
    const uploadNewSet = async () => {
      const newSet = flashcards?.[flashcards.length - 1];
      if (!newSet?.isUploaded && newSet?.cards?.length > 0) {
        try {
          // Create new flashcard set
          const { data: flashcardSet, error: setError } = await supabase
            .from('flashcard_sets')
            .insert({
              lecture_id: lectureId,
              name: newSet.name || `Set ${flashcards.length}`
            })
            .select()
            .single();

          if (setError) throw setError;

          // Insert all flashcards for the set
          const { error: cardsError } = await supabase
            .from('flashcards')
            .insert(
              newSet.cards.map(card => ({
                flashcard_set_id: flashcardSet.id,
                question: card.question,
                answer: card.answer
              }))
            );

          if (cardsError) throw cardsError;

          // Get the complete set with cards
          const { data: completeSet, error: fetchError } = await supabase
            .from('flashcard_sets')
            .select(`
              *,
              flashcards(*)
            `)
            .eq('id', flashcardSet.id)
            .single();

          if (fetchError) throw fetchError;

          const processedSet = {
            id: completeSet.id,
            name: completeSet.name,
            createdAt: completeSet.created_at,
            cards: completeSet.flashcards.map(card => ({
              id: card.id,
              question: card.question,
              answer: card.answer
            })),
            isUploaded: true
          };

          if (onFlashcardsUploaded) {
            onFlashcardsUploaded(processedSet);
          }
        } catch (error) {
          console.error("Error uploading flashcards:", error);
          setUploadError(error.message || "Failed to upload flashcards");
        }
      }
    };

    // Only run if there are flashcards and the last one isn't uploaded
    const lastSet = flashcards?.[flashcards.length - 1];
    if (lectureId && lastSet && !lastSet.isUploaded && lastSet.cards?.length > 0) {
      uploadNewSet();
    }
  }, [flashcards, lectureId]);

  const handleSetChange = index => {
    setActiveSetIndex(index);
    setActiveCardIndex(0);
    setIsFlipped(false);
  };

  const initiateDelete = (setId, setName) => {
    setDeleteConfirmation({ id: setId, name: setName });
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      // Delete flashcard set (this will cascade delete the flashcards)
      const { error: deleteError } = await supabase
        .from('flashcard_sets')
        .delete()
        .eq('id', deleteConfirmation.id);

      if (deleteError) throw deleteError;

      const updatedFlashcards = flashcardSets.filter(set => set.id !== deleteConfirmation.id);
      setFlashcardSets(updatedFlashcards);
      if (activeSetIndex >= updatedFlashcards.length) {
        setActiveSetIndex(Math.max(0, updatedFlashcards.length - 1));
      }
      
      // Only call onFlashcardsModified if we have a valid set to show
      if (updatedFlashcards.length > 0) {
        onFlashcardsModified?.(updatedFlashcards);
      }

      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting flashcard set:", error);
      setUploadError(error.message || "Failed to delete flashcard set");
      setDeleteConfirmation(null);
    }
  };

  const handleEditSetName = async (setId) => {
    if (!editingSetName.trim()) return;

    try {
      const { error: updateError } = await supabase
        .from('flashcard_sets')
        .update({ name: editingSetName })
        .eq('id', setId);

      if (updateError) throw updateError;

      const updatedFlashcards = flashcardSets.map(set => 
        set.id === setId ? { ...set, name: editingSetName } : set
      );
      setFlashcardSets(updatedFlashcards);
      
      if (onFlashcardsModified) {
        onFlashcardsModified(updatedFlashcards);
      }

      setEditingSetId(null);
      setEditingSetName("");
    } catch (error) {
      console.error("Error updating set name:", error);
      setUploadError(error.message || "Failed to update set name");
    }
  };

  if (!flashcardSets.length) {
    return <div className="text-center text-gray-500">No flashcard sets available</div>;
  }

  const currentSet = flashcardSets[activeSetIndex];
  const currentCard = currentSet?.cards[activeCardIndex];

  if (!currentCard) {
    return <div className="text-center text-gray-500">No cards in current set</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Flashcard Set</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {deleteConfirmation.name}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {flashcardSets.length > 0 && (
        <div className="mb-6 w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flashcard Sets:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {flashcardSets.map((set, index) => (
              <div 
                key={set.id}
                className={`p-4 rounded-lg ${
                  activeSetIndex === index
                    ? "bg-blue-50 border-2 border-blue-500"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingSetId === set.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingSetName}
                          onChange={(e) => setEditingSetName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded"
                          placeholder="Enter set name"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditSetName(set.id)}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingSetId(null);
                            setEditingSetName("");
                          }}
                          className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{set.name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(set.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingSetId(set.id);
                              setEditingSetName(set.name);
                            }}
                            className="p-1 text-blue-500 hover:text-blue-600"
                            title="Edit set name"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => initiateDelete(set.id, set.name)}
                            className="p-1 text-red-500 hover:text-red-600"
                            title="Delete set"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSetChange(index)}
                  className={`mt-2 w-full py-2 px-4 rounded ${
                    activeSetIndex === index
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {activeSetIndex === index ? "Currently Selected" : "Select Set"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`relative w-full max-w-md h-96 cursor-pointer transition-all duration-500 ease-in-out ${
          isFlipped ? "transform rotate-y-180" : ""
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`absolute w-full h-full bg-white rounded-xl shadow-lg flex items-center justify-center text-center p-6 transition-all duration-500 ease-in-out border-2 border-blue-500 ${
            isFlipped ? "opacity-0 invisible" : "opacity-100"
          }`}
        >
          <h3 className="text-xl font-semibold text-gray-800">{currentCard.question}</h3>
        </div>

        <div
          className={`absolute w-full h-full bg-blue-100 rounded-xl shadow-lg flex items-center justify-center text-center p-6 transition-all duration-500 ease-in-out border-2 border-blue-600 ${
            isFlipped ? "opacity-100" : "opacity-0 invisible rotate-y-180"
          }`}
        >
          <p className="text-lg text-gray-700">{currentCard.answer}</p>
        </div>
      </div>

      <div className="flex space-x-4 mt-6">
        <button
          onClick={() => setActiveCardIndex((prevIndex) => (prevIndex - 1 + currentSet.cards.length) % currentSet.cards.length)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Previous
        </button>
        <button
          onClick={() => setActiveCardIndex((prevIndex) => (prevIndex + 1) % currentSet.cards.length)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Next
        </button>
      </div>

      <div className="mt-4 text-gray-600">
        Card {activeCardIndex + 1} of {currentSet.cards.length}
      </div>

      {uploadError && <div className="mt-4 text-red-500">{uploadError}</div>}
    </div>
  );
};

FlashcardComponent.propTypes = {
  flashcards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      createdAt: PropTypes.string,
      cards: PropTypes.arrayOf(
        PropTypes.shape({
          question: PropTypes.string.isRequired,
          answer: PropTypes.string.isRequired,
        })
      ),
    })
  ),
  lectureId: PropTypes.string.isRequired,
  onFlashcardsUploaded: PropTypes.func,
  onFlashcardsModified: PropTypes.func,
};

export default FlashcardComponent;