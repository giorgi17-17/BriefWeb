import PropTypes from "prop-types";
import FlashcardComponent from "./FlashcardComponent";
import { useTranslation } from "react-i18next";

const FlashcardsTab = ({
  files,
  selectedFile,
  isGenerating,
  handleGenerateFlashcards,
  flashcards,
  lectureId,
  activeFlashcardSetIndex,
  setActiveFlashcardSetIndex,
  onFlashcardsUploaded,
  onFlashcardsModified,
  isMounted,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {files.length > 0 ? (
        <>
         <div className="flex justify-end items-center gap-4">
  <button
    onClick={handleGenerateFlashcards}
    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
      isGenerating
        ? "bg-blue-600/50 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    } text-white transition-colors`}
    disabled={isGenerating}
  >
    {isGenerating
      ? t("lectures.lectureDetails.flashcards.generating")
      : t("lectures.lectureDetails.flashcards.generate")}
  </button>
</div>


          <FlashcardComponent
            flashcards={flashcards}
            lectureId={lectureId}
            fileName={selectedFile?.name}
            activeSetIndex={activeFlashcardSetIndex}
            setActiveSetIndex={setActiveFlashcardSetIndex}
            onFlashcardsUploaded={(updatedSet) => {
              if (!isMounted.current) return;

              console.log(
                t("lectures.lectureDetails.flashcardsUploaded"),
                updatedSet.id
              );
              onFlashcardsUploaded(updatedSet);
            }}
            onFlashcardsModified={onFlashcardsModified}
          />
        </>
      ) : (
        <div className="text-center theme-text-secondary py-8">
          {t("lectures.lectureDetails.flashcards.uploadFirst")}
        </div>
      )}
    </div>
  );
};

FlashcardsTab.propTypes = {
  files: PropTypes.array.isRequired,
  selectedFile: PropTypes.object,
  isGenerating: PropTypes.bool.isRequired,
  handleGenerateFlashcards: PropTypes.func.isRequired,
  flashcards: PropTypes.array.isRequired,
  lectureId: PropTypes.string.isRequired,
  activeFlashcardSetIndex: PropTypes.number.isRequired,
  setActiveFlashcardSetIndex: PropTypes.func.isRequired,
  onFlashcardsUploaded: PropTypes.func.isRequired,
  onFlashcardsModified: PropTypes.func.isRequired,
  isMounted: PropTypes.object.isRequired,
};

export default FlashcardsTab;
