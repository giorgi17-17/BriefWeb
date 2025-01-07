const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 relative">
      {/* Wave Pattern */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden leading-0 transform rotate-180">
        <svg className="relative block w-full h-12" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-blue-50"></path>
        </svg>
      </div>

      {/* Newsletter Section */}
      <div className="border-t border-b border-gray-200 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated with BriefWeb</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Get the latest updates about new features and study tips delivered to your inbox.
            </p>
            <div className="flex flex-wrap w-full max-w-md gap-2  justify-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2 inline-block">BriefWeb</h4>
            <p className="text-gray-600 mb-4">
              Empowering students with AI-powered study tools for better learning outcomes.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transform hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transform hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transform hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.016 18.6h-2.472v-3.9c0-.923-.018-2.11-1.287-2.11-1.29 0-1.487 1.005-1.487 2.043v3.967H9.297V9.6h2.376v1.09h.033c.33-.627 1.137-1.29 2.34-1.29 2.505 0 2.97 1.65 2.97 3.795v5.405zM7.032 8.51c-.78 0-1.413-.633-1.413-1.413s.633-1.413 1.413-1.413 1.413.633 1.413 1.413-.633 1.413-1.413 1.413zm1.237 10.09H5.796V9.6h2.473v9z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2 inline-block">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Home</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Dashboard</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Create Flashcards</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Study Briefs</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2 inline-block">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Help Center</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Contact Us</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">FAQ</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Community</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2 inline-block">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Terms of Service</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Security</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-600 mb-4 md:mb-0">
            © {new Date().getFullYear()} BriefWeb. All rights reserved.
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Made with</span>
            <svg className="w-5 h-5 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600">for students</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
