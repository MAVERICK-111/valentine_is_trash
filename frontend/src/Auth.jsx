import { supabase } from './supabaseClient';
export default function Auth() {
    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
        });
    };
    return (
        <div className="min-h-screen flex items-center justify-center">
        <button onClick={handleLogin} className="bg-blue-500 text-white px-6 py-3 rounded">
            Sign in with Google
        </button>
        </div>
    );
}