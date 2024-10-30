import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const LectureDetailPage = () => {
  const { name, lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('flashcards');
  const [flashcards, setFlashcards] = useState([]);
  const [briefs, setBriefs] = useState([]);

  const addFlashcard = () => {
    const newFlashcard = {
      id: Date.now(),
      question: '',
      answer: '',
    };
    setFlashcards([...flashcards, newFlashcard]);
  };

  const addBrief = () => {
    const newBrief = {
      id: Date.now(),
      title: `Brief ${briefs.length + 1}`,
      content: '',
    };
    setBriefs([...briefs, newBrief]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/subjects/${name}`)}
            className="text-blue-500 hover:text-blue-600 mb-4"
          >
            ← Back to Lectures
          </button>
          <h1 className="text-3xl font-bold">Lecture Details</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-6 py-3 ${
                activeTab === 'flashcards'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('flashcards')}
            >
              Flashcards
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === 'briefs'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('briefs')}
            >
              Briefs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'flashcards' ? (
            <div className="space-y-4">
              <button
                onClick={addFlashcard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Flashcard
              </button>
              {flashcards.map((flashcard) => (
                <div
                  key={flashcard.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <textarea
                    placeholder="Question"
                    className="w-full p-2 border rounded"
                    rows="2"
                  />
                  <textarea
                    placeholder="Answer"
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={addBrief}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Brief
              </button>
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <input
                    type="text"
                    placeholder="Brief Title"
                    className="w-full p-2 border rounded"
                    value={brief.title}
                  />
                  <textarea
                    placeholder="Brief Content"
                    className="w-full p-2 border rounded"
                    rows="4"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LectureDetailPage; 