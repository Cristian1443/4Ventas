import { useState } from 'react';
import { UserSession } from '../models/app-config.model';

export const useSession = () => {
    const [userSession, setUserSession] = useState<UserSession>({ isLoggedIn: false });

    const login = (username: string) => setUserSession({ isLoggedIn: true, username });

    const logout = () => {
        console.log('🚪 Cerrando sesión...');
        setUserSession({ isLoggedIn: false });
    };

    return {
        userSession,
        setUserSession,
        login,
        logout
    };
};
