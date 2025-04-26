import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessQuiz, evaluateAnswer } from "../utils/api";
import { usePostHog } from "posthog-js/react";

export function useQuiz(lectureId, user) {
  const [quiz, setQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [aiEvaluations, setAiEvaluations] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [noQuizExists, setNoQuizExists] = useState(false);
  const [quizOptions, setQuizOptions] = useState({
    includeMultipleChoice: true,
    includeOpenEnded: true,
    includeCaseStudies: true,
  });
  // Quiz history state
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryQuiz, setSelectedHistoryQuiz] = useState(null);
  const [viewingHistoricalQuiz, setViewingHistoricalQuiz] = useState(false);

  // Track if component is mounted
  const isMounted = useRef(true);

  const posthog = usePostHog();

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;

    if (lectureId) {
      fetchQuiz();
    }

    // Cleanup when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, [lectureId]);

  // Load quiz history when user is available
  useEffect(() => {
    if (user?.id) {
      fetchQuizHistory();
    }
  }, [user?.id]);

  // Fetch quiz history for the current user
  const fetchQuizHistory = async () => {
    if (!user?.id) return;

    try {
      setLoadingHistory(true);
      const { data, error: fetchError } = await supabase
        .from("quiz_submissions")
        .select(
          `
          id,
          quiz_set_id,
          lecture_id,
          score,
          completed_at,
          quiz_sets(id, name)
        `
        )
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get unique lecture IDs for a separate query
      const lectureIds = [...new Set(data?.map((s) => s.lecture_id) || [])];

      // Fetch lecture titles if there are any lecture IDs
      let lectureTitles = {};
      if (lectureIds.length > 0) {
        try {
          const { data: lecturesData, error: lecturesError } = await supabase
            .from("lectures")
            .select("id, title")
            .in("id", lectureIds);

          if (!lecturesError && lecturesData) {
            // Create a map of lecture ID to title
            lectureTitles = lecturesData.reduce((acc, lecture) => {
              acc[lecture.id] = lecture.title;
              return acc;
            }, {});
          }
        } catch (lectureErr) {
          console.warn("Could not fetch lecture titles:", lectureErr);
        }
      }

      // Format the data for display
      const formattedHistory =
        data?.map((submission) => ({
          id: submission.id,
          quizSetId: submission.quiz_set_id,
          lectureId: submission.lecture_id,
          score: submission.score,
          completedAt: new Date(submission.completed_at),
          quizTitle: submission.quiz_sets?.name || "Untitled Quiz",
          lectureTitle:
            lectureTitles[submission.lecture_id] ||
            `Lecture ${submission.lecture_id}`,
        })) || [];

      setQuizHistory(formattedHistory);
    } catch (err) {
      console.error("Error fetching quiz history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific historical quiz submission
  const loadHistoryQuiz = async (submissionId) => {
    try {
      if (!submissionId) return;

      setLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("User not authenticated");

      // Fetch the specific quiz submission
      const { data: submission, error: submissionError } = await supabase
        .from("quiz_submissions")
        .select(
          `
          id, 
          quiz_set_id, 
          user_id, 
          created_at, 
          score, 
          answers, 
          ai_evaluations,
          quiz_sets (
            id, 
            name, 
            lecture_id, 
            created_at
          )
        `
        )
        .eq("id", submissionId)
        .eq("user_id", user.user.id)
        .single();

      if (submissionError) {
        console.error("Error fetching quiz submission:", submissionError);
        setError("Failed to load quiz submission");
        setLoading(false);
        return;
      }

      if (!submission) {
        console.log("No submission found with ID:", submissionId);
        setError("Quiz submission not found");
        setLoading(false);
        return;
      }

      console.log("Loaded quiz submission:", submission.id);

      // Create a quiz set object from the joined data or create a placeholder
      let quizSet = submission.quiz_sets || {
        id: submission.quiz_set_id,
        name: "Quiz Set (Details Missing)",
        lecture_id: null,
        created_at: submission.created_at,
      };

      // For backward compatibility
      if (quizSet.name && !quizSet.title) {
        quizSet.title = quizSet.name;
      }

      setQuiz(quizSet);

      // Fetch questions for this quiz set
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, quiz_set_id, question_text, question_type")
        .eq("quiz_set_id", submission.quiz_set_id)
        .order("created_at", { ascending: true });

      if (questionsError) {
        console.error("Error fetching quiz questions:", questionsError);
        setError("Could not load quiz questions: " + questionsError.message);
        setLoading(false);
        return;
      }

      if (!questions || questions.length === 0) {
        console.log(
          "No questions found for quiz set ID:",
          submission.quiz_set_id
        );
        setError("No questions found for this quiz");
        setLoading(false);
        return;
      }

      // Fetch options for all questions
      let questionsWithOptions = [...questions];

      try {
        const questionIds = questions.map((q) => q.id);
        const { data: options, error: optionsError } = await supabase
          .from("quiz_options")
          .select("id, question_id, option_text, is_correct")
          .in("question_id", questionIds);

        if (optionsError) {
          console.warn("Error fetching options:", optionsError);
        } else if (!options || options.length === 0) {
          console.warn("No options found for questions");
        } else {
          // Attach options to their respective questions
          questionsWithOptions = questions.map((question) => {
            const questionOptions = options.filter(
              (opt) => opt.question_id === question.id
            );
            return {
              ...question,
              options: questionOptions,
            };
          });
        }
      } catch (optErr) {
        console.warn("Error processing options:", optErr);
      }

      // Process questions to clean up any markdown formatting
      const processedQuestions = questionsWithOptions.map((question) => {
        // Clean up question text
        const cleanText = question.question_text
          .replace(/\*\*/g, "")
          .replace(/\*/g, "")
          .replace(/__/g, "")
          .replace(/_/g, "")
          .replace(/###/g, "")
          .replace(/##/g, "")
          .replace(/#/g, "");

        // Clean up option text if options exist
        const cleanOptions = question.options
          ? question.options.map((option) => ({
              ...option,
              option_text: option.option_text
                .replace(/\*\*/g, "")
                .replace(/\*/g, "")
                .replace(/__/g, "")
                .replace(/_/g, "")
                .replace(/###/g, "")
                .replace(/##/g, "")
                .replace(/#/g, ""),
            }))
          : [];

        return {
          ...question,
          question_text: cleanText,
          options: cleanOptions,
        };
      });

      console.log(
        `Loaded ${processedQuestions.length} questions for historical quiz`
      );

      // Set the questions
      setQuizQuestions(processedQuestions);

      // Set user answers from submission data
      setUserAnswers(submission.answers || {});

      // Set AI evaluations from submission data
      setAiEvaluations(submission.ai_evaluations || {});

      // Set viewing historical quiz
      setSelectedHistoryQuiz(submission);
      setViewingHistoricalQuiz(true);
      setShowResults(true);
      setCurrentQuestionIndex(0);
      setShowHistory(false);
    } catch (err) {
      console.error("Error loading historical quiz:", err);
      setError("Failed to load quiz: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Toggle between quiz and history view
  const toggleHistory = () => {
    setShowHistory(!showHistory);
    // If we're hiding history, reset the selected historical quiz
    if (showHistory && selectedHistoryQuiz) {
      setSelectedHistoryQuiz(null);
      setViewingHistoricalQuiz(false);
      // Only reset these if we're not already in a quiz
      if (noQuizExists) {
        setShowResults(false);
        setUserAnswers({});
        setAiEvaluations({});
      }
    }
  };

  // Exit from viewing a historical quiz
  const exitHistoryQuiz = () => {
    setSelectedHistoryQuiz(null);
    setViewingHistoricalQuiz(false);
    setShowResults(false);
    // Fetch the current quiz again to reset state
    fetchQuiz();
  };

  const fetchQuiz = async () => {
    try {
      if (!lectureId) return;

      // Don't set loading state if we're already generating
      if (!isGenerating) {
        setLoading(true);
      }

      // Reset any historical quiz viewing state
      setViewingHistoricalQuiz(false);
      setSelectedHistoryQuiz(null);

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
        .select("id, quiz_set_id, question_text, question_type, created_at")
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

      // Fetch options for these questions
      let questionsWithOptions = [...questions];
      if (questions.length > 0) {
        try {
          const questionIds = questions.map((q) => q.id);
          const { data: options, error: optionsError } = await supabase
            .from("quiz_options")
            .select("id, question_id, option_text, is_correct")
            .in("question_id", questionIds);

          if (!optionsError && options && options.length > 0) {
            // Attach options to their respective questions
            questionsWithOptions = questions.map((question) => {
              const questionOptions = options.filter(
                (opt) => opt.question_id === question.id
              );
              return {
                ...question,
                options: questionOptions,
              };
            });
          } else if (optionsError) {
            console.warn("Error fetching options:", optionsError);
          } else {
            console.warn("No options found for questions");
          }
        } catch (optErr) {
          console.warn("Error processing options:", optErr);
        }
      }

      // Process questions to clean up any markdown formatting
      const processedQuestions = questionsWithOptions.map((question) => {
        // Clean up question text - remove any markdown symbols
        const cleanText = question.question_text
          .replace(/\*\*/g, "") // Remove bold
          .replace(/\*/g, "") // Remove italics
          .replace(/__/g, "") // Remove double underscores
          .replace(/_/g, "") // Remove single underscores
          .replace(/###/g, "") // Remove heading markers
          .replace(/##/g, "")
          .replace(/#/g, "");

        // Clean up option text - only if options exist
        const cleanOptions = question.options
          ? question.options.map((option) => ({
              ...option,
              option_text: option.option_text
                .replace(/\*\*/g, "")
                .replace(/\*/g, "")
                .replace(/__/g, "")
                .replace(/_/g, "")
                .replace(/###/g, "")
                .replace(/##/g, "")
                .replace(/#/g, ""),
            }))
          : [];

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

  const generateQuiz = async (selectedFile) => {
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

      // Track quiz generation with minimal properties
      try {
        posthog.capture("quiz_generation", {
          lecture_id: lectureId,
          difficulty: quizOptions.difficulty,
        });
      } catch (error) {
        console.error("PostHog event error:", error);
      }
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
    if (quizQuestions.length === 0) return;

    try {
      setLoading(true);

      // First evaluate all open-ended and case study answers
      const evaluationsNeeded = quizQuestions.filter(
        (q) =>
          (q.question_type === "open_ended" ||
            q.question_type === "case_study" ||
            q.question_type === "case_study_moderate" ||
            q.question_type === "case_study_advanced") &&
          userAnswers[q.id]
      );

      if (evaluationsNeeded.length > 0) {
        // Show a notification that we're evaluating answers
        console.log(
          `Evaluating ${evaluationsNeeded.length} open-ended/case study answers...`
        );

        const evaluationResults = {};

        // Process questions in parallel with a limit of 3 concurrent requests
        const evaluateQuestions = async (questions) => {
          const batchSize = 3;
          for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (question) => {
                try {
                  // Get model answer from the question's options
                  const modelAnswer = getModelAnswer(question);

                  // Evaluate the answer
                  const evaluation = await evaluateAnswer(
                    question.question_text,
                    modelAnswer,
                    userAnswers[question.id]
                  );

                  evaluationResults[question.id] = evaluation;
                } catch (error) {
                  console.error(
                    `Error evaluating question ${question.id}:`,
                    error
                  );
                  // Provide a fallback evaluation
                  evaluationResults[question.id] = {
                    score: 50,
                    feedback:
                      "We couldn't generate specific feedback for your answer.",
                    isCorrect: true,
                  };
                }
              })
            );
          }
        };

        await evaluateQuestions(evaluationsNeeded);
        setAiEvaluations(evaluationResults);
      }

      try {
        // Try to save to Supabase if table exists
        // Calculate the score
        const score = calculateScore();

        // Create a record of the submission
        const { data: submission, error: submissionError } = await supabase
          .from("quiz_submissions")
          .insert({
            quiz_set_id: quiz.id,
            user_id: user.id,
            lecture_id: lectureId,
            score: score.percentage,
            answers: userAnswers,
            ai_evaluations:
              Object.keys(aiEvaluations).length > 0 ? aiEvaluations : null,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        // If we got here without error, update the submission
        if (!submissionError && submission) {
          console.log("Quiz submission saved to database:", submission.id);
        }
      } catch (dbError) {
        // If there's a database error, just log it but don't prevent showing results
        console.warn("Could not save quiz submission to database:", dbError);
        console.log("Continuing with local state only");
      }

      // Set results state to true regardless of database success
      setShowResults(true);

      // Reset to first question to ensure we start at the top of the results page
      setCurrentQuestionIndex(0);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get model answer from question
  const getModelAnswer = (question) => {
    // We don't have model_answer column, so we'll get it from the correct option
    // Check if options exist and find the correct option
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find(
        (option) => option.is_correct === true
      );
      if (correctOption) {
        return correctOption.option_text;
      }
    }

    // Fallback to a generic answer if no correct option is found
    return "Sample answer not available";
  };

  const navigateQuestion = (direction) => {
    setCurrentQuestionIndex((prev) => {
      const newIndex = prev + direction;
      return Math.max(0, Math.min(newIndex, quizQuestions.length - 1));
    });
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setAiEvaluations({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setViewingHistoricalQuiz(false);
    setSelectedHistoryQuiz(null);
  };

  const calculateScore = () => {
    if (quizQuestions.length === 0) {
      return { correct: 0, total: 0, percentage: 0 };
    }

    let correctCount = 0;
    let totalAnswerable = 0;

    quizQuestions.forEach((question) => {
      // Only count multiple choice questions for scoring
      if (question.question_type === "multiple_choice") {
        totalAnswerable++;
        const userAnswer = userAnswers[question.id];
        const correctOption = question.options.find(
          (option) => option.is_correct
        );

        if (userAnswer && correctOption && userAnswer === correctOption.id) {
          correctCount++;
        }
      }
    });

    const percentage =
      totalAnswerable > 0
        ? Math.round((correctCount / totalAnswerable) * 100)
        : 0;

    return {
      correct: correctCount,
      total: totalAnswerable,
      percentage,
    };
  };

  return {
    quiz,
    quizQuestions,
    loading,
    isGenerating,
    error,
    currentQuestionIndex,
    userAnswers,
    aiEvaluations,
    showResults,
    noQuizExists,
    quizOptions,
    // Quiz history states
    quizHistory,
    loadingHistory,
    showHistory,
    selectedHistoryQuiz,
    viewingHistoricalQuiz,
    // Functions
    setQuizOptions,
    fetchQuiz,
    handleOptionChange,
    generateQuiz,
    handleSelectAnswer,
    handleOpenEndedAnswer,
    handleSubmitQuiz,
    navigateQuestion,
    resetQuiz,
    calculateScore,
    // Quiz history functions
    fetchQuizHistory,
    loadHistoryQuiz,
    toggleHistory,
    exitHistoryQuiz,
    isMounted,
  };
}
