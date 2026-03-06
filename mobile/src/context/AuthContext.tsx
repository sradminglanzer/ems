import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type UserContextType = {
    id: string;
    name: string;
    role: string;
    activeAcademicYearId?: string;
    activeAcademicYearName?: string;
} | null;

type AuthContextType = {
    user: UserContextType;
    loading: boolean;
    signIn: (token: string, userData: UserContextType) => Promise<void>;
    signOut: () => Promise<void>;
    selectedAcademicYearId: string | null;
    setSelectedAcademicYearId: (id: string | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    selectedAcademicYearId: null,
    setSelectedAcademicYearId: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserContextType>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);

    useEffect(() => {
        // Check for token on app load
        const loadStoredUser = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const storedUser = await AsyncStorage.getItem('userData');

                if (token && storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    if (parsedUser.activeAcademicYearId) {
                        setSelectedAcademicYearId(parsedUser.activeAcademicYearId);
                    }
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setLoading(false);
            }
        };

        loadStoredUser();
    }, []);

    const signIn = async (token: string, userData: UserContextType) => {
        try {
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            setUser(userData);
            if (userData?.activeAcademicYearId) {
                setSelectedAcademicYearId(userData.activeAcademicYearId);
            }
        } catch (e) {
            console.error('Failed to store auth data', e);
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            setUser(null);
        } catch (e) {
            console.error('Failed to remove auth data', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, selectedAcademicYearId, setSelectedAcademicYearId }}>
            {children}
        </AuthContext.Provider>
    );
};
