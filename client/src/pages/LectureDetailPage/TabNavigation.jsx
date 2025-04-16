import PropTypes from "prop-types";
import { FileSelector } from "../../components/FileSelector";
import { useTranslation } from "react-i18next";

const TabNavigation = ({
  activeTab,
  setActiveTab,
  files,
  selectedFile,
  onFileSelect,
}) => {
  const { t } = useTranslation();

  // Array of tab names using translation keys
  const tabs = [
    t("lectures.lectureDetails.tabs.flashcards"),
    t("lectures.lectureDetails.tabs.briefs"),
    t("lectures.lectureDetails.tabs.quiz"),
  ];

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between theme-border-primary px-4 py-3">
      <nav className="flex gap-2 flex-wrap bg-[#ebebeb] dark:bg-[#2a2a35] p-2 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-3 py-1.5 text-[15px] font-medium rounded transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-sm"
                : "theme-text-secondary hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="mt-2 lg:mt-0 flex items-center gap-3">
        <button
          className={`px-3 py-2 text-[15px] font-medium rounded transition-colors border ${
            activeTab === t("lectures.lectureDetails.tabs.files")
              ? "bg-blue-600 text-white shadow-sm border-blue-500"
              : "theme-text-secondary hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a] theme-border-primary"
          }`}
          onClick={() => setActiveTab(t("lectures.lectureDetails.tabs.files"))}
        >
          {t("lectures.lectureDetails.tabs.files")}
        </button>
        <FileSelector
          files={files}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
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
};

export default TabNavigation;
