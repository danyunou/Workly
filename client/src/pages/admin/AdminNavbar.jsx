import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/admin.css";

export default function AdminNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-logo" onClick={() => navigate("/admin")}>
      
      </div>

      <div className="admin-navbar-actions">
        <button onClick={() => navigate("/admin/mensajes")}>Mensajes</button>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </nav>
  );
}
