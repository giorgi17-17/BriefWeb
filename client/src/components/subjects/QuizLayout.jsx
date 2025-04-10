import PropTypes from "prop-types";
import Quiz from "./Quiz";

const QuizLayout = ({ selectedFile, user, lectureId }) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-6">
      <Quiz selectedFile={selectedFile} user={user} lectureId={lectureId} />
    </div>
  );
};

QuizLayout.propTypes = {
  selectedFile: PropTypes.object,
  user: PropTypes.object.isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default QuizLayout;
