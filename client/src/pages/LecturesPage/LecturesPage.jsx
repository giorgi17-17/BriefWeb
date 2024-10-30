import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const LecturesPage = () => {
  const { name } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [lectures, setLectures] = useState([])

  useEffect(() => {
    // Convert URL-friendly name back to display format
    const displayName = decodeURIComponent(name)
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    const subjectData = {
      id: Date.now(),
      name: displayName,
      lectureCount: lectures.length
    }
    setSubject(subjectData)
  }, [name, lectures.length])

  const addLecture = () => {
    const newLecture = {
      id: Date.now(),
      title: `Lecture ${lectures.length + 1}`,
      date: new Date().toLocaleDateString()
    }
    setLectures([...lectures, newLecture])
  }

  if (!subject) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:text-blue-600 mb-4"
          >
            ← Back to Subjects
          </button>
          <h1 className="text-3xl font-bold">{subject.name}</h1>
        </div>
        <button
          onClick={addLecture}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Lecture
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Lectures ({lectures.length})</h2>
        <div className="space-y-4">
          {lectures.map(lecture => (
            <Link 
              key={lecture.id}
              to={`/subjects/${name}/lectures/${lecture.id}`}
              className="block hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">{lecture.title}</h3>
                  <p className="text-sm text-gray-500">{lecture.date}</p>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="mr-4">Flashcards: 0</span>
                  <span>Briefs: 0</span>
                </div>
              </div>
            </Link>
          ))}
          {lectures.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No lectures yet. Click the Add Lecture button to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LecturesPage 