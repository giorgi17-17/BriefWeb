import { useNavigate } from "react-router-dom";
import { FiZap } from "react-icons/fi";
import PropTypes from "prop-types";

const UpgradeButton = ({ className, size = "md", text = "Upgrade Now" }) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate("/payments");
  };

  // Size classes
  const sizeClasses = {
    sm: "py-1 px-3 text-xs",
    md: "py-2 px-4 text-sm",
    lg: "py-3 px-6 text-base",
  };

  // Default button classes
  const defaultClasses = `
    inline-flex items-center justify-center 
    font-medium rounded-md shadow-sm 
    text-white bg-gradient-to-r from-blue-600 to-indigo-600 
    hover:from-blue-700 hover:to-indigo-700 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
    transition-all duration-150
  `;

  return (
    <button
      onClick={handleUpgradeClick}
      className={`${defaultClasses} ${sizeClasses[size]} ${className || ""}`}
    >
      <FiZap className="mr-2" />
      {text}
    </button>
  );
};

UpgradeButton.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  text: PropTypes.string,
};

export default UpgradeButton;
