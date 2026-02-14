import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Dashboard from './Dashboard';
import StaffDashboard from './StaffDashboard';
import AdminDashboard from './AdminDashboard';
function App() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });
        return () => listener?.subscription.unsubscribe();
    }, []);
    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            const user = (await supabase.auth.getUser()).data.user;
            const { data: newProfile } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        full_name: user.user_metadata.full_name,
                        role: 'user'
                    }
                ])
                .select()
                .single();

            setProfile(newProfile);
        } else {
            setProfile(data);
        }
    };
    if (!session) return <Auth />;
    if (!profile) {
        return <div className="p-4">Loading...</div>;
    }
    if (profile?.role === 'admin') return <AdminDashboard profile={profile} />;
    if (profile?.role === 'staff') return <StaffDashboard profile={profile} />;
    return <Dashboard profile={profile} />;
}
export default App