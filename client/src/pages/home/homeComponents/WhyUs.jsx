const WhyUs = () => {
  return (
    <div className="py-20 theme-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-wider mb-2 theme-text-tertiary">
            THE BRIEF ADVANTAGE
          </p>
          <h2 className="text-3xl font-bold theme-text-primary">
            Why Students Are Obsessed
          </h2>
          <p className="mt-4 max-w-2xl mx-auto theme-text-tertiary">
            Created by students who understand the struggle, for students who
            deserve better.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-16 mt-16">
          {/* Save Massive Time */}
          <div className="flex flex-col items-start">
            <div className="flex mb-5">
              <div className="rounded-full w-12 h-12 flex items-center justify-center theme-bg-tertiary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="theme-text-secondary"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 theme-text-primary">
              Save Massive Time
            </h3>
            <p className="text-sm theme-text-tertiary">
              Our AI-powered system transforms lengthy notes into concise,
              memorable study materials within minutes, freeing you to focus
              where it matters most.
            </p>
          </div>

          {/* Level Up Your Grades */}
          <div className="flex flex-col items-start">
            <div className="flex mb-5">
              <div className="rounded-full w-12 h-12 flex items-center justify-center theme-bg-tertiary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="theme-text-secondary"
                >
                  <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z"></path>
                  <path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z"></path>
                  <line x1="12" y1="22" x2="12" y2="13"></line>
                  <path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 theme-text-primary">
              Level Up Your Grades
            </h3>
            <p className="text-sm theme-text-tertiary">
              Our organized study materials help boost retention and
              understanding, leading to improved exam performance and higher
              overall grades.
            </p>
          </div>

          {/* Study Smarter, Not Harder */}
          <div className="flex flex-col items-start">
            <div className="flex mb-5">
              <div className="rounded-full w-12 h-12 flex items-center justify-center theme-bg-tertiary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="theme-text-secondary"
                >
                  <path d="M15.5 9.5 12 12l-5.5 4 1.5 3h10l1.5-3-4-6.5"></path>
                  <path d="M20.5 16a2.5 2.5 0 0 1-5 0"></path>
                  <path d="M14.5 8.5c-.6-1.1-1.5-2-2.5-2.5"></path>
                  <path d="M8.5 8.5c.6-1.1 1.5-2 2.5-2.5"></path>
                  <path d="M6 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2 1.1 0 2-.9 2-2a2 2 0 0 0-2-2z"></path>
                  <path d="M18 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2 1.1 0 2-.9 2-2a2 2 0 0 0-2-2z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 theme-text-primary">
              Study Smarter, Not Harder
            </h3>
            <p className="text-sm theme-text-tertiary">
              Our intelligent tools help you focus on what you need to learn,
              maximizing study efficiency and helping you master complex topics.
            </p>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-sm theme-text-tertiary">
            Join 10,000+ students already crushing their studies
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhyUs;
