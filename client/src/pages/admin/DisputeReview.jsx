// DisputeReview.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/DisputeReview.css";

export default function DisputeReview() {
  const [disputes, setDisputes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/admin/disputes", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => setDisputes(data))
      .catch(err => console.error("Error al cargar disputas:", err));
  }, []);

  const handleReject = async (disputeId) => {
    const reason = prompt("Motivo para rechazar la disputa:");
    if (!reason) return;

    try {
      await fetch(`https://worklyworkly-cy4b-backend.onrender.com/api/admin/disputes/${disputeId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ reason }),
      });

      alert("Disputa rechazada y cliente notificado");
      setDisputes(prev => prev.filter(d => d.id !== disputeId));
    } catch (err) {
      console.error("Error al rechazar disputa:", err);
      alert("Ocurrió un error");
    }
  };

  const handleAccept = async (disputeId) => {
    const reason = prompt("Mensaje para el freelancer al reabrir el proyecto:");
    if (!reason) return;

    try {
      await fetch(`https://worklyworkly-cy4b-backend.onrender.com/api/admin/disputes/${disputeId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ reason }),
      });

      alert("Disputa aceptada, proyecto reabierto");
      setDisputes(prev => prev.filter(d => d.id !== disputeId));
    } catch (err) {
      console.error("Error al aceptar disputa:", err);
      alert("Ocurrió un error");
    }
  };

  return (
    <div className="dispute-page">
      <div className="dispute-wrapper">
        <h2>Disputas abiertas</h2>

        {disputes.length === 0 ? (
          <p>No hay disputas activas.</p>
        ) : (
          disputes.map(d => (
            <div key={d.id} className="dispute-card">
              <h4>ID Proyecto: {d.project_id}</h4>
              <p><strong>Descripción:</strong> {d.description}</p>
              <p><strong>Abierto por:</strong> {d.opened_by}</p>
              <p><strong>Fecha:</strong> {new Date(d.opened_at).toLocaleString()}</p>

              <button onClick={() => handleAccept(d.id)}>Aceptar disputa</button>
              <button onClick={() => handleReject(d.id)}>Rechazar disputa</button>
            </div>
          ))
        )}
      </div>

      <button className="back-button" onClick={() => navigate("/admin")}>
        ← Volver al panel de administrador
      </button>
    </div>
  );
}
