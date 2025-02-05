import { useNavigate } from "react-router-dom";
import Footer from "../../components/layout/Footer";
import Hero from "./homeComponents/Hero";
import HowitWorks from "./homeComponents/HowitWorks";
import WhyUs from "./homeComponents/WhyUs";
import Pricing from "./homeComponents/Pricing";

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section for Students */}
      <Hero />

      {/* How It Works Section */}
      <HowitWorks />

      {/* Benefits Section */}
      <WhyUs />

      <Pricing />

      {/* Final CTA Section */}
      <div className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Study Experience?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who are already studying smarter
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Now
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
