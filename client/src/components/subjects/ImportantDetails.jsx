import PropTypes from "prop-types";

const ImportantDetails = ({ details }) => {
  if (!details || details.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h4 className="font-medium text-lg mb-3 text-gray-900 dark:text-gray-100">
        Important Details
      </h4>
      <ul className="list-disc pl-5 space-y-2">
        {details.map((detail, i) => (
          <li key={i} className="text-gray-700 dark:text-gray-300">
            {detail}
          </li>
        ))}
      </ul>
    </div>
  );
};

ImportantDetails.propTypes = {
  details: PropTypes.arrayOf(PropTypes.string),
};

export default ImportantDetails;
