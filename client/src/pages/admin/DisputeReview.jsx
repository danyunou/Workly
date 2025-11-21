// src/pages/admin/DisputeReview.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/DisputeReview.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://workly-cy4b.onrender.com";

export default function DisputeReview() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/disputes`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) {
          throw new Error("Error al obtener disputas");
        }

        const data = await res.json();
        setDisputes(data);
      } catch (err) {
        console.error("Error al cargar disputas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const handleReject = async (disputeId) => {
    const reason = prompt(
      "Motivo para rechazar la disputa (se enviará en la resolución):"
    );
    if (!reason) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/disputes/${disputeId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) {
        throw new Error("Error al rechazar la disputa");
      }

      alert("Disputa rechazada y partes notificadas");
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
    } catch (err) {
      console.error("Error al rechazar disputa:", err);
      alert("Ocurrió un error al rechazar la disputa");
    }
  };

  const handleAccept = async (disputeId) => {
    const reason = prompt(
      "Mensaje / resolución al aceptar la disputa (se guardará como resolución):"
    );
    if (!reason) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/disputes/${disputeId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) {
        throw new Error("Error al aceptar la disputa");
      }

      alert("Disputa aceptada, proyecto actualizado y partes notificadas");
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
    } catch (err) {
      console.error("Error al aceptar disputa:", err);
      alert("Ocurrió un error al aceptar la disputa");
    }
  };

  if (loading) {
    return (
      <div className="dispute-page">
        <div className="dispute-wrapper">
          <h2>Disputas abiertas</h2>
          <p>Cargando disputas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dispute-page">
      <div className="dispute-wrapper">
        <div className="dispute-header-main">
          <h2>Disputas abiertas</h2>
          <p className="dispute-subtitle">
            Revisa el alcance, entregables, mensajes y el historial antes de
            tomar una decisión.
          </p>
        </div>

        {disputes.length === 0 ? (
          <p>No hay disputas activas.</p>
        ) : (
          disputes.map((d) => {
            const recentMessages = (d.messages || []).slice(-5);
            const hasDeliverables = (d.deliverables || []).length > 0;
            const hasLogs = (d.logs || []).length > 0;

            return (
              <div key={d.id} className="dispute-card">
                {/* CABECERA */}
                <div className="dispute-header">
                  <div>
                    <h4>Proyecto #{d.project_id}</h4>
                    {d.project_title && (
                      <p className="dispute-project-title">
                        {d.project_title}
                      </p>
                    )}
                  </div>
                  <div className="dispute-header-right">
                    <span className={`dispute-status badge-${d.dispute_status}`}>
                      {d.dispute_status}
                    </span>
                    {d.project_budget && (
                      <span className="badge-amount">
                        ${d.project_budget}
                      </span>
                    )}
                  </div>
                </div>

                {/* DETALLE DISPUTA */}
                <div className="dispute-section">
                  <h5>Detalle de la disputa</h5>
                  <p>
                    <strong>Descripción de la disputa:</strong>{" "}
                    {d.dispute_description || d.description}
                  </p>
                  <p>
                    <strong>Abierta por:</strong>{" "}
                    {d.opened_by_name || d.opened_by_email || d.opened_by}
                  </p>
                  <p>
                    <strong>Fecha de apertura:</strong>{" "}
                    {d.opened_at
                      ? new Date(d.opened_at).toLocaleString()
                      : "—"}
                  </p>
                  <p>
                    <strong>Política aceptada:</strong>{" "}
                    {d.policy_accepted ? "Sí" : "No"}
                  </p>
                  {d.resolution && (
                    <p className="dispute-resolution">
                      <strong>Resolución actual:</strong> {d.resolution}
                    </p>
                  )}
                </div>

                {/* PROYECTO + SCOPE */}
                <div className="dispute-section">
                  <h5>Proyecto</h5>
                  {d.project_description && (
                    <p>
                      <strong>Descripción del proyecto:</strong>{" "}
                      {d.project_description}
                    </p>
                  )}
                  {d.project_scope && (
                    <p>
                      <strong>Alcance / scope acordado:</strong>{" "}
                      {d.project_scope}
                    </p>
                  )}
                  <p>
                    <strong>Estado del proyecto:</strong>{" "}
                    {d.project_status || "—"}
                  </p>
                  {d.project_deadline && (
                    <p>
                      <strong>Fecha límite:</strong>{" "}
                      {new Date(d.project_deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* CLIENTE / FREELANCER */}
                <div className="dispute-grid">
                  <div className="dispute-section">
                    <h5>Cliente</h5>
                    <p>
                      <strong>Nombre:</strong> {d.client_name || "—"}
                    </p>
                    <p>
                      <strong>Email:</strong> {d.client_email || "—"}
                    </p>
                  </div>

                  <div className="dispute-section">
                    <h5>Freelancer</h5>
                    <p>
                      <strong>Nombre:</strong> {d.freelancer_name || "—"}
                    </p>
                      <p>
                      <strong>Email:</strong> {d.freelancer_email || "—"}
                    </p>
                  </div>
                </div>

                {/* ENTREGABLES */}
                <div className="dispute-section">
                  <h5>
                    Entregables{" "}
                    <span className="pill-count">
                      {(d.deliverables || []).length}
                    </span>
                  </h5>

                  {!hasDeliverables ? (
                    <p className="dispute-muted">
                      No hay entregables registrados para este proyecto.
                    </p>
                  ) : (
                    <ul className="dispute-list">
                      {d.deliverables.map((del) => (
                        <li key={del.id} className="dispute-list-item">
                          <div>
                            <p className="dispute-list-title">
                              {del.description || "Entregable sin descripción"}
                            </p>
                            <p className="dispute-list-meta">
                              Subido:{" "}
                              {del.created_at
                                ? new Date(del.created_at).toLocaleString()
                                : "—"}
                              {del.submitted_by && (
                                <> · Usuario #{del.submitted_by}</>
                              )}
                            </p>
                          </div>
                          <div className="dispute-list-right">
                            <span className={`badge-deliverable badge-${del.status || "pending"}`}>
                              {del.status || "pending"}
                            </span>
                            {del.file_url && (
                              <a
                                href={del.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="link-small"
                              >
                                Ver archivo
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* MENSAJES RECIENTES */}
                <div className="dispute-section">
                  <h5>
                    Mensajes recientes{" "}
                    <span className="pill-count">
                      {recentMessages.length}
                    </span>
                  </h5>

                  {recentMessages.length === 0 ? (
                    <p className="dispute-muted">
                      No hay mensajes registrados en este proyecto.
                    </p>
                  ) : (
                    <ul className="dispute-list dispute-messages">
                      {recentMessages.map((m) => {
                        let senderLabel = `Usuario #${m.sender_id}`;
                        if (m.sender_id === d.client_id) senderLabel = "Cliente";
                        if (m.sender_id === d.freelancer_id)
                          senderLabel = "Freelancer";

                        return (
                          <li key={m.id} className="dispute-list-item">
                            <div>
                              <p className="dispute-list-title">
                                <strong>{senderLabel}:</strong> {m.message}
                              </p>
                              <p className="dispute-list-meta">
                                {m.created_at
                                  ? new Date(m.created_at).toLocaleString()
                                  : "—"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* HISTORIAL / LOGS */}
                <div className="dispute-section">
                  <h5>
                    Historial de acciones{" "}
                    <span className="pill-count">
                      {(d.logs || []).length}
                    </span>
                  </h5>

                  {!hasLogs ? (
                    <p className="dispute-muted">
                      No hay acciones registradas aún.
                    </p>
                  ) : (
                    <ul className="dispute-list dispute-logs">
                      {(d.logs || []).map((log) => (
                        <li key={log.id} className="dispute-list-item">
                          <div>
                            <p className="dispute-list-title">
                              <strong>{log.action_type}</strong> –{" "}
                              {log.action_description}
                            </p>
                            <p className="dispute-list-meta">
                              {log.timestamp
                                ? new Date(log.timestamp).toLocaleString()
                                : "—"}{" "}
                              · Usuario #{log.action_by}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ACCIONES ADMIN */}
                <div className="dispute-actions">
                  <button
                    className="btn-accept"
                    onClick={() => handleAccept(d.id)}
                  >
                    Aceptar disputa
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(d.id)}
                  >
                    Rechazar disputa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="back-button" onClick={() => navigate("/admin")}>
        ← Volver al panel de administrador
      </button>
    </div>
  );
}
