import React from 'react';
import { AuthProvider } from '../../features/auth';
import { ThemeProvider } from '../../styles/theme';

const AppProviders: React.FC = ({ children }) => {
    return (
        <AuthProvider>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </AuthProvider>
    );
};

export default AppProviders;