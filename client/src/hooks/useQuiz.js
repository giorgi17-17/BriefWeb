import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessQuiz } from "../utils/api";

export function useQuiz(lectureId, user) {
  const [quiz, setQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [noQuizExists, setNoQuizExists] = useState(false);
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

    if (lectureId) {
      fetchQuiz();
    }

    // Cleanup when component unmounts
    return () => {
      isMounted.current = false;
    };
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

      // Create a record of the submission
      const { data: submission, error: submissionError } = await supabase
        .from("quiz_submissions")
        .insert({
          quiz_set_id: quiz.id,
          user_id: user.id,
          lecture_id: lectureId,
          score: null, // Will be updated after calculation
          answers: userAnswers,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Calculate the score
      const score = calculateScore();

      // Update the submission with the calculated score
      const { error: updateError } = await supabase
        .from("quiz_submissions")
        .update({ score: score.percentage })
        .eq("id", submission.id);

      if (updateError) throw updateError;

      setShowResults(true);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const navigateQuestion = (direction) => {
    setCurrentQuestionIndex((prev) => {
      const newIndex = prev + direction;
      return Math.max(0, Math.min(newIndex, quizQuestions.length - 1));
    });
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
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
    showResults,
    noQuizExists,
    quizOptions,
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
    isMounted,
  };
}
