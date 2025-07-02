import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";
import logo from "../assets/icons/logo.png";
import profile from "../assets/icons/profile.png";
import notifications from "../assets/icons/notifications.png";
import chats from "../assets/icons/chats.png";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Cierra el menú si haces clic fuera
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
        <Link to="/Home" className="logo-container">
          <img src={logo} alt="Workly logo" className="logo-img" />
        </Link>
      </div>

      <div className="navbar-right">
        <Link to="/freelancer-register">Conviértete en vendedor</Link>
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
              <Link to="/user-profile">Perfil</Link>
              <Link to="/MyProposals">Mis propuestas</Link>
              <Link to="/PublishProposal">Publicar propuesta</Link>
              <Link to="/freelancer-register">Conviértete en vendedor</Link>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
