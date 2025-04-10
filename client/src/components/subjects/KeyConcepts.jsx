import PropTypes from "prop-types";

const KeyConcepts = ({ concepts }) => {
  if (!concepts || concepts.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <h4 className="font-medium text-lg mb-2 text-gray-900 dark:text-gray-100">
        Key Concepts
      </h4>
      <div className="flex flex-wrap gap-2">
        {concepts.map((concept, i) => (
          <span
            key={i}
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium"
          >
            {concept}
          </span>
        ))}
      </div>
    </div>
  );
};

KeyConcepts.propTypes = {
  concepts: PropTypes.arrayOf(PropTypes.string),
};

export default KeyConcepts;
