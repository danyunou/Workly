import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Validar acceso para administradores
  if (requiredRole === "admin" && user?.role_id !== 3) {
    return <Navigate to="/home" />;
  }

  // Validar acceso para freelancers
  if (requiredRole === "freelancer" && user?.role_id !== 2) {
    return <Navigate to="/home" />;
  }

  return children;
}
