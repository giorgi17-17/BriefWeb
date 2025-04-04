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
  activeSetIndex: externalActiveSetIndex,
  setActiveSetIndex: setExternalActiveSetIndex,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [editingSetId, setEditingSetId] = useState(null);
  const [editingSetName, setEditingSetName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync with external active set index
  useEffect(() => {
    let isMounted = true;

    if (
      externalActiveSetIndex !== undefined &&
      flashcardSets.length > 0 &&
      isMounted
    ) {
      if (
        externalActiveSetIndex >= 0 &&
        externalActiveSetIndex < flashcardSets.length
      ) {
        // Only update local state if external index is different
        if (activeSetIndex !== externalActiveSetIndex) {
          setActiveSetIndex(externalActiveSetIndex);
          setActiveCardIndex(0);
          setIsFlipped(false);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [externalActiveSetIndex, flashcardSets.length, activeSetIndex]);

  // Sync back to parent when internal index changes
  useEffect(() => {
    let isMounted = true;

    if (
      setExternalActiveSetIndex &&
      activeSetIndex !== externalActiveSetIndex &&
      isMounted
    ) {
      setExternalActiveSetIndex(activeSetIndex);
    }

    return () => {
      isMounted = false;
    };
  }, [activeSetIndex, externalActiveSetIndex, setExternalActiveSetIndex]);

  // Update local state when flashcards prop changes
  useEffect(() => {
    let isMounted = true;

    if (flashcards && Array.isArray(flashcards) && isMounted) {
      console.log("FlashcardComponent received flashcards:", flashcards);

      // Log the structure of the first flashcard set if available
      if (flashcards.length > 0) {
        const firstSet = flashcards[0];
        console.log("First flashcard set structure:", {
          id: firstSet.id,
          name: firstSet.name,
          isUploaded: firstSet.isUploaded,
          cardsCount: firstSet.cards?.length || 0,
        });

        // Log first card if available
        if (firstSet.cards && firstSet.cards.length > 0) {
          console.log("First card sample:", {
            question: firstSet.cards[0].question?.substring(0, 50),
            answer: firstSet.cards[0].answer?.substring(0, 50),
          });
        }
      }

      // Include both uploaded and pending sets - we need to see pending sets too
      setFlashcardSets(flashcards);
      console.log(
        `Setting all ${flashcards.length} flashcard sets, including pending ones`
      );

      // Reset active index if needed
      if (
        activeSetIndex >= flashcards.length &&
        flashcards.length > 0 &&
        isMounted
      ) {
        setActiveSetIndex(0);
        setActiveCardIndex(0);
        setIsFlipped(false);
      }

      console.log("Flashcard sets updated:", flashcards);
    }

    return () => {
      isMounted = false;
    };
  }, [flashcards, activeSetIndex]);

  // Process and upload new flashcards
  useEffect(() => {
    let isMounted = true;

    const processSet = async (setToProcess) => {
      if (
        !setToProcess ||
        setToProcess.isUploaded ||
        !setToProcess.cards?.length ||
        !isMounted
      ) {
        return;
      }

      console.log(`Processing set: ${setToProcess.id} (${setToProcess.name})`);

      try {
        // Create the flashcard set in the database
        const { data: flashcardSet, error: setError } = await supabase
          .from("flashcard_sets")
          .insert({
            lecture_id: lectureId,
            name: setToProcess.name || "New Flashcard Set",
          })
          .select()
          .single();

        if (setError) throw setError;
        if (!isMounted) return;

        console.log(`Created flashcard set with ID: ${flashcardSet.id}`);

        // Insert flashcards in batches
        const batchSize = 25;
        const cardBatches = [];

        for (let i = 0; i < setToProcess.cards.length; i += batchSize) {
          cardBatches.push(
            setToProcess.cards.slice(i, i + batchSize).map((card) => ({
              flashcard_set_id: flashcardSet.id,
              question: card.question,
              answer: card.answer,
            }))
          );
        }

        for (let i = 0; i < cardBatches.length; i++) {
          if (!isMounted) return;

          const { error: batchError } = await supabase
            .from("flashcards")
            .insert(cardBatches[i]);

          if (batchError) throw batchError;
          console.log(`Uploaded batch ${i + 1}/${cardBatches.length}`);
        }

        // Get the complete set with cards
        const { data: completeSet, error: fetchError } = await supabase
          .from("flashcard_sets")
          .select(`*, flashcards(*)`)
          .eq("id", flashcardSet.id)
          .single();

        if (fetchError) throw fetchError;
        if (!isMounted) return;

        // Create a structured set object
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

        console.log(
          `Successfully processed set: ${processedSet.id} with ${processedSet.cards.length} cards`
        );

        if (isMounted) {
          // Add to local state first
          setFlashcardSets((prev) => {
            if (prev.some((set) => set.id === processedSet.id)) return prev;
            return [...prev, processedSet];
          });

          // Notify parent without automatic selection logic
          if (onFlashcardsUploaded) {
            console.log(`Notifying parent about new set: ${processedSet.id}`);
            onFlashcardsUploaded(processedSet);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error(`Error processing flashcards: ${error.message}`);
          setUploadError(`Failed to upload flashcards: ${error.message}`);
        }
      }
    };

    // Find any pending sets that need processing
    const pendingSets =
      flashcards?.filter((set) => !set.isUploaded && set.cards?.length > 0) ||
      [];

    if (pendingSets.length > 0 && lectureId && isMounted) {
      // Only process the first pending set
      processSet(pendingSets[0]);
    }

    return () => {
      isMounted = false;
    };
  }, [flashcards, lectureId, onFlashcardsUploaded]);

  // Simplify handle set change - only update indices without scrolling
  const handleSetChange = (index) => {
    // Update local state
    setActiveSetIndex(index);
    setActiveCardIndex(0);
    setIsFlipped(false);

    // Close dropdown
    setDropdownOpen(false);

    // Update external state if available
    if (setExternalActiveSetIndex) {
      setExternalActiveSetIndex(index);
    }
  };

  // Set deletion functions
  const initiateDelete = (setId, setName) => {
    setDeleteConfirmation({ id: setId, name: setName });
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      // Delete the set from the database
      const { error: deleteError } = await supabase
        .from("flashcard_sets")
        .delete()
        .eq("id", deleteConfirmation.id);

      if (deleteError) throw deleteError;

      // Update local state
      const updatedFlashcards = flashcardSets.filter(
        (set) => set.id !== deleteConfirmation.id
      );

      setFlashcardSets(updatedFlashcards);

      if (activeSetIndex >= updatedFlashcards.length) {
        setActiveSetIndex(Math.max(0, updatedFlashcards.length - 1));
      }

      // Notify parent if needed
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

  // Edit set name function
  const handleEditSetName = async (setId) => {
    if (!editingSetName.trim()) return;

    try {
      // Update the set name in the database
      const { error: updateError } = await supabase
        .from("flashcard_sets")
        .update({ name: editingSetName })
        .eq("id", setId);

      if (updateError) throw updateError;

      // Update local state
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

  // Show empty state if no sets
  if (!flashcardSets.length) {
    return (
      <div className="text-center theme-text-secondary">
        No flashcard sets available
      </div>
    );
  }

  // Get current set and card
  const currentSet = flashcardSets[activeSetIndex];
  const currentCard = currentSet?.cards[activeCardIndex];

  // Show empty state if no cards in current set
  if (!currentCard) {
    return (
      <div className="text-center theme-text-secondary">
        No cards in current set
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
      {/* Set deletion confirmation */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a22] rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 theme-text-primary">
              Delete &quot;{deleteConfirmation.name}&quot;?
            </h3>
            <p className="mb-6 theme-text-secondary">
              This will permanently delete this flashcard set and all its cards.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 theme-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={confirmDelete}
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
              {currentSet.isUploaded === false && (
                <span className="inline-block mr-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  Pending
                </span>
              )}
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
            <div className="mt-1 border theme-border rounded-lg divide-y theme-divide overflow-y-auto max-h-60">
              {flashcardSets.map((set, index) => (
                <div
                  key={set.id}
                  className={`flex items-center justify-between p-3 cursor-pointer ${
                    activeSetIndex === index
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : "hover:bg-[#f5f7ff] dark:hover:bg-[#2a2a3a]"
                  }`}
                  onClick={() => handleSetChange(index)}
                >
                  <div className="flex items-center">
                    {/* Show edit interface or set name */}
                    {editingSetId === set.id ? (
                      <input
                        type="text"
                        value={editingSetName}
                        onChange={(e) => setEditingSetName(e.target.value)}
                        className="px-2 py-1 theme-border rounded text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEditSetName(set.id);
                          } else if (e.key === "Escape") {
                            setEditingSetId(null);
                            setEditingSetName("");
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center">
                        {set.isUploaded === false && (
                          <span className="inline-block mr-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            Pending
                          </span>
                        )}
                        <span className="theme-text-primary">{set.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Only show edit/delete buttons for uploaded sets */}
                  {set.isUploaded !== false && (
                    <div
                      className="flex space-x-2 opacity-50 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Edit Button */}
                      {editingSetId === set.id ? (
                        <button
                          className="text-blue-600 dark:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          onClick={() => handleEditSetName(set.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="p-1 rounded hover:bg-[#f5f7ff] dark:hover:bg-[#2a2a3a]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSetId(set.id);
                            setEditingSetName(set.name);
                          }}
                          title="Edit set name"
                        >
                          <FiEdit2 className="w-4 h-4 theme-text-primary" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        className="p-1 rounded hover:bg-[#f5f7ff] dark:hover:bg-[#2a2a3a]"
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateDelete(set.id, set.name);
                        }}
                        title="Delete set"
                      >
                        <FiTrash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Display */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">
        <div
          className={`relative w-full h-auto aspect-[4/3] min-h-[24rem] flashcard-display ${
            isFlipped ? "is-flipped" : ""
          }`}
        >
          {/* Show pending notice for un-uploaded sets */}
          {currentSet.isUploaded === false && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-blue-500 text-white text-center text-sm py-1 rounded-t-lg">
              Pending Upload - Click cards to review
            </div>
          )}

          <div
            className="w-full h-full transition-transform duration-700 preserve-3d"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Question Side */}
            <div
              className="absolute inset-0 w-full h-full bg-white dark:bg-[#1a1a22] rounded-xl shadow-xl flex flex-col p-3 theme-border overflow-hidden backface-hidden"
              onClick={() => setIsFlipped(true)}
            >
              <div className="absolute top-2 right-3 text-xs text-gray-500 dark:text-gray-400">
                Question
              </div>
              <div className="flex items-center justify-center flex-grow p-2">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="max-h-[22rem] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <h3 className="text-xl font-semibold theme-text-primary text-center">
                      {currentCard.question}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="text-center p-2 text-sm text-blue-600 dark:text-blue-400">
                Click to see answer
              </div>
            </div>

            {/* Answer Side */}
            <div
              className="absolute inset-0 w-full h-full bg-white dark:bg-[#1a1a22] rounded-xl shadow-xl flex flex-col p-3 theme-border overflow-hidden backface-hidden"
              style={{ transform: "rotateY(180deg)" }}
              onClick={() => setIsFlipped(false)}
            >
              <div className="absolute top-2 right-3 text-xs text-gray-500 dark:text-gray-400">
                Answer
              </div>
              <div className="flex items-center justify-center flex-grow p-2">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="max-h-[22rem] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <p className="text-base theme-text-primary whitespace-pre-line">
                      {currentCard.answer}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center p-2 text-sm text-blue-600 dark:text-blue-400">
                Click to see question
              </div>
            </div>
          </div>
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
        {currentSet.isUploaded === false && " (Pending Upload)"}
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
      isUploaded: PropTypes.bool,
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
  activeSetIndex: PropTypes.number,
  setActiveSetIndex: PropTypes.func,
};

export default FlashcardComponent;
