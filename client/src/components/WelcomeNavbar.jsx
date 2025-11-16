// client/src/components/WelcomeNavbar.jsx
import { Link } from "react-router-dom";
import "../styles/welcomeNavbar.css";
import logo from "../assets/icons/logo.png"; // Asegúrate de que la ruta sea correcta

export default function WelcomeNavbar() {
  return (
    <nav className="welcome-navbar">
      <div className="welcome-navbar-left">
        <Link to="/" className="logo-container">
          <img src={logo} alt="Workly logo" className="logo-img" />
        </Link>
      </div>

      <div className="welcome-navbar-right">
        <Link to="/login">Iniciar sesión</Link>
        <Link to="/register" className="btn-outline">Únete a nosotros</Link>
      </div>
    </nav>
  );
}
