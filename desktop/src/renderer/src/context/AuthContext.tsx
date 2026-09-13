import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService, AcademicYearService } from '../api/client';

interface User {
  id: string;
  name: string;
  role: string;
  entityId: string;
  entityName?: string;
  phone?: string;
}

interface AcademicYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  entityName: string;
  academicYears: AcademicYear[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  isLoading: boolean;
  login: (token: string, userData: any, entityData?: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ems_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ems_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [entityName, setEntityName] = useState<string>(
    localStorage.getItem('ems_entity_name') || 'EMS School ERP'
  );
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>(
    localStorage.getItem('ems_selected_year_id') || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await AuthService.getMe();
          if (res.data) {
            setUser(res.data.user || res.data);
            if (res.data.entity?.name) {
              setEntityName(res.data.entity.name);
              localStorage.setItem('ems_entity_name', res.data.entity.name);
            }
          }
          // Fetch academic years
          const ayRes = await AcademicYearService.getAll();
          if (ayRes.data && Array.isArray(ayRes.data)) {
            setAcademicYears(ayRes.data);
            const activeYear = ayRes.data.find((y: any) => y.isCurrent) || ayRes.data[0];
            if (activeYear && !selectedYearId) {
              setSelectedYearId(activeYear._id);
              localStorage.setItem('ems_selected_year_id', activeYear._id);
            }
          }
        } catch (e) {
          console.error('Session verification failed', e);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleLogoutEvent = () => logout();
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, [token]);

  const login = (newToken: string, userData: any, entityData?: any) => {
    localStorage.setItem('ems_token', newToken);
    localStorage.setItem('ems_user', JSON.stringify(userData));
    if (entityData?.name) {
      localStorage.setItem('ems_entity_name', entityData.name);
      setEntityName(entityData.name);
    }
    if (entityData?._id) {
      localStorage.setItem('ems_entity_id', entityData._id);
    }
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    localStorage.removeItem('ems_entity_id');
    setToken(null);
    setUser(null);
  };

  const handleSelectYear = (id: string) => {
    setSelectedYearId(id);
    localStorage.setItem('ems_selected_year_id', id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        entityName,
        academicYears,
        selectedYearId,
        setSelectedYearId: handleSelectYear,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
