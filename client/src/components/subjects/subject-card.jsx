import PropTypes from 'prop-types'

export const SubjectCard = ({ subject }) => {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-2">{subject.name}</h3>
      <div className="text-sm text-gray-500">
        {subject.lectureCount} Lectures
      </div>
    </div>
  );
};

SubjectCard.propTypes = {
  subject: PropTypes.shape({
    name: PropTypes.string.isRequired,
    lectureCount: PropTypes.number.isRequired
  }).isRequired
} 