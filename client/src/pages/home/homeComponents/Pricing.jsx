import PropTypes from 'prop-types';
import { Check, X } from 'lucide-react';

const PricingCard = ({ plan, price, features, popular }) => (
  <div className={`
    w-full rounded-2xl overflow-hidden
    transform transition-all duration-300 hover:scale-105 mx-auto
    ${popular ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white' : 'bg-white border-2 border-blue-100'}
    max-w-[340px] sm:max-w-sm
  `}>
    {popular && (
      <div className="bg-blue-100 text-blue-800 text-sm font-bold px-4 py-1 text-center">
        MOST POPULAR
      </div>
    )}

    <div className="p-6 sm:p-8">
      <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${popular ? 'text-white' : 'text-gray-900'}`}>
        {plan}
      </h3>
      <div className="mb-6">
        {price === 0 ? (
          <span className={`text-2xl sm:text-3xl font-bold ${popular ? 'text-white' : 'text-gray-900'}`}>
            Free Forever
          </span>
        ) : (
          <div className="flex items-baseline">
            <span className={`text-4xl sm:text-5xl font-bold ${popular ? 'text-white' : 'text-gray-900'}`}>
              ${price}
            </span>
            <span className={`text-lg sm:text-xl ml-2 ${popular ? 'text-white/80' : 'text-gray-600'}`}>
              /month
            </span>
          </div>
        )}
      </div>

      <ul className="space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-sm sm:text-base">
            {feature.included ? (
              <Check className={`h-5 w-5 ${popular ? 'text-blue-200' : 'text-blue-500'} shrink-0`} />
            ) : (
              <X className={`h-5 w-5 ${popular ? 'text-white/50' : 'text-red-500'} shrink-0`} />
            )}
            <span className={`
              ${popular ? 'text-white' : 'text-gray-600'} 
              ${!feature.included && (popular ? 'text-white/50' : 'text-gray-400')}
            `}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>

    <div className="px-6 pb-6 sm:px-8 sm:pb-8">
      <button className={`
        w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300
        ${popular ? 
          'bg-white text-blue-800 hover:bg-blue-50' : 
          'bg-blue-600 text-white hover:bg-blue-700'}
      `}>
        {price === 0 ? 'Get Started' : 'Upgrade Now'}
      </button>
    </div>
  </div>
);





const Pricing = () => {
  const plans = [
    {
      plan: "Free",
      price: 0,
      popular: false,
      features: [
        { included: true, text: "Create up to 3 subjects" },
        { included: true, text: "5 lectures per subject" },
        { included: true, text: "Generate up to 2 flashcards per lecture" },
        { included: true, text: "Basic note summarization" },
        { included: true, text: "PDF file support up to 5MB" },
        { included: false, text: "Unlimited subjects" },
        { included: false, text: "Unlimited lectures" },
        { included: false, text: "Advanced AI-powered summaries" },
        { included: false, text: "Priority processing" }
      ]
    },
    {
      plan: "Pro",
      price: 2,
      popular: true,
      features: [
        { included: true, text: "Create unlimited subjects" },
        { included: true, text: "Unlimited lectures per subject" },
        { included: true, text: "Generate unlimited flashcards" },
        { included: true, text: "Advanced AI-powered summaries" },
        { included: true, text: "PDF file support up to 50MB" },
        { included: true, text: "Priority processing" },
        { included: true, text: "Custom flashcard templates" },
      ]
    }
  ];

  return (
    <div className="w-full bg-white py-8 sm:py-12 px-4">
      <div className="text-center mb-8 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
          Simple, transparent pricing
        </h1>
        <p className="text-lg sm:text-xl text-gray-600">
          Choose the perfect plan for your study needs
        </p>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
        {plans.map((plan) => (
          <PricingCard key={plan.plan} {...plan} />
        ))}
      </div>
    </div>
  );
};

export default Pricing;

PricingCard.propTypes = {
    plan: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    features: PropTypes.arrayOf(
      PropTypes.shape({
        included: PropTypes.bool.isRequired,
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
    popular: PropTypes.bool,
  };