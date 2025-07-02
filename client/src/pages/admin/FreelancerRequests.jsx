import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/FreelancerRequests.css";

export default function FreelancerRequests() {
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/verifications", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Error ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar solicitudes:", err.message);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="requests-wrapper">
      <h2>Solicitudes de conversión a freelancer</h2>

      <div className="requests-scroll-container">
        {requests.length === 0 ? (
          <p className="no-requests">No hay solicitudes pendientes.</p>
        ) : (
          <div className="requests-list">
            {requests.map((r) => (
              <div key={r.id} className="request-card">
                <h4>{r.full_name} (@{r.username})</h4>
                <p><strong>Correo:</strong> {r.email}</p>
                <p><strong>Subido:</strong> {new Date(r.created_at).toLocaleString()}</p>
                <a href={r.file_url} target="_blank" rel="noreferrer">Ver documento</a>
                <div className="btns">
                  <button className="approve">Aprobar</button>
                  <button className="reject">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="back-button" onClick={() => navigate("/admin")}>
        ← Volver al panel de administrador
      </button>
    </div>
  );
}
