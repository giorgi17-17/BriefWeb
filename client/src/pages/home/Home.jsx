import { useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Hero from "./homeComponents/Hero";
import HowitWorks from "./homeComponents/HowitWorks";
import WhyUs from "./homeComponents/WhyUs";
import Pricing from "./homeComponents/Pricing";
import { background, text, border } from "../../utils/themeUtils";

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section for Students */}
      <Hero />

      {/* How It Works Section */}
      <div id="how-it-works">
        <HowitWorks />
      </div>

      {/* Benefits Section */}
      <div id="why-us">
        <WhyUs />
      </div>

      {/* Pricing Section */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* Final CTA Section */}
      <div className="py-16 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Study Experience?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of students who are already studying smarter
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white text-black px-8 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors dark:bg-gray-200 dark:hover:bg-gray-300"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Stay Updated Section */}
      <div className={`py-16 ${background("primary")}`}>
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-2xl font-bold mb-4 ${text("primary")}`}>
            Stay Updated with Brief
          </h2>
          <p className={`mb-6 text-sm ${text("tertiary")}`}>
            Get the latest updates about new features and study tips delivered
            to your inbox
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className={`px-4 py-2 flex-grow border rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm ${border(
                "primary"
              )} ${background("primary")} ${text("primary")}`}
            />
            <button className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors whitespace-nowrap text-sm dark:bg-gray-700 dark:hover:bg-gray-600">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
