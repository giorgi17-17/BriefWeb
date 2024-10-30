import PropTypes from 'prop-types'

export function SubjectCard({ subject }) {
  return (
    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{subject.name}</h3>
      <div className="mt-4 flex space-x-4 text-sm text-gray-500">
        <span>0 Flashcards</span>
        <span>0 Briefs</span>
      </div>
    </div>
  )
}

SubjectCard.propTypes = {
  subject: PropTypes.shape({
    name: PropTypes.string.isRequired
  }).isRequired
} 