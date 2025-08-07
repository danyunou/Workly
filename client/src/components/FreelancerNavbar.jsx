import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import logo from "../assets/icons/logo.png";
import profile from "../assets/icons/profile.png";
import notifications from "../assets/icons/notifications.png";
import chats from "../assets/icons/chats.png";

export default function FreelancerNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/FreelancerDashboard" className="logo-container">
          <img src={logo} alt="Workly logo" className="logo-img" />
        </Link>
      </div>

      <div className="navbar-right">
        <span>🌐 Español</span>
        <Link to="/Notifications" className="logo-container">
          <img src={notifications} />
        </Link>
        <Link to="/Chats" className="logo-container">
          <img src={chats} className="logo-img" />
        </Link>

        {/* MENÚ DESPLEGABLE */}
        <div className="profile-dropdown" ref={menuRef}>
          <img
            src={profile}
            alt="Perfil"
            className="logo-img profile-icon"
            onClick={toggleMenu}
          />
          {menuOpen && (
            <div className="dropdown-menu">
              <Link to="/freelancer-profile">Perfil</Link>
              <Link to="/my-projects">Mis proyectos</Link>
              <Link to="/MyServices">Mis servicios</Link>
              <Link to="/CreateService">Crear servicio</Link>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
