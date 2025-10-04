import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Função para gerar token de sessão único
  const generateSessionToken = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Função para obter informações do dispositivo
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    const platform = navigator.platform || 'Unknown';
    const browserName = ua.includes('Chrome') ? 'Chrome' : 
                       ua.includes('Firefox') ? 'Firefox' : 
                       ua.includes('Safari') ? 'Safari' : 'Other';
    const timestamp = new Date().toLocaleString('pt-BR');
    return `${isMobile ? 'Mobile' : 'Desktop'} - ${platform} - ${browserName} - ${timestamp}`;
  };

  // ✅ CORREÇÃO: Verificar sessão periodicamente (mais tolerante)
  useEffect(() => {
    if (!user || !sessionToken) return;

    const checkSession = async () => {
      try {
        const response = await fetch(`/api/auth?action=check-session&user_id=${user.id}&session_token=${sessionToken}`);
        
        // ✅ CORREÇÃO: Se não conseguir verificar (servidor offline), não desconectar
        if (!response.ok) {
          console.log('⚠️ Servidor indisponível - mantendo sessão local');
          return;
        }
        
        const data = await response.json();

        if (!data.valid) {
          console.log('⚠️ Sessão invalidada em outro dispositivo');
          alert('Sua sessão foi encerrada porque você fez login em outro dispositivo.');
          logout();
        }
      } catch (error) {
        // ✅ CORREÇÃO: Em caso de erro de rede, não desconectar automaticamente
        console.log('⚠️ Erro de rede ao verificar sessão - mantendo sessão local');
      }
    };

    // ✅ CORREÇÃO: Verificar a cada 2 minutos (menos frequente)
    const interval = setInterval(checkSession, 120000);
    
    return () => clearInterval(interval);
  }, [user, sessionToken]);

  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      const storedSessionToken = localStorage.getItem('session_token');
      
      if (storedToken && storedUser && storedSessionToken) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          setSessionToken(storedSessionToken);
          apiClient.setToken(storedToken);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('session_token');
          apiClient.clearToken();
          setToken(null);
          setUser(null);
          setSessionToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);
      const { token: newToken, user: userData } = response;
      
      // Gerar token de sessão único
      const newSessionToken = generateSessionToken();
      const deviceInfo = getDeviceInfo();

      // Criar sessão no servidor (invalida sessões anteriores)
      try {
        await fetch('/api/auth?action=check-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userData.id,
            session_token: newSessionToken,
            device_info: deviceInfo
          }),
        });
        console.log('✅ Sessão única criada, sessões anteriores invalidadas');
      } catch (sessionError) {
        console.error('Erro ao criar sessão:', sessionError);
      }
      
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('session_token', newSessionToken);
      setToken(newToken);
      setUser(userData);
      setSessionToken(newSessionToken);
      apiClient.setToken(newToken);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      await apiClient.register(name, email, password);
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('session_token');
    apiClient.clearToken();
    setToken(null);
    setUser(null);
    setSessionToken(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isLoading: loading,
    isAuthenticated,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};