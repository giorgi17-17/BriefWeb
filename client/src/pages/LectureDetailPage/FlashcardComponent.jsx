import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../../utils/supabaseClient";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [processingSetIds, setProcessingSetIds] = useState(new Set()); // Track sets being processed
  // New state for dropdown open/close
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Update local state when flashcards prop changes
  useEffect(() => {
    if (flashcards && Array.isArray(flashcards)) {
      const uploadedSets = flashcards.filter((set) => set.isUploaded !== false);
      setFlashcardSets(uploadedSets);

      // Reset active index if needed
      if (activeSetIndex >= uploadedSets.length && uploadedSets.length > 0) {
        setActiveSetIndex(0);
        setActiveCardIndex(0);
        setIsFlipped(false);
      }

      console.log("Flashcard sets updated:", uploadedSets);
    }
  }, [flashcards, activeSetIndex]);

  // Process and upload new flashcards when they arrive
  useEffect(() => {
    const uploadNewSet = async () => {
      const newSet = flashcards?.[flashcards.length - 1];

      // Skip if no new set or if it's already uploaded or being processed
      if (!newSet || newSet.isUploaded || !newSet.cards?.length) {
        return;
      }

      // Skip if we've already started processing this set (using tempId or another identifier)
      const setIdentifier =
        newSet.tempId || `temp-${flashcards.length}-${Date.now()}`;
      if (processingSetIds.has(setIdentifier)) {
        console.log("Skipping already processing set:", setIdentifier);
        return;
      }

      // Mark this set as being processed
      setProcessingSetIds((prev) => {
        const updated = new Set(prev);
        updated.add(setIdentifier);
        return updated;
      });

      try {
        console.log("Uploading new flashcard set:", newSet);

        // Create new flashcard set
        const { data: flashcardSet, error: setError } = await supabase
          .from("flashcard_sets")
          .insert({
            lecture_id: lectureId,
            name: newSet.name || `Set ${flashcards.length}`,
          })
          .select()
          .single();

        if (setError) throw setError;

        // Insert all flashcards for the set
        const { error: cardsError } = await supabase.from("flashcards").insert(
          newSet.cards.map((card) => ({
            flashcard_set_id: flashcardSet.id,
            question: card.question,
            answer: card.answer,
          }))
        );

        if (cardsError) throw cardsError;

        // Get the complete set with cards
        const { data: completeSet, error: fetchError } = await supabase
          .from("flashcard_sets")
          .select(
            `
              *,
              flashcards(*)
            `
          )
          .eq("id", flashcardSet.id)
          .single();

        if (fetchError) throw fetchError;

        const processedSet = {
          id: completeSet.id,
          name: completeSet.name,
          createdAt: completeSet.created_at,
          cards: completeSet.flashcards.map((card) => ({
            id: card.id,
            question: card.question,
            answer: card.answer,
          })),
          isUploaded: true,
        };

        console.log("Successfully uploaded flashcard set:", processedSet);

        // Update local state immediately before callback
        setFlashcardSets((prevSets) => {
          // Make sure we don't add the same set twice
          if (prevSets.some((set) => set.id === processedSet.id)) {
            return prevSets;
          }
          const updatedSets = [...prevSets, processedSet];

          // Set the active index to the newly added set (in a separate effect)
          setTimeout(() => {
            setActiveSetIndex(updatedSets.length - 1);
            setActiveCardIndex(0);
            setIsFlipped(false);
          }, 0);

          return updatedSets;
        });

        if (onFlashcardsUploaded) {
          onFlashcardsUploaded(processedSet);
        }
      } catch (error) {
        console.error("Error uploading flashcards:", error);
        setUploadError(error.message || "Failed to upload flashcards");
      } finally {
        // Remove this set from processing, regardless of success/failure
        setProcessingSetIds((prev) => {
          const updated = new Set(prev);
          updated.delete(setIdentifier);
          return updated;
        });
      }
    };

    // Only run if there are flashcards and the last one isn't uploaded
    const lastSet = flashcards?.[flashcards.length - 1];
    if (
      lectureId &&
      lastSet &&
      !lastSet.isUploaded &&
      lastSet.cards?.length > 0
    ) {
      uploadNewSet();
    }
  }, [flashcards, lectureId, onFlashcardsUploaded]);

  const handleSetChange = (index) => {
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
        .from("flashcard_sets")
        .delete()
        .eq("id", deleteConfirmation.id);

      if (deleteError) throw deleteError;

      const updatedFlashcards = flashcardSets.filter(
        (set) => set.id !== deleteConfirmation.id
      );
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
        .from("flashcard_sets")
        .update({ name: editingSetName })
        .eq("id", setId);

      if (updateError) throw updateError;

      const updatedFlashcards = flashcardSets.map((set) =>
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
    return (
      <div className="text-center theme-text-secondary">
        No flashcard sets available
      </div>
    );
  }

  const currentSet = flashcardSets[activeSetIndex];
  const currentCard = currentSet?.cards[activeCardIndex];

  if (!currentCard) {
    return (
      <div className="text-center theme-text-secondary">
        No cards in current set
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full mt-4">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="theme-bg-secondary theme-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 theme-text-primary">
              Delete Flashcard Set
            </h3>
            <p className="theme-text-secondary mb-6">
              Are you sure you want to delete {deleteConfirmation.name}? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 theme-text-secondary hover:text-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown for Flashcard Sets */}
      {flashcardSets.length > 0 && (
        <div className="mb-6 w-full">
          <h3 className="text-lg font-semibold mb-2 theme-text-primary">
            {flashcardSets.length} Flashcard Sets
          </h3>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between w-full px-4 py-2 theme-border rounded-lg text-sm theme-text-primary bg-[#ebebeb] dark:bg-[#2a2a35] hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <span>
              {flashcardSets[activeSetIndex]?.name || "Select flashcard set"}
            </span>
            {dropdownOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          <div
            className={`transition-all duration-300 overflow-hidden ${
              dropdownOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <ul className="mt-2 space-y-2">
              {flashcardSets.map((set, index) => (
                <li
                  key={set.id}
                  onClick={() => {
                    if (!editingSetId) {
                      handleSetChange(index);
                      setDropdownOpen(false);
                    }
                  }}
                  className={`cursor-pointer px-3 py-2 rounded-lg transition-all ${
                    activeSetIndex === index
                      ? "bg-blue-600/20 border border-blue-500/50"
                      : "bg-[#ebebeb] dark:bg-[#2a2a35] theme-border hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a]"
                  }`}
                >
                  {editingSetId === set.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingSetName}
                        onChange={(e) => setEditingSetName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded theme-bg-tertiary theme-border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Enter set name"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSetName(set.id);
                        }}
                        className="px-2 py-1 bg-green-500/80 hover:bg-green-500 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSetId(null);
                          setEditingSetName("");
                        }}
                        className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium theme-text-primary">
                        {set.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSetId(set.id);
                            setEditingSetName(set.name);
                          }}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="Edit set name"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            initiateDelete(set.id, set.name);
                          }}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          title="Delete set"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Flashcard Display */}
      <div
        className={`relative w-full max-w-md h-96 cursor-pointer transition-all duration-500 ease-in-out ${
          isFlipped ? "transform rotate-y-180" : ""
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`absolute w-full h-full bg-white dark:bg-[#1a1a22] rounded-xl shadow-xl flex items-center justify-center text-center p-6 transition-all duration-500 ease-in-out theme-border ${
            isFlipped ? "opacity-0 invisible" : "opacity-100"
          }`}
        >
          <h3 className="text-xl font-semibold theme-text-primary">
            {currentCard.question}
          </h3>
        </div>

        <div
          className={`absolute w-full h-full bg-white dark:bg-[#1a1a22] rounded-xl shadow-xl flex items-center justify-center text-center p-6 transition-all duration-500 ease-in-out theme-border ${
            isFlipped ? "opacity-100" : "opacity-0 invisible rotate-y-180"
          }`}
        >
          <p className="text-lg theme-text-primary">{currentCard.answer}</p>
        </div>
      </div>

      <div className="flex space-x-4 mt-6">
        <button
          onClick={() => {
            setIsFlipped(false);
            setActiveCardIndex(
              (prevIndex) =>
                (prevIndex - 1 + currentSet.cards.length) %
                currentSet.cards.length
            );
          }}
          className="px-4 py-2 bg-[#ebebeb] dark:bg-[#2a2a35] hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a] theme-text-primary rounded theme-border transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => {
            setIsFlipped(false);
            setActiveCardIndex(
              (prevIndex) => (prevIndex + 1) % currentSet.cards.length
            );
          }}
          className="px-4 py-2 bg-[#ebebeb] dark:bg-[#2a2a35] hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a] theme-text-primary rounded theme-border transition-colors"
        >
          Next
        </button>
      </div>

      <div className="mt-4 theme-text-secondary">
        Card {activeCardIndex + 1} of {currentSet.cards.length}
      </div>

      {uploadError && (
        <div className="mt-4 text-red-500 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30">
          {uploadError}
        </div>
      )}
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
