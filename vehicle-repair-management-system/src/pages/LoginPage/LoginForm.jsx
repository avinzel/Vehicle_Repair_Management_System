import { useNavigate } from "react-router";
import { getFormKeys } from "../../utils/getFormKeys";
export function LoginForm({ authenticateUser }) {
    const navigate = useNavigate();
    async function login(e) {
        e.preventDefault();
        const user = getFormKeys(e);
        const response = await fetch("http://localhost:8000/api.php?action=login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "username": user["username"],
                "password": user["password"]
            }),
            credentials: "include"
        });
        const data = await response.json();

        if (!response.ok) {
            alert(data.error);//toast notification
            return;
        } 
        await authenticateUser()

        const roleRoutes = {
            1: "/admin",
            2: "/mechanic",
            3: "/service-advisor"
        };

        navigate(roleRoutes[data.role_id] ?? "/", { replace: true });

    }
    return (
        <>
            <div className="min-h-screen bg-[#f3f4f6] flex flex-col justify-center items-center p-4">
                {/* Container Card */}
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                    {/* Header & Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-[#c84b15] rounded-xl flex items-center justify-center text-white mb-3 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 012 2v1e1M4 7e1 4 4 0 014-4h12a4 4 0 014 4v12a4 4 0 01-4 4H8a4 4 0 01-4-4V7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vehicle Repair MS</h1>
                        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                    </div>

                    {/* Login Form UI */}
                    <form className="space-y-5" onSubmit={(e) => login(e)}>
                        {/* Username Field */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                name="username"
                                required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#c84b15] focus:bg-white transition-all duration-200 placeholder-gray-400"
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                name="password"
                                required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#c84b15] focus:bg-white transition-all duration-200 placeholder-gray-400"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full mt-2 py-3 px-4 bg-[#c84b15] hover:bg-[#b03f10] active:bg-[#9a370e] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c84b15]"
                        >
                            Login
                        </button>
                    </form>

                    {/* Registration Link */}
                    <div className="mt-6 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a
                            href="/register"
                            className="font-semibold text-[#c84b15] hover:underline transition-all duration-200"
                        >
                            Sign in
                        </a>
                    </div>

                    {/* Footer info */}
                    <div className="mt-6 text-center text-xs text-gray-400">
                        Internal Service Portal &bull; System Access Only
                    </div>
                </div>
            </div>
        </>
    )
}