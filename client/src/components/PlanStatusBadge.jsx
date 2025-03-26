import { useUserPlan } from "../contexts/UserPlanContext";
import { Crown } from "lucide-react";

const PlanStatusBadge = () => {
  const { planType, isLoading } = useUserPlan();
  const isPremium = planType === "premium";

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <span className="w-2 h-2 mr-1.5 rounded-full bg-gray-400 animate-pulse"></span>
        Loading...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isPremium
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {isPremium && <Crown size={10} className="mr-1" />}
      {isPremium ? "Premium" : "Free"}
    </span>
  );
};

export default PlanStatusBadge;
