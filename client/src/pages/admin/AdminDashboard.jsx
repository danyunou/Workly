import { Link } from "react-router-dom";
import "../../styles/admin.css";

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Panel de Administración</h2>
        <p>Gestiona las solicitudes, disputas y verificaciones</p>
      </div>

      <div className="admin-sections">
        <Link to="/admin/disputas" className="admin-section">
          <h3>Revisar Disputas</h3>
          <p>Consulta y resuelve disputas abiertas entre usuarios.</p>
        </Link>

        <Link to="/admin/solicitudes" className="admin-section">
          <h3>Solicitudes de Freelancer</h3>
          <p>Aprueba o rechaza solicitudes de verificación de freelancers.</p>
        </Link>
      </div>
    </div>
  );
}
