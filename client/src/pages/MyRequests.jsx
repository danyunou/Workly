// src/pages/MyRequests.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/MyRequests.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const MyRequests = () => {
  const [customRequests, setCustomRequests] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [proposals, setProposals] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Para formulario de reenvío de solicitudes de servicio
  const [resendForm, setResendForm] = useState({
    requestId: null,
    message: "",
    proposed_deadline: "",
    proposed_budget: "",
    submitting: false,
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: "https://workly-cy4b.onrender.com/api",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [customRes, serviceRes] = await Promise.all([
          api.get("/requests/by-client"),
          api.get("/service-requests/by-client"),
        ]);

        // Opcional: ocultar requests con proyecto ya creado (status 'hired')
        const visibleCustom = customRes.data.filter(
          (req) => req.status !== "hired"
        );

        setCustomRequests(visibleCustom);
        setServiceRequests(serviceRes.data);
      } catch (err) {
        console.error("Error cargando solicitudes:", err);
        setError("Ocurrió un error al cargar tus solicitudes.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleRequestDetails = async (requestId) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
      return;
    }

    try {
      const res = await api.get(`/proposals/by-request/${requestId}`);

      // Opcional: ocultar propuestas aceptadas
      const filtered = res.data.filter((p) => p.status !== "accepted");

      setProposals((prev) => ({ ...prev, [requestId]: filtered }));
      setExpandedRequestId(requestId);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    try {
      await api.post(`/proposals/accept/${proposalId}`);
      alert(
        "Propuesta aceptada. El proyecto y el chat se crearán y podrás gestionarlo desde la sección de Proyectos."
      );
      navigate("/projects");
    } catch (error) {
      console.error("Error al aceptar propuesta:", error);
      alert("Hubo un error al aceptar la propuesta.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "Sin definir";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Sin definir";
    return d.toLocaleDateString();
  };

  const formatCurrency = (value) => {
    if (value == null) return "Sin definir";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return `$${num.toLocaleString()}`;
  };

  const statusLabelRequest = (status) => {
    switch (status) {
      case "open":
        return "Abierta";
      case "hired":
        return "Contratado";
      case "closed":
        return "Cerrada";
      default:
        return status || "Sin estado";
    }
  };

  const statusLabelServiceRequest = (status) => {
    switch (status) {
      case "pending_freelancer":
        return "Pendiente del freelancer";
      case "accepted":
        return "Aceptada";
      case "rejected":
        return "Rechazada";
      default:
        return status || "Sin estado";
    }
  };

  const statusClassServiceRequest = (status) => {
    switch (status) {
      case "pending_freelancer":
        return "status-chip pending";
      case "accepted":
        return "status-chip success";
      case "rejected":
        return "status-chip danger";
      default:
        return "status-chip";
    }
  };

  // --- Reenviar solicitud de servicio ---

  const openResendForm = (sr) => {
    setResendForm({
      requestId: sr.id,
      message: sr.message || "",
      proposed_deadline: sr.proposed_deadline
        ? sr.proposed_deadline.slice(0, 10)
        : "",
      proposed_budget: sr.proposed_budget || "",
      submitting: false,
    });
  };

  const closeResendForm = () => {
    setResendForm({
      requestId: null,
      message: "",
      proposed_deadline: "",
      proposed_budget: "",
      submitting: false,
    });
  };

  const handleChangeResendField = (field, value) => {
    setResendForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResendSubmit = async (e) => {
    e.preventDefault();
    if (!resendForm.requestId) return;

    try {
      setResendForm((prev) => ({ ...prev, submitting: true }));

      const payload = {
        message: resendForm.message,
        proposed_deadline: resendForm.proposed_deadline || null,
        proposed_budget:
          resendForm.proposed_budget === ""
            ? null
            : Number(resendForm.proposed_budget),
      };

      const res = await api.post(
        `/service-requests/${resendForm.requestId}/resend`,
        payload
      );

      // Actualizar lista en memoria
      setServiceRequests((prev) =>
        prev.map((sr) =>
          sr.id === resendForm.requestId ? { ...sr, ...res.data.request } : sr
        )
      );

      closeResendForm();
      alert("Solicitud reenviada correctamente.");
    } catch (err) {
      console.error("Error al reenviar solicitud:", err);
      alert("Ocurrió un error al reenviar la solicitud.");
      setResendForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const goToService = (serviceId) => {
    if (!serviceId) return;
    // Suponiendo que la ruta de detalle de servicio exista
    navigate(`/services/${serviceId}`);
  };

  const goToFreelancer = (username) => {
    if (!username) return;
    navigate(`/freelancer/${username}`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="my-requests-page">
          <div className="my-requests-container">
            <p className="my-requests-loading">Cargando tus solicitudes...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="my-requests-page">
        <div className="my-requests-container">
          <header className="my-requests-header">
            <div>
              <h1 className="my-requests-title">Mis solicitudes</h1>
              <p className="my-requests-subtitle">
                Revisa las propuestas que publicaste y las solicitudes que has
                enviado directamente a servicios. Desde aquí puedes aceptar
                freelancers o reenviar solicitudes rechazadas.
              </p>
            </div>
            <div className="my-requests-metrics">
              <div className="metric-card">
                <span className="metric-label">Custom requests</span>
                <span className="metric-value">{customRequests.length}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Solicitudes a servicios</span>
                <span className="metric-value">{serviceRequests.length}</span>
              </div>
            </div>
          </header>

          {error && <div className="my-requests-error">{error}</div>}

          <div className="my-requests-sections">
            {/* ==== SECCIÓN 1: CUSTOM REQUESTS ==== */}
            <section className="requests-section">
              <div className="section-header">
                <h2>Solicitudes personalizadas</h2>
                <p>
                  Publicaciones abiertas a toda la comunidad de freelancers.
                  Aquí puedes revisar las propuestas recibidas.
                </p>
              </div>

              {customRequests.length === 0 ? (
                <div className="empty-state">
                  <h3>No tienes solicitudes personalizadas aún</h3>
                  <p>
                    Crea una nueva propuesta para recibir ofertas de varios
                    freelancers al mismo tiempo.
                  </p>
                </div>
              ) : (
                <ul className="request-cards-list">
                  {customRequests.map((req) => (
                    <li key={req.id} className="request-card">
                      <div className="request-card-header">
                        <div>
                          <h3 className="request-card-title">{req.title}</h3>
                          <p className="request-card-description">
                            {req.description}
                          </p>
                        </div>
                        <span className="status-chip neutral">
                          {statusLabelRequest(req.status)}
                        </span>
                      </div>

                      <div className="request-card-meta">
                        <div>
                          <span className="meta-label">Presupuesto</span>
                          <span className="meta-value">
                            {formatCurrency(req.budget)}
                          </span>
                        </div>
                        <div>
                          <span className="meta-label">
                            Fecha de entrega deseada
                          </span>
                          <span className="meta-value">
                            {formatDate(req.deadline)}
                          </span>
                        </div>
                        <div>
                          <span className="meta-label">Propuestas</span>
                          <span className="meta-value">
                            {proposals[req.id]?.length ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="request-card-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => toggleRequestDetails(req.id)}
                        >
                          {expandedRequestId === req.id
                            ? "Ocultar propuestas"
                            : "Ver propuestas"}
                        </button>
                      </div>

                      {expandedRequestId === req.id && (
                        <div className="proposal-section">
                          <h4>
                            Propuestas (
                            {proposals[req.id]?.length || 0})
                          </h4>
                          {proposals[req.id]?.length > 0 ? (
                            <ul className="proposal-list">
                              {proposals[req.id].map((prop) => (
                                <li
                                  key={prop.id}
                                  className="proposal-card-item"
                                >
                                  <div className="proposal-header">
                                    <div>
                                      <p className="proposal-freelancer">
                                        <strong>Freelancer:</strong>{" "}
                                        <button
                                          className="link-button"
                                          onClick={() =>
                                            goToFreelancer(
                                              prop.freelancer_username
                                            )
                                          }
                                        >
                                          {prop.freelancer_name ||
                                            "Ver perfil"}
                                        </button>
                                      </p>
                                      <p className="proposal-message">
                                        {prop.message}
                                      </p>
                                    </div>
                                    <span className="status-chip neutral">
                                      {prop.status || "Pendiente"}
                                    </span>
                                  </div>

                                  <div className="proposal-meta">
                                    <div>
                                      <span className="meta-label">
                                        Presupuesto propuesto
                                      </span>
                                      <span className="meta-value">
                                        {formatCurrency(
                                          prop.proposed_price ??
                                            prop.offer_budget
                                        )}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="meta-label">
                                        Plazo estimado
                                      </span>
                                      <span className="meta-value">
                                        {prop.proposed_deadline
                                          ? formatDate(prop.proposed_deadline)
                                          : prop.estimated_days
                                          ? `${prop.estimated_days} días`
                                          : "Sin definir"}
                                      </span>
                                    </div>
                                  </div>

                                  {prop.status === "pending" && (
                                    <div className="proposal-actions">
                                      <button
                                        className="btn-primary"
                                        onClick={() =>
                                          handleAcceptProposal(prop.id)
                                        }
                                      >
                                        Aceptar propuesta
                                      </button>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="no-proposals">
                              No hay propuestas aún.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ==== SECCIÓN 2: SERVICE REQUESTS ==== */}
            <section className="requests-section">
              <div className="section-header">
                <h2>Solicitudes enviadas a servicios</h2>
                <p>
                  Mensajes que enviaste directamente a servicios específicos.
                  Puedes ver el estado y reenviar las que fueron rechazadas.
                </p>
              </div>

              {serviceRequests.length === 0 ? (
                <div className="empty-state">
                  <h3>No has enviado solicitudes a servicios</h3>
                  <p>
                    Cuando contactes a un freelancer desde un servicio, tus
                    solicitudes aparecerán aquí.
                  </p>
                </div>
              ) : (
                <ul className="request-cards-list">
                  {serviceRequests.map((sr) => (
                    <li key={sr.id} className="request-card">
                      <div className="request-card-header">
                        <div>
                          <button
                            className="service-title-button"
                            onClick={() => goToService(sr.service_id)}
                          >
                            {sr.service_title || "Servicio"}
                          </button>
                          <p className="request-card-description">
                            <span className="meta-label">Freelancer:</span>{" "}
                            <button
                              className="link-button"
                              onClick={() =>
                                goToFreelancer(sr.freelancer_username)
                              }
                            >
                              {sr.freelancer_name || "Ver perfil"}
                            </button>
                          </p>
                        </div>
                        <span
                          className={statusClassServiceRequest(sr.status)}
                        >
                          {statusLabelServiceRequest(sr.status)}
                        </span>
                      </div>

                      <div className="request-card-meta">
                        <div>
                          <span className="meta-label">Presupuesto propuesto</span>
                          <span className="meta-value">
                            {formatCurrency(sr.proposed_budget)}
                          </span>
                        </div>
                        <div>
                          <span className="meta-label">
                            Fecha de entrega deseada
                          </span>
                          <span className="meta-value">
                            {formatDate(sr.proposed_deadline)}
                          </span>
                        </div>
                        <div>
                          <span className="meta-label">Revisión</span>
                          <span className="meta-value">
                            {sr.revision || 0}
                          </span>
                        </div>
                      </div>

                      <div className="service-request-message">
                        <span className="meta-label">Mensaje enviado</span>
                        <p>{sr.message || "Sin mensaje."}</p>
                      </div>

                      {sr.status === "rejected" && (
                        <div className="rejection-box">
                          {sr.rejection_reason && (
                            <p className="rejection-reason">
                              <strong>Motivo del rechazo:</strong>{" "}
                              {sr.rejection_reason}
                            </p>
                          )}

                          {resendForm.requestId !== sr.id ? (
                            <button
                              className="btn-secondary"
                              onClick={() => openResendForm(sr)}
                            >
                              Reenviar solicitud
                            </button>
                          ) : (
                            <form
                              className="resend-form"
                              onSubmit={handleResendSubmit}
                            >
                              <h4>Reenviar solicitud</h4>
                              <label className="form-field">
                                <span>Mensaje para el freelancer</span>
                                <textarea
                                  rows={3}
                                  value={resendForm.message}
                                  onChange={(e) =>
                                    handleChangeResendField(
                                      "message",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                              </label>

                              <div className="form-row">
                                <label className="form-field">
                                  <span>Fecha de entrega deseada</span>
                                  <input
                                    type="date"
                                    value={resendForm.proposed_deadline}
                                    onChange={(e) =>
                                      handleChangeResendField(
                                        "proposed_deadline",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                                <label className="form-field">
                                  <span>Presupuesto (opcional)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={resendForm.proposed_budget}
                                    onChange={(e) =>
                                      handleChangeResendField(
                                        "proposed_budget",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <div className="resend-form-actions">
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  onClick={closeResendForm}
                                  disabled={resendForm.submitting}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="btn-primary"
                                  disabled={resendForm.submitting}
                                >
                                  {resendForm.submitting
                                    ? "Reenviando..."
                                    : "Confirmar reenvío"}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default MyRequests;
