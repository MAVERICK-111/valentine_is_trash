import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
export default function StaffDashboard({ profile }) {
    return (
        <div className="p-4">
        <h1 className="text-2xl">Staff Dashboard</h1>
        <p>Welcome staff, {profile.full_name}!</p>
        <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
        >
            Logout
        </button>
        </div>
    );
}