import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";

const Login = () => {
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const posthog = usePostHog();
  const { t } = useTranslation();

  // Check for redirect status in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("googleRedirect") === "true") {
      setIsGoogleRedirecting(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);

      // Track successful email login
      try {
        posthog.capture("login_with_email", {
          source: "login_page",
          user_id: email,
        });
      } catch (error) {
        console.error("PostHog event error:", error);
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsGoogleRedirecting(true);

      // Track Google sign-in attempt
      try {
        posthog.capture("login_with_google", {
          source: "login_page",
          user_id: "anonymous",
        });
      } catch (error) {
        console.error("PostHog event error:", error);
      }

      await signInWithGoogle();
      // The redirect will be handled by Supabase OAuth flow
    } catch (error) {
      console.error(error);
      setError(error.message);
      setIsGoogleRedirecting(false);
    }
  };

  // If we're in the Google redirecting state, show a loading message
  if (isGoogleRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0b] text-gray-900 dark:text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">
            {t("auth.login.redirecting.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t("auth.login.redirecting.description")}
          </p>
        </div>
      </div>
    );
  }

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
          {t("auth.login.title")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("auth.login.subtitle")}
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-md border px-4 py-3 text-sm text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800/50"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-white/10 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
              />
            </g>
          </svg>
          {t("auth.login.googleButton")}
        </button>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {t("auth.login.orDivider")}
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            {t("auth.login.email")}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.emailPlaceholder")}
              className="block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f0f0f] py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none ring-0 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm text-gray-700 dark:text-gray-300"
            >
              {t("auth.login.password")}
            </label>
            <a
              href="#"
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t("auth.login.forgotPassword")}
            </a>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.passwordPlaceholder")}
              className="block w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f0f0f] py-2 pl-10 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className={`${
            isLoading || !isFormValid
              ? "bg-blue-600/50 text-white cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          } w-full rounded-md px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/30`}
        >
          {isLoading ? t("auth.login.signingIn") : t("auth.login.signInButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t("auth.login.noAccount")}{" "}
        <Link
          to="/register"
          className="font-medium text-blue-600 hover:underline dark:text-gray-200"
        >
          {t("auth.login.signUpLink")}
        </Link>
      </p>
    </div>
  );
};

export default Login;
