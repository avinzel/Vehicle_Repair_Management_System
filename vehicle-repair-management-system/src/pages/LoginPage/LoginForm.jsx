import { useState } from "react";
import { useNavigate } from "react-router";
import { Wrench, Eye, EyeOff } from "lucide-react";
import { getFormKeys } from "../../utils/getFormKeys";
import cover from "../../assets/login-cover.jpg";


const COVER_IMAGE = cover;

export function LoginForm({ authenticateUser }) {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function login(e) {
        e.preventDefault();
        const user = getFormKeys(e);

        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch("http://localhost:8000/api.php?action=login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user["username"],
                    password: user["password"],
                }),
                credentials: "include",
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setError(data.error ?? "Unable to sign in. Please try again.");
                return;
            }

            await authenticateUser();

            const roleRoutes = {
                1: "/admin",
                2: "/service-advisor",
                3: "/mechanic",
            };

            navigate(roleRoutes[data.role_id] ?? "/", { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
            setError("Can't reach the server. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c84b15] focus:bg-white transition-colors duration-200";

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white">
            {/* Left: inset, rounded cover panel. Set COVER_IMAGE to your image URL/import. */}
            <div className="hidden lg:block p-4">
                <div className="relative h-full min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#c84b15] via-[#a63d10] to-[#5c2008]">
                    {COVER_IMAGE && (
                        <img
                            src={COVER_IMAGE}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    )}

                    {/* Legibility scrims for the brand (top) and headline (bottom) */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* Brand lockup, top-left of the panel */}
                    <div className="absolute left-6 top-6 flex items-center gap-3 text-white">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                            <Wrench className="h-4 w-4" />
                        </div>
                        <span className="text-base font-semibold tracking-tight">Vehicle Repair MS</span>
                    </div>

                    {/* Headline, bottom-left */}
                    <div className="absolute inset-x-8 bottom-8 text-white">
                        <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight">
                            Every repair, from intake to invoice.
                        </h2>
                        <p className="mt-3 max-w-md text-sm text-white/80">
                            Track jobs, assign mechanics, log parts, and bill customers in one place.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: form column */}
            <div className="flex flex-col p-6 sm:p-10">
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to your account</h1>
                            <p className="text-sm text-gray-500 mt-1.5">
                                Enter your username and password to continue
                            </p>
                        </div>

                        <form className="space-y-5" onSubmit={login}>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    required
                                    disabled={submitting}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                        disabled={submitting}
                                        className={`${inputClass} pr-11`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        aria-pressed={showPassword}
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-[#c84b15]"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p
                                    role="alert"
                                    className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 px-4 bg-[#c84b15] hover:bg-[#b03f10] active:bg-[#9a370e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c84b15]"
                            >
                                {submitting ? "Signing in..." : "Sign in"}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-xs text-gray-400">
                            Internal service portal. Authorized staff only.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}