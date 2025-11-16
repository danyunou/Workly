import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/admin.css";

export default function AdminNavbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="admin-navbar">
      <div
        className="admin-navbar-logo"
        onClick={() => navigate("/admin")}
      >
        Workly <span>Admin</span>
      </div>

      <div className="admin-navbar-actions">
        <button type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}