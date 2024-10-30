import { Link } from 'react-router-dom'

export const Header = () => {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">
            Brief
          </Link>
          <div className="space-x-4">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/subjects" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Subjects
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
} 