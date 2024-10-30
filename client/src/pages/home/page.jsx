import { useState } from "react";
import { SubjectCard } from "../../components/subjects/subject-card";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const navigate = useNavigate();

  // Hardcoded initial subjects
  const [subjects] = useState([
    { id: 1, name: "Math", lectureCount: 0 },
    { id: 2, name: "Marketing", lectureCount: 0 },
    { id: 3, name: "Coding", lectureCount: 0 },
  ]);

  const handleSubjectClick = (subjectName) => {
    const urlName = encodeURIComponent(
      subjectName.toLowerCase().replace(/ /g, "-")
    );
    navigate(`/subjects/${urlName}`);
  };

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      // Add your subject creation logic here
      setIsModalOpen(false);
      setNewSubjectName("");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Don&apos;t Struggle, Make It Brief
        </h1>
        <p className="text-xl text-gray-600">
          Create Flashcards and Briefs using AI
        </p>
      </section>

      {/* Subjects Grid */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleSubjectClick(subject.name)}
              className="cursor-pointer"
            >
              <SubjectCard subject={subject} />
            </div>
          ))}
        </div>
      </section>

      {/* Add Subject Button */}
      <div className="text-center mt-8">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add New Subject
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add New Subject</h2>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Enter subject name..."
              className="w-full px-4 py-2 border rounded-md mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
