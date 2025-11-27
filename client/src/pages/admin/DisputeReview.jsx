// src/pages/admin/DisputeReview.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/DisputeReview.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://workly-cy4b.onrender.com";

export default function DisputeReview() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 textos de resolución por disputa (id -> texto)
  const [resolutionTexts, setResolutionTexts] = useState({});
  // 🔹 feedback global en la página
  const [feedback, setFeedback] = useState(null);

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
        setFeedback({
          type: "error",
          text: "Ocurrió un error al cargar las disputas.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const handleResolutionChange = (disputeId, value) => {
    setResolutionTexts((prev) => ({
      ...prev,
      [disputeId]: value,
    }));
  };

  const handleReject = async (disputeId) => {
    const reason = (resolutionTexts[disputeId] || "").trim();
    if (!reason) {
      setFeedback({
        type: "warning",
        text: "Escribe un mensaje de resolución antes de rechazar la disputa.",
      });
      return;
    }

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

      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
      setResolutionTexts((prev) => {
        const copy = { ...prev };
        delete copy[disputeId];
        return copy;
      });

      setFeedback({
        type: "success",
        text: "Disputa rechazada. Se ha guardado la resolución y las partes fueron notificadas.",
      });
    } catch (err) {
      console.error("Error al rechazar disputa:", err);
      setFeedback({
        type: "error",
        text: "Ocurrió un error al rechazar la disputa.",
      });
    }
  };

  const handleAccept = async (disputeId) => {
    const reason = (resolutionTexts[disputeId] || "").trim();
    if (!reason) {
      setFeedback({
        type: "warning",
        text: "Escribe un mensaje de resolución antes de aceptar la disputa.",
      });
      return;
    }

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

      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
      setResolutionTexts((prev) => {
        const copy = { ...prev };
        delete copy[disputeId];
        return copy;
      });

      setFeedback({
        type: "success",
        text: "Disputa aceptada. El proyecto fue actualizado y las partes fueron notificadas.",
      });
    } catch (err) {
      console.error("Error al aceptar disputa:", err);
      setFeedback({
        type: "error",
        text: "Ocurrió un error al aceptar la disputa.",
      });
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
            Revisa el alcance (project_scopes), entregables, mensajes y el historial antes de
            tomar una decisión.
          </p>
        </div>

        {/* 🔹 Mensaje global dentro de la página */}
        {feedback && (
          <div className={`admin-alert admin-alert-${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        {disputes.length === 0 ? (
          <p>No hay disputas activas.</p>
        ) : (
          disputes.map((d) => {
            const recentMessages = (d.messages || []).slice(-5);
            const hasDeliverables = (d.deliverables || []).length > 0;
            const hasLogs = (d.logs || []).length > 0;

            // Formato de ID único de disputa
            const disputeCode = `DSP-${String(d.id).padStart(6, "0")}`;

            // Deliverables del scope
            const scopeLines = (d.scope_deliverables || "")
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line !== "");

            return (
              <div key={d.id} className="dispute-card">
                {/* CABECERA */}
                <div className="dispute-header">
                  <div>
                    <h4>
                      Disputa{" "}
                      <span className="dispute-id">{disputeCode}</span>
                    </h4>
                    <p className="dispute-project-title">
                      Proyecto #{d.project_id}
                      {d.project_title ? ` — ${d.project_title}` : ""}
                    </p>
                  </div>
                  <div className="dispute-header-right">
                    <span
                      className={`dispute-status badge-${d.dispute_status}`}
                    >
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
                      ? new Date(d.opened_at).toLocaleString("es-MX")
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

                {/* PROYECTO + SCOPE (project_scopes) */}
                <div className="dispute-section">
                  <h5>Proyecto y alcance</h5>

                  {d.project_description && (
                    <p>
                      <strong>Descripción del proyecto:</strong>{" "}
                      {d.project_description}
                    </p>
                  )}

                  <p>
                    <strong>Estado del proyecto:</strong>{" "}
                    {d.project_status || "—"}
                  </p>

                  {d.project_deadline && (
                    <p>
                      <strong>Fecha límite:</strong>{" "}
                      {new Date(
                        d.project_deadline
                      ).toLocaleDateString("es-MX")}
                    </p>
                  )}

                  {/* 🔹 Bloque de alcance desde project_scopes */}
                  {(d.scope_title ||
                    d.scope_description ||
                    scopeLines.length > 0) && (
                    <div className="scope-block">
                      <p className="scope-block-title">
                        <strong>
                          Alcance (última versión registrada en project_scopes)
                        </strong>
                      </p>

                      {d.scope_title && (
                        <p>
                          <strong>Título:</strong> {d.scope_title}
                        </p>
                      )}

                      {d.scope_description && (
                        <p>
                          <strong>Descripción:</strong>{" "}
                          {d.scope_description}
                        </p>
                      )}

                      {scopeLines.length > 0 && (
                        <>
                          <p>
                            <strong>Entregables:</strong>
                          </p>
                          <ul className="scope-deliverables-list">
                            {scopeLines.map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {d.scope_revision_limit != null && (
                        <p>
                          <strong>Límite de revisiones:</strong>{" "}
                          {d.scope_revision_limit}
                        </p>
                      )}

                      {d.scope_created_at && (
                        <p className="scope-meta">
                          <strong>Versión creada el:</strong>{" "}
                          {new Date(
                            d.scope_created_at
                          ).toLocaleString("es-MX")}
                        </p>
                      )}
                    </div>
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
                                ? new Date(
                                    del.created_at
                                  ).toLocaleString("es-MX")
                                : "—"}
                              {del.submitted_by && (
                                <> · Usuario #{del.submitted_by}</>
                              )}
                            </p>
                          </div>
                          <div className="dispute-list-right">
                            <span
                              className={`badge-deliverable badge-${
                                del.status || "pending"
                              }`}
                            >
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
                                  ? new Date(
                                      m.created_at
                                    ).toLocaleString("es-MX")
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
                                ? new Date(
                                    log.timestamp
                                  ).toLocaleString("es-MX")
                                : "—"}{" "}
                              · Usuario #{log.action_by}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ACCIONES ADMIN + MENSAJE DENTRO DE LA PÁGINA */}
                <div className="dispute-actions">
                  <div className="dispute-resolution-input">
                    <label>
                      Mensaje de resolución para las partes
                      <textarea
                        rows={3}
                        placeholder="Explica brevemente la decisión que estás tomando..."
                        value={resolutionTexts[d.id] || ""}
                        onChange={(e) =>
                          handleResolutionChange(d.id, e.target.value)
                        }
                      />
                    </label>
                    <p className="dispute-resolution-note">
                      Este texto se guardará como resolución y se mostrará al
                      cliente y al freelancer.
                    </p>
                  </div>
                  <div className="dispute-actions-buttons">
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
