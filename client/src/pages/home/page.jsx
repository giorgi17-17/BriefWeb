import { useState } from 'react'
import { SubjectCard } from '../../components/subjects/subject-card'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [subjects, setSubjects] = useState([])
  const navigate = useNavigate()

  const addSubject = (subjectName) => {
    setSubjects([...subjects, { 
      id: Date.now(), 
      name: subjectName,
      lectureCount: 0 
    }])
  }

  const handleSubjectClick = (subjectName) => {
    const urlName = encodeURIComponent(subjectName.toLowerCase().replace(/ /g, '-'))
    navigate(`/subjects/${urlName}`)
  }

 

  console.log(subjects)

  return (
    <div className="space-y-8">
      <section className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Study Dashboard</h1>
        
      </section>
      
      <section className="space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Add new subject..."
            className="rounded-md border px-4 py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                addSubject(e.target.value)
                e.target.value = ''
              }
            }}
          />
        </div>
      </section>
      
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <div 
            key={subject.id} 
            onClick={() => handleSubjectClick(subject.name)}
            className="cursor-pointer"
          >
            <SubjectCard subject={subject} />
          </div>
        ))}
      </section>
    </div>
  )
} 