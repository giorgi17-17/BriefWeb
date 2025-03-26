import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { handleProcessQuiz } from "../../utils/api";
import { supabase } from "../../utils/supabaseClient";
import { useUserPlan } from "../../contexts/UserPlanContext";

const Quiz = ({ selectedFile, user, lectureId }) => {
  const { isPremium } = useUserPlan();
  const [quiz, setQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [noQuizExists, setNoQuizExists] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [quizOptions, setQuizOptions] = useState({
    includeMultipleChoice: true,
    includeOpenEnded: true,
    includeCaseStudies: true,
  });

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;

    // Cleanup when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (lectureId) {
      fetchQuiz();
    }
  }, [lectureId]);

  const fetchQuiz = async () => {
    try {
      if (!lectureId) return;

      // Don't set loading state if we're already generating
      if (!isGenerating) {
        setLoading(true);
      }

      // First, fetch the quiz set
      const { data: quizSet, error: quizSetError } = await supabase
        .from("quiz_sets")
        .select("*")
        .eq("lecture_id", lectureId)
        .single();

      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      if (quizSetError) {
        if (quizSetError.code === "PGRST116") {
          setNoQuizExists(true);
          setError(null);
          setQuiz(null);
          setQuizQuestions([]);
          return;
        }
        throw quizSetError;
      }

      if (!quizSet) {
        console.log("No quiz set found for lecture ID:", lectureId);
        setNoQuizExists(true);
        setQuiz(null);
        setQuizQuestions([]);
        return;
      }

      setQuiz(quizSet);
      setNoQuizExists(false);

      // Then, fetch all questions for this quiz set
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select(
          `
          *,
          options:quiz_options(*)
        `
        )
        .eq("quiz_set_id", quizSet.id)
        .order("created_at", { ascending: true });

      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      if (questionsError) throw questionsError;

      if (!questions || questions.length === 0) {
        console.log("No questions found for quiz set ID:", quizSet.id);
        setError("Quiz was generated but no questions were found");
        return;
      }

      // Process questions to clean up any markdown formatting
      const processedQuestions = questions.map((question) => {
        // Clean up question text - remove any markdown symbols
        const cleanText = question.question_text
          .replace(/\*\*/g, "") // Remove bold
          .replace(/\*/g, "") // Remove italics
          .replace(/__/g, "") // Remove double underscores
          .replace(/_/g, "") // Remove single underscores
          .replace(/###/g, "") // Remove heading markers
          .replace(/##/g, "")
          .replace(/#/g, "");

        // Clean up option text
        const cleanOptions = question.options.map((option) => ({
          ...option,
          option_text: option.option_text
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/__/g, "")
            .replace(/_/g, "")
            .replace(/###/g, "")
            .replace(/##/g, "")
            .replace(/#/g, ""),
        }));

        return {
          ...question,
          question_text: cleanText,
          options: cleanOptions,
        };
      });

      console.log(`Loaded ${processedQuestions.length} questions for quiz`);
      setQuizQuestions(processedQuestions);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setShowResults(false);
    } catch (err) {
      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      console.error("Error fetching quiz:", err);
      setError("Failed to load quiz");
      setQuizQuestions([]);
    } finally {
      // Only update states if component is still mounted
      if (isMounted.current) {
        setLoading(false);
        setIsGenerating(false);
      }
    }
  };

  const handleOptionChange = (option, value) => {
    setQuizOptions((prev) => ({
      ...prev,
      [option]: value,
    }));
  };

  const toggleOptionsPanel = () => {
    setShowOptions((prev) => !prev);
  };

  const generateQuiz = async () => {
    if (!selectedFile?.id) {
      setError("No file selected");
      return;
    }

    // Validate options - at least one question type must be selected
    if (
      !quizOptions.includeMultipleChoice &&
      !quizOptions.includeOpenEnded &&
      !quizOptions.includeCaseStudies
    ) {
      setError("Please select at least one question type");
      return;
    }

    try {
      setLoading(true);
      setIsGenerating(true);
      setError(null);
      const filePath = selectedFile.path.split("/").pop();

      // Wait for quiz generation to complete
      await handleProcessQuiz(user.id, lectureId, filePath, quizOptions);

      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      // Add a small delay to ensure database records are committed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      // Now fetch the quiz data
      await fetchQuiz();

      // Hide options panel after successful generation
      setShowOptions(false);
    } catch (err) {
      // If component unmounted during API call, exit early
      if (!isMounted.current) return;

      console.error("Error generating quiz:", err);
      setError("Failed to generate quiz");
      setNoQuizExists(true); // Reset this flag if there's an error
    } finally {
      // Only update states if component is still mounted
      if (isMounted.current) {
        setLoading(false);
        setIsGenerating(false);
      }
    }
  };

  const handleSelectAnswer = (questionId, optionId) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleOpenEndedAnswer = (questionId, text) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);

      // Calculate results for multiple choice questions
      const results = quizQuestions.map((question) => {
        const userAnswer = userAnswers[question.id];

        if (question.question_type === "multiple_choice") {
          const correctOption = question.options.find((opt) => opt.is_correct);
          const isCorrect = userAnswer === correctOption?.id;

          return {
            questionId: question.id,
            isCorrect,
            userAnswer,
            correctAnswer: correctOption?.id,
          };
        } else {
          // For open-ended and case study questions, we don't automatically grade
          return {
            questionId: question.id,
            isCorrect: null,
            userAnswer,
            correctAnswer: question.options.find((opt) => opt.is_correct)
              ?.option_text,
          };
        }
      });

      // Save answers to the database
      for (const result of results) {
        if (result.userAnswer) {
          await supabase.from("quiz_answers").insert({
            user_id: user.id,
            question_id: result.questionId,
            selected_option_id:
              typeof result.userAnswer === "string" &&
              result.userAnswer.length > 36
                ? null
                : result.userAnswer,
            open_ended_answer:
              typeof result.userAnswer === "string" &&
              result.userAnswer.length > 36
                ? result.userAnswer
                : null,
            is_correct: result.isCorrect,
          });
        }
      }

      setShowResults(true);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const navigateQuestion = (direction) => {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < quizQuestions.length) {
      setCurrentQuestionIndex(newIndex);
    }
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2 text-red-700 dark:text-red-300">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Function to determine what type of question component to render
  const renderQuestionByType = (question) => {
    // Handle different case study difficulty levels
    const isCaseStudy = question?.question_type?.startsWith("case_study");

    switch (isCaseStudy ? "case_study" : question?.question_type) {
      case "multiple_choice":
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`border dark:border-gray-700 rounded-md p-3 cursor-pointer transition ${
                  userAnswers[question.id] === option.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => handleSelectAnswer(question.id, option.id)}
              >
                <span className="text-gray-800 dark:text-gray-200">
                  {option.option_text}
                </span>
              </div>
            ))}
          </div>
        );

      case "open_ended":
        return (
          <div>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 min-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="Type your answer here..."
              value={userAnswers[question?.id] || ""}
              onChange={(e) =>
                handleOpenEndedAnswer(question.id, e.target.value)
              }
            />
          </div>
        );

      case "case_study": {
        // Extract text box height from question type if needed
        const textBoxHeight = question?.question_type?.includes("advanced")
          ? "min-h-64"
          : "min-h-48";

        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              {/* Format the case study text */}
              {question.question_text.split("\n\n").map((paragraph, idx) => (
                <p
                  key={idx}
                  className={`mb-2 ${
                    idx === 0 ? "font-semibold" : ""
                  } dark:text-gray-200`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <textarea
              className={`w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 ${textBoxHeight} focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200`}
              placeholder="Enter your detailed analysis here..."
              value={userAnswers[question?.id] || ""}
              onChange={(e) =>
                handleOpenEndedAnswer(question.id, e.target.value)
              }
            />
          </div>
        );
      }

      default:
        return <div className="dark:text-gray-200">Unknown question type</div>;
    }
  };

  // Function to render result content by question type
  const renderResultByType = (question) => {
    // Handle different case study difficulty levels
    const isCaseStudy = question?.question_type?.startsWith("case_study");

    switch (isCaseStudy ? "case_study" : question.question_type) {
      case "multiple_choice":
        return (
          <div className="space-y-2">
            {question.options.map((option) => {
              const isSelected = userAnswers[question.id] === option.id;
              const isCorrect = option.is_correct;

              let bgColor = "bg-white dark:bg-gray-800";
              if (isSelected && isCorrect)
                bgColor = "bg-green-50 dark:bg-green-900/30";
              else if (isSelected && !isCorrect)
                bgColor = "bg-red-50 dark:bg-red-900/30";
              else if (!isSelected && isCorrect)
                bgColor = "bg-green-50 dark:bg-green-900/30";

              return (
                <div
                  key={option.id}
                  className={`${bgColor} border dark:border-gray-700 rounded-md p-3 flex justify-between items-center`}
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {option.option_text}
                  </span>
                  {isSelected && !isCorrect && (
                    <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                  )}
                  {isCorrect && (
                    <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                  )}
                </div>
              );
            })}
          </div>
        );

      case "open_ended":
        return (
          <div className="space-y-3">
            <div className="border dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
              <p className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">
                Your Answer:
              </p>
              <p className="dark:text-gray-200">
                {userAnswers[question.id] || "No answer provided"}
              </p>
            </div>
            <div className="border dark:border-gray-700 rounded-md p-3 bg-blue-50 dark:bg-blue-900/30">
              <p className="font-medium text-sm text-blue-500 dark:text-blue-300 mb-1">
                Sample Answer:
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                {question.options.find((opt) => opt.is_correct)?.option_text}
              </p>
            </div>
          </div>
        );

      case "case_study": {
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              {/* Format the case study text */}
              {question.question_text.split("\n\n").map((paragraph, idx) => (
                <p
                  key={idx}
                  className={`mb-2 ${
                    idx === 0 ? "font-semibold" : ""
                  } dark:text-gray-200`}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="space-y-3">
              <div className="border dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                <p className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Your Analysis:
                </p>
                <p className="dark:text-gray-200">
                  {userAnswers[question.id] || "No analysis provided"}
                </p>
              </div>
              <div className="border dark:border-gray-700 rounded-md p-3 bg-blue-50 dark:bg-blue-900/30">
                <p className="font-medium text-sm text-blue-500 dark:text-blue-300 mb-1">
                  Sample Analysis:
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  {question.options.find((opt) => opt.is_correct)?.option_text}
                </p>
              </div>
            </div>
          </div>
        );
      }

      default:
        return <div className="dark:text-gray-200">Unknown question type</div>;
    }
  };

  const calculateScore = () => {
    if (!quizQuestions.length) return { score: 0, total: 0 };

    let correctCount = 0;
    let totalMultipleChoice = 0;
    let openEndedCount = 0;
    let caseStudyModerateCount = 0;
    let caseStudyAdvancedCount = 0;

    quizQuestions.forEach((question) => {
      if (question.question_type === "multiple_choice") {
        totalMultipleChoice++;
        const correctOption = question.options.find((opt) => opt.is_correct);
        if (userAnswers[question.id] === correctOption?.id) {
          correctCount++;
        }
      } else if (question.question_type === "open_ended") {
        openEndedCount++;
      } else if (question.question_type === "case_study_moderate") {
        caseStudyModerateCount++;
      } else if (question.question_type === "case_study_advanced") {
        caseStudyAdvancedCount++;
      }
    });

    return {
      score: correctCount,
      total: totalMultipleChoice,
      openEndedCount,
      caseStudyModerateCount,
      caseStudyAdvancedCount,
    };
  };

  const renderOptionsPanel = () => {
    return (
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 border rounded-lg mt-3 mb-6 dark:border-gray-600">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">
          Quiz Options
        </h3>

        <div className="space-y-3">
          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizOptions.includeMultipleChoice}
                onChange={(e) =>
                  handleOptionChange("includeMultipleChoice", e.target.checked)
                }
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
              />
              <span className="dark:text-gray-200">
                Multiple Choice Questions (10 questions)
              </span>
            </label>
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizOptions.includeOpenEnded}
                onChange={(e) =>
                  handleOptionChange("includeOpenEnded", e.target.checked)
                }
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
              />
              <span className="dark:text-gray-200">
                Open-Ended Questions (3 questions)
              </span>
            </label>
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={quizOptions.includeCaseStudies}
                onChange={(e) =>
                  handleOptionChange("includeCaseStudies", e.target.checked)
                }
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
              />
              <span className="dark:text-gray-200">
                Case Studies (1 moderate, 1 advanced)
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end space-x-2">
          <button
            onClick={toggleOptionsPanel}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={generateQuiz}
            disabled={
              loading ||
              !selectedFile ||
              (!quizOptions.includeMultipleChoice &&
                !quizOptions.includeOpenEnded &&
                !quizOptions.includeCaseStudies)
            }
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
              ${
                loading ||
                !selectedFile ||
                (!quizOptions.includeMultipleChoice &&
                  !quizOptions.includeOpenEnded &&
                  !quizOptions.includeCaseStudies)
                  ? "bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Generate Quiz
          </button>
        </div>
      </div>
    );
  };

  const shouldShowGenerateButton = () => {
    // Always show when no quiz exists yet
    if (noQuizExists || !quiz) return true;
    // For existing quizzes, only show regenerate for premium users
    return isPremium;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Quiz
          </h2>
          {!showOptions ? (
            <div className="flex space-x-2">
              <button
                onClick={toggleOptionsPanel}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Settings className="h-4 w-4 mr-1" />
                Options
              </button>

              {shouldShowGenerateButton() && (
                <button
                  onClick={generateQuiz}
                  disabled={loading || !selectedFile}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
                    ${
                      loading || !selectedFile
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  {quiz ? "Regenerate" : "Generate"} Quiz
                </button>
              )}
            </div>
          ) : null}
        </div>

        {showOptions && renderOptionsPanel()}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-300">
              {isGenerating ? "Generating quiz..." : "Loading quiz..."}
            </span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-300 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : showOptions ? (
          renderOptionsPanel()
        ) : quizQuestions.length > 0 ? (
          showResults ? (
            <div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                Quiz Results: {calculateScore().score} /{" "}
                {calculateScore().total} Correct
              </h3>

              <div className="space-y-6 mb-6">
                {quizQuestions.map((question) => renderResultByType(question))}
              </div>

              <div className="flex justify-center mt-4">
                <button
                  onClick={resetQuiz}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                >
                  Retake Quiz
                </button>

                {isPremium && (
                  <button
                    onClick={() => {
                      setShowOptions(true);
                    }}
                    className="ml-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md"
                  >
                    Generate New Quiz
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </div>

              <div className="space-y-4">
                {!currentQuestion?.question_type.startsWith("case_study") && (
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {currentQuestion?.question_text}
                  </h3>
                )}

                {renderQuestionByType(currentQuestion)}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => navigateQuestion(-1)}
                  disabled={currentQuestionIndex === 0}
                  className={`flex items-center px-3 py-2 rounded-md ${
                    currentQuestionIndex === 0
                      ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>

                {currentQuestionIndex < quizQuestions.length - 1 ? (
                  <button
                    onClick={() => navigateQuestion(1)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <>
                        Submit Quiz
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        ) : noQuizExists ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="space-y-4">
              <p>No quiz has been generated for this document yet.</p>
              {!showOptions && (
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={toggleOptionsPanel}
                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium
                      bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </button>
                  <button
                    onClick={generateQuiz}
                    disabled={loading || !selectedFile}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                      ${
                        loading || !selectedFile
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    Generate Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Something went wrong. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

Quiz.propTypes = {
  selectedFile: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    path: PropTypes.string,
  }),
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Quiz;
