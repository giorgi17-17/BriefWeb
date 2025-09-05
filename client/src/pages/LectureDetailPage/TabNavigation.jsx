import PropTypes from "prop-types";
import { FileSelector } from "../../components/FileSelector";
import { useTranslation } from "react-i18next";

const TabNavigation = ({
  activeTab,
  setActiveTab,
  files,
  selectedFile,
  onFileSelect,
  isGenerating,
}) => {
  const { t } = useTranslation();

  // tabs
  const tabs = [
    t("lectures.lectureDetails.tabs.flashcards"),
    t("lectures.lectureDetails.tabs.briefs"),
    t("lectures.lectureDetails.tabs.quiz"),
  ];

  // helpers for classes
  const baseTab =
    "px-3 py-1.5 text-[15px] font-medium rounded transition-colors";
  const inactiveHover = "hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a]";

  const tabClasses = (isActive) => {
    if (isGenerating) {
      // disabled look (keeps your gray backgrounds)
      return [
        baseTab,
        "cursor-not-allowed opacity-60",
        isActive
          ? "bg-blue-500 text-white" // slightly softer than 600 when disabled
          : "text-gray-500 dark:text-gray-400 bg-transparent",
      ].join(" ");
    }
    // enabled look
    return [
      baseTab,
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : `theme-text-secondary ${inactiveHover}`,
    ].join(" ");
  };

  const filesBtnClasses = (isActive) => {
    if (isGenerating) {
      return [
        "px-3 py-2 text-[15px] font-medium rounded transition-colors border",
        "cursor-not-allowed opacity-60",
        isActive
          ? "bg-blue-500 text-white border-blue-400"
          : "text-gray-500 dark:text-gray-400 theme-border-primary",
      ].join(" ");
    }
    return [
      "px-3 py-2 text-[15px] font-medium rounded transition-colors border",
      isActive
        ? "bg-blue-600 text-white shadow-sm border-blue-500"
        : `theme-text-secondary ${inactiveHover} theme-border-primary`,
    ].join(" ");
  };

  const filesTabLabel = t("lectures.lectureDetails.tabs.files");
  const isFilesActive = activeTab === filesTabLabel;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between theme-border-primary px-4 py-3">
      <nav className="flex gap-2 flex-wrap bg-[#ebebeb] dark:bg-[#2a2a35] p-2 rounded-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              disabled={isGenerating}
              className={tabClasses(isActive)}
              onClick={() => !isGenerating && setActiveTab(tab)}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 lg:mt-0 flex items-center gap-3">
        <button
          type="button"
          disabled={isGenerating}
          className={filesBtnClasses(isFilesActive)}
          onClick={() => !isGenerating && setActiveTab(filesTabLabel)}
        >
          {filesTabLabel}
        </button>

        {/* When generating, block interactions with FileSelector and dim it */}
        <div className={isGenerating ? "pointer-events-none opacity-60" : ""}>
          <FileSelector
            files={files}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        </div>
      </div>
    </div>
  );
};

TabNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  files: PropTypes.array.isRequired,
  selectedFile: PropTypes.object,
  onFileSelect: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool, // ✅ add this
};

export default TabNavigation;
