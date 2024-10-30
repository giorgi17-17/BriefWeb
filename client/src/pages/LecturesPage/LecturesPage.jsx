import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const LecturesPage = () => {
  const { name } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [lectures, setLectures] = useState([])

  useEffect(() => {
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
    <div className="min-h-screen relative pb-24">
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
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Lectures ({lectures.length})</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lectures.map(lecture => (
              <Link 
                key={lecture.id}
                to={`/subjects/${name}/lectures/${lecture.id}`}
                className="block hover:bg-gray-100 transition-colors"
              >
                <div className="p-4 bg-gray-50 rounded-lg h-full">
                  <div className="flex flex-col h-full">
                    <h3 className="font-medium mb-2">{lecture.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{lecture.date}</p>
                    <div className="text-sm text-gray-500 mt-auto">
                      <div>Flashcards: 0</div>
                      <div>Briefs: 0</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {lectures.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No lectures yet. Click the Add Lecture button to get started.
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black p-4">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={addLecture}
            className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors border border-white"
          >
            Add Lecture
          </button>
        </div>
      </div>
    </div>
  )
}

export default LecturesPage