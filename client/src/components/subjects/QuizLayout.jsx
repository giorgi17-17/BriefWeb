import PropTypes from "prop-types";
import Quiz from "./Quiz";

const QuizLayout = ({ selectedFile, user, lectureId, ...props }) => {
  return (
    <div className="w-full mx-auto">
      <Quiz selectedFile={selectedFile} user={user} lectureId={lectureId} {...props} />
    </div>
  );
};

QuizLayout.propTypes = {
  selectedFile: PropTypes.object,
  user: PropTypes.object.isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default QuizLayout;
