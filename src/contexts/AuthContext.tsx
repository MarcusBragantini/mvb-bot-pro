import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
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

    let isCheckingSession = false; // Flag para evitar verificações simultâneas
    let consecutiveErrors = 0; // Contador de erros consecutivos

    const checkSession = async () => {
      // Evitar múltiplas verificações simultâneas
      if (isCheckingSession) return;
      
      isCheckingSession = true;

      try {
        const response = await fetch(`/api/auth?action=check-session&user_id=${user.id}&session_token=${sessionToken}`, {
          // Não lançar erro para status 401 no console
          signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
        }).catch(() => null); // Silenciar erros de rede
        
        // Se não conseguiu conectar ou timeout
        if (!response) {
          consecutiveErrors++;
          if (consecutiveErrors === 1) {
            console.log('⚠️ Servidor de sessão indisponível - mantendo sessão local');
          }
          isCheckingSession = false;
          return;
        }

        // ✅ Se resposta OK (200), verificar validade da sessão
        if (response.ok) {
          const data = await response.json();
          consecutiveErrors = 0; // Resetar contador de erros

          // ✅ MÚLTIPLAS ABAS PERMITIDAS: Não desconectar outras sessões
          // Apenas manter sessão ativa sem verificar exclusividade
        } else if (response.status === 401) {
          // ✅ MÚLTIPLAS ABAS PERMITIDAS: Não desconectar
          // Ignorar 401 de outras abas/dispositivos
          consecutiveErrors = 0;
        }
      } catch (error) {
        // Silenciar completamente erros de rede
        consecutiveErrors++;
      } finally {
        isCheckingSession = false;
      }
    };

    // ✅ Verificar a cada 10 segundos para detectar abas/dispositivos duplicados rapidamente
    const interval = setInterval(checkSession, 10000);
    
    return () => clearInterval(interval);
  }, [user, sessionToken]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      const storedSessionToken = localStorage.getItem('session_token');
      
      if (storedToken && storedUser && storedSessionToken) {
        try {
          const userData = JSON.parse(storedUser);
          
          // ✅ MÚLTIPLAS ABAS PERMITIDAS: Não invalida sessões anteriores
          // Apenas usa o token existente sem criar novo
          
          setSessionToken(storedSessionToken);
          setUser(userData);
          setToken(storedToken);
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
      
      // ✅ MÚLTIPLAS ABAS PERMITIDAS: Gerar token mas não invalidar outras sessões
      const newSessionToken = generateSessionToken();
      
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