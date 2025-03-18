import PropTypes from "prop-types";
import { uiColors } from "../../utils/designTokens";

/**
 * Button component that follows the design system
 *
 * @param {Object} props
 * @param {string} props.variant - 'primary', 'secondary', 'outline', or 'ghost'
 * @param {string} props.size - 'sm', 'md', or 'lg'
 * @param {string} props.intent - 'default', 'success', 'warning', 'error'
 * @param {boolean} props.fullWidth - Whether button should take full width
 * @param {React.ReactNode} props.children - Button content
 * @param {React.HTMLAttributes<HTMLButtonElement>} props.props - Any additional button props
 */
const Button = ({
  variant = "primary",
  size = "md",
  intent = "default",
  fullWidth = false,
  disabled = false,
  children,
  className = "",
  ...props
}) => {
  // Base classes for all buttons
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Variant-specific classes
  const variantClasses = {
    primary:
      "bg-black text-white border border-transparent hover:bg-gray-800 focus:ring-gray-500",
    secondary:
      "bg-gray-100 text-gray-900 border border-transparent hover:bg-gray-200 focus:ring-gray-300",
    outline:
      "bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300",
    ghost:
      "bg-transparent text-gray-700 border border-transparent hover:bg-gray-100 focus:ring-gray-300",
  };

  // Size-specific classes
  const sizeClasses = {
    sm: "text-xs px-3 py-2",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-3",
  };

  // Intent-specific classes (color modifiers)
  const intentClasses = {
    default: "",
    success:
      variant === "primary"
        ? `bg-[${uiColors.success}] hover:bg-[#0da271] focus:ring-green-500`
        : `text-[${uiColors.success}] focus:ring-green-500`,
    warning:
      variant === "primary"
        ? `bg-[${uiColors.warning}] hover:bg-[#dc8f09] focus:ring-amber-500`
        : `text-[${uiColors.warning}] focus:ring-amber-500`,
    error:
      variant === "primary"
        ? `bg-[${uiColors.error}] hover:bg-[#dc2626] focus:ring-red-500`
        : `text-[${uiColors.error}] focus:ring-red-500`,
  };

  // Width classes
  const widthClasses = fullWidth ? "w-full" : "";

  // Disabled classes
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  const buttonClasses = `
    ${baseClasses} 
    ${variantClasses[variant] || variantClasses.primary} 
    ${sizeClasses[size] || sizeClasses.md} 
    ${intentClasses[intent] || ""} 
    ${widthClasses} 
    ${disabledClasses}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  return (
    <button className={buttonClasses} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "outline", "ghost"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  intent: PropTypes.oneOf(["default", "success", "warning", "error"]),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Button;
