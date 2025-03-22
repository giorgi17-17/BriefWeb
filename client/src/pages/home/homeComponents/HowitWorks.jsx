import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { background, text } from "../../../utils/themeUtils";

const HowitWorks = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { t } = useTranslation();

  useEffect(() => {
    // Function to update window width
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Determine margin class based on window width
  const marginClass = windowWidth < 1000 ? "mb-0" : "mb-10";

  return (
    <div id="how-it-works" className={`py-20 ${background("primary")}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className={`text-5xl font-bold text-center mb-4 ${text("primary")}`}
        >
          {t("landing.howItWorks.title")}
        </h2>
        <p
          className={`text-center mb-16 max-w-2xl mx-auto ${text("tertiary")}`}
        >
          {t("landing.howItWorks.subtitle")}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Your Notes - Left Column (8) */}
          <div className={`lg:col-span-8 mt-10 ${marginClass}`}>
            <div className="bg-purple-100 p-10 rounded-[20px] h-full flex flex-col relative overflow-hidden">
              <div className="mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-600"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t("landing.howItWorks.upload.title")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("landing.howItWorks.upload.description")}
              </p>
              <div className="mt-auto pt-12 flex justify-center"></div>
            </div>
          </div>

          {/* Right Column (4) - AI Processing and Start Learning */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* AI Processing */}
            <div className="bg-blue-100 p-10 rounded-[20px] flex flex-col relative overflow-hidden">
              <div className="mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t("landing.howItWorks.process.title")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("landing.howItWorks.process.description")}
              </p>
            </div>

            {/* Start Learning */}
            <div className="bg-green-100 p-10 rounded-[20px] flex flex-col relative overflow-hidden">
              <div className="mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t("landing.howItWorks.learn.title")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("landing.howItWorks.learn.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowitWorks;
