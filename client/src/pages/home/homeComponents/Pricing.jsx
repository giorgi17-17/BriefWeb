import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full py-20 px-4 theme-bg-primary">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4 theme-text-primary">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg max-w-xl mx-auto theme-text-tertiary">
            Choose the perfect plan for your study needs with no hidden fees
          </p>
        </div>

        <div className="max-w-5xl mx-auto mt-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="border theme-border theme-card rounded-lg p-8">
              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 theme-text-primary">
                  Free
                </h3>
                <p className="mb-4 text-sm theme-text-tertiary">
                  Great place to get started
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold theme-text-primary">
                    $0
                  </span>
                  <span className="ml-1 theme-text-tertiary">/forever</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Up to 3 subjects
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    5 lectures per subject
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Generate up to 20 flashcards
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Basic note summarization
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    PDF file support up to 5MB
                  </span>
                </li>
              </ul>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Get Started
              </button>
            </div>

            {/* Pro Plan */}
            <div className="border theme-border theme-card rounded-lg p-8 relative">
              <div className="absolute top-0 right-0 bg-blue-700 text-white text-xs px-3 py-1 uppercase font-bold rounded-bl-lg rounded-tr-lg">
                Popular
              </div>

              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 theme-text-primary">
                  Pro
                </h3>
                <p className="mb-4 text-sm theme-text-tertiary">
                  Everything you need to ace your classes
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold theme-text-primary">
                    $2
                  </span>
                  <span className="ml-1 theme-text-tertiary">/week</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Unlimited subjects
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Unlimited lectures
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Generate unlimited flashcards
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    Advanced AI-powered summaries
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check size={16} className="text-green-500" />
                  </span>
                  <span className="text-sm theme-text-secondary">
                    PDF file support up to 50MB
                  </span>
                </li>
               
              </ul>

              <button
                onClick={() => navigate("/payments")}
                className="w-full py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
