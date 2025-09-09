import PropTypes from "prop-types";
import { FileSelector } from "../../components/FileSelector";
import { useTranslation } from "react-i18next";

import { BookOpen, FileText, HelpCircle, FolderOpen } from "lucide-react";
import MobileTabBar from "../../components/Header/MobileTabBar";

const MobileTabsBar = ({
  activeTab,
  setActiveTab,
  isGenerating,
  labels,
}) => {
  const items = [
    { key: "flashcards", label: labels.flashcards, icon: BookOpen },
    { key: "briefs", label: labels.briefs, icon: FileText },
    { key: "quiz", label: labels.quiz, icon: HelpCircle },
    { key: "files", label: labels.files, icon: FolderOpen },
  ];

  const isActive = (label) => activeTab === label;

  return (
    <nav
      className="
        md:hidden
        fixed left-1/2 -translate-x-1/2
        bottom-[calc(12px+env(safe-area-inset-bottom,0))]
        w-[min(720px,calc(100%-16px))]
        rounded-3xl
        bg-[#0E1726]/95 dark:bg-[#0B1220]/95
        border border-white/10
        backdrop-blur
        px-4 py-2
        z-[60]
      "
      aria-label="Bottom navigation"
      role="tablist"
    >
      <div className="flex items-center justify-between">
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={isActive(label)}
            disabled={isGenerating}
            onClick={() => !isGenerating && setActiveTab(label)}
            className="flex flex-col items-center gap-1 px-2 py-1 min-w-16"
          >
            <Icon
              size={22}
              className={
                isActive(label)
                  ? "text-emerald-400"
                  : "text-zinc-400"
              }
            />
            <span
              className={`text-[11px] ${isActive(label) ? "text-emerald-400" : "text-zinc-400"
                } ${isGenerating ? "opacity-60" : ""}`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* decorative handle like iOS */}
      <div className="pointer-events-none mt-2 flex justify-center">
        <div className="w-24 h-1.5 rounded-full bg-white/70 dark:bg-white/30" />
      </div>
    </nav>
  );
};

export const TabNavigation = ({
  activeTab,
  setActiveTab,
  files,
  selectedFile,
  onFileSelect,
  isGenerating,
}) => {
  const { t } = useTranslation();

  const menuItems = [
    { label: "flashcards", key: t("lectures.lectureDetails.tabs.flashcards"), icon: BookOpen, mode: "tab" },
    { label: "briefs", key: t("lectures.lectureDetails.tabs.briefs"), icon: FileText, mode: "tab" },
    { label: "quiz", key: t("lectures.lectureDetails.tabs.quiz"), icon: HelpCircle, mode: "tab" },
    { label: "files", key: t("lectures.lectureDetails.tabs.files"), icon: FolderOpen, mode: "tab" },
  ];

  // labels (unchanged)
  const flashcards = t("lectures.lectureDetails.tabs.flashcards");
  const briefs = t("lectures.lectureDetails.tabs.briefs");
  const quiz = t("lectures.lectureDetails.tabs.quiz");
  const filesTab = t("lectures.lectureDetails.tabs.files");

  const tabs = [flashcards, briefs, quiz];
  const baseTab = "px-3 py-1.5 text-[15px] font-medium rounded transition-colors";
  const inactiveHover = "hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a]";

  const tabClasses = (isActive) => {
    if (isGenerating) {
      return [
        baseTab,
        "cursor-not-allowed opacity-60",
        isActive
          ? "bg-blue-500 text-white"
          : "text-gray-500 dark:text-gray-400 bg-transparent",
      ].join(" ");
    }
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

  const isFilesActive = activeTab === filesTab;

  return (
    <>
      {/* DESKTOP/TABLET TOP NAV */}
      <div className="flex lg:flex-row items-center justify-end lg:justify-between theme-border-primary px-4 py-3">
        <nav className="hidden lg:flex  gap-2 flex-wrap bg-[#ebebeb] dark:bg-[#2a2a35] p-2 rounded-lg" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={isGenerating}
                className={tabClasses(isActive)}
                onClick={() => !isGenerating && setActiveTab(tab)}
              >
                {tab}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex mt-2 lg:mt-0 items-center gap-3">
          <button
            type="button"
            disabled={isGenerating}
            className={filesBtnClasses(isFilesActive)}
            onClick={() => !isGenerating && setActiveTab(filesTab)}
          >
            {filesTab}
          </button>

          {/* Desktop file selector stays here */}
          <div className={isGenerating ? "pointer-events-none opacity-60" : ""}>
            <FileSelector
              files={files}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        <div className={isGenerating ? "lg:hidden pointer-events-none opacity-60" : "lg:hidden"}>
          <FileSelector
            files={files}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        </div>
      </div>

      <MobileTabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isGenerating={isGenerating}
        items={menuItems}
        activeLocation={'/subjects'}
      />
    </>
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
