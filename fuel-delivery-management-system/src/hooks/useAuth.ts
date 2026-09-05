import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        }, (error) => {
            setError(error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const userCredential = await authService.signInWithEmailAndPassword(email, password);
            setUser(userCredential.user);
        } catch (error) {
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.signOut();
            setUser(null);
        } catch (error) {
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    return { user, loading, error, login, logout };
};

export default useAuth;