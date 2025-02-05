import { useNavigate } from "react-router-dom"

const Hero = () => {
    const navigate = useNavigate();
  
  return (
    <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Don&apos;t Struggle, Make It Brief
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your personal AI study assistant that helps you create flashcards
              and study briefs in seconds.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
  )
}

export default Hero