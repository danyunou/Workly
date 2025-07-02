import { useEffect, useState } from "react";

export default function DisputeReview() {
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/disputes", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => setDisputes(data))
      .catch(err => console.error("Error al cargar disputas:", err));
  }, []);

  return (
    <div className="admin-section">
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
            <button>Ver detalles</button>
          </div>
        ))
      )}
    </div>
  );
}
