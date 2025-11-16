import { Link } from "react-router-dom";
import "../styles/footer.css";
import logo from "../assets/icons/logo.png";

export default function Footer() {
  return (
    <nav className="footer-box">
      <div className="footer-box-left">
        <img src={logo} alt="Workly logo" className="logo-img" />
        <span>© Workly Inc.</span>
      </div>

      <div className="footer-box-right">
        <Link to="/dispute-terms">Terminos de Servicio</Link>
        <Link to="#">Politica de Privacidad</Link>
        <Link to="#">Acerca de Workly</Link>
      </div>
    </nav>
  );
}