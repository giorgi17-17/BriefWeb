import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login/Login';
import Header from './components/Header/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PropTypes from 'prop-types';
import LecturesPage from './pages/LecturesPage/LecturesPage';
import LectureDetailPage from './pages/LectureDetailPage/LectureDetailPage';
import Dashboard from './pages/dashboard/Dashboard';
import { Home } from './pages/home/Home';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lectures"
              element={
                <ProtectedRoute>
                  <LecturesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/:name"
              element={
                <ProtectedRoute>
                  <LecturesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/:name/lectures/:lectureId"
              element={
                <ProtectedRoute>
                  <LectureDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
