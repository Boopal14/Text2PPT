import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  fullName?: string;
  email?: string;
  mobile?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (fullName: string, username: string, email: string, mobile: string, password: string, confirmPassword: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch('http://127.0.0.1:8000/signin', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const userData = await response.json();
        const user = { 
          username, 
          fullName: userData.fullName,
          email: userData.email,
          mobile: userData.mobile
        };
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    fullName: string, 
    username: string, 
    email: string, 
    mobile: string, 
    password: string, 
    confirmPassword: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullname', fullName);
      formData.append('username', username);
      formData.append('email', email);
      formData.append('mobile', mobile);
      formData.append('password', password);
      formData.append('re_enter_password', confirmPassword);

      const response = await fetch('http://127.0.0.1:8000/signup', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};