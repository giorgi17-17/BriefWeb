import PropTypes from "prop-types";

const ErrorMessage = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg mb-4">
      {error}
    </div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.string,
};

export default ErrorMessage;
