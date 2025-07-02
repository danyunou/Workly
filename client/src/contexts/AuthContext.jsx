import { createContext, useContext, useEffect, useState } from "react";

// Crear contexto
const AuthContext = createContext();

// Hook para acceder fácilmente
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar token y usuario desde localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
  if (user) {
    console.log("Usuario en AuthContext:", user); 
  }
  }, [user]);


  const login = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role_id === 3;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        login,
        logout,
        isAuthenticated,
        isAdmin,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
