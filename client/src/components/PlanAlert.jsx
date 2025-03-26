import { useNavigate } from "react-router-dom";
import { useUserPlan } from "../contexts/UserPlanContext";
import { AlertCircle } from "lucide-react";

const PlanAlert = ({ showSubjectLimit = true }) => {
  const navigate = useNavigate();
  const { isFree, subjectLimit, planType, isLoading } = useUserPlan();

  if (isLoading || !isFree) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 mb-6 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">You're on the Free Plan</p>
          {showSubjectLimit && (
            <p className="mt-1 text-sm opacity-90">
              You can create up to {subjectLimit} subjects on the {planType}{" "}
              plan.
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate("/payments")}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
      >
        Upgrade Now
      </button>
    </div>
  );
};

export default PlanAlert;
