// src/pages/MyRequests.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/MyRequests.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const MyRequests = () => {
  const [serviceRequests, setServiceRequests] = useState([]);

  // solo un item abierto a la vez
  const [expandedItem, setExpandedItem] = useState(null); // {type:'service', id:number}

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notificaciones en la página
  const [notification, setNotification] = useState(null);
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000); // se oculta a los 4s
  };

  // Modal reenviar solicitud a servicio
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
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

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const serviceRes = await api.get("/service-requests/by-client");

      // Solo mostramos solicitudes que NO estén aceptadas
      const visibleService = serviceRes.data.filter(
        (sr) => sr.status !== "accepted"
      );

      setServiceRequests(visibleService);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
      setError("Ocurrió un error al cargar tus solicitudes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // helpers
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

  const statusLabelServiceRequest = (status) => {
    switch (status) {
      case "pending_freelancer":
        return "Pendiente del freelancer";
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
      case "rejected":
        return "status-chip danger";
      default:
        return "status-chip neutral";
    }
  };

  // toggles (accordion)
  const toggleServiceItem = (id) => {
    const isSame =
      expandedItem && expandedItem.type === "service" && expandedItem.id === id;

    if (isSame) {
      setExpandedItem(null);
    } else {
      setExpandedItem({ type: "service", id });
    }
  };

  // aceptar propuesta (cuando venga de custom antes, pero lo dejamos por si tu back usa este endpoint
  const handleAcceptProposal = async (proposalId) => {
    try {
      await api.post(`/proposals/accept/${proposalId}`);
      showNotification(
        "success",
        "Propuesta aceptada. El proyecto y el chat se crearán y podrás gestionarlo desde la sección de Proyectos."
      );
      navigate("/projects");
    } catch (error) {
      console.error("Error al aceptar propuesta:", error);
      showNotification("error", "Hubo un error al aceptar la propuesta.");
    }
  };

  // reenvío
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
    setIsResendModalOpen(true);
  };

  const closeResendForm = () => {
    setIsResendModalOpen(false);
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

      setServiceRequests((prev) =>
        prev.map((sr) =>
          sr.id === resendForm.requestId ? { ...sr, ...res.data.request } : sr
        )
      );

      closeResendForm();
      showNotification("success", "Solicitud reenviada correctamente.");
    } catch (err) {
      console.error("Error al reenviar solicitud:", err);
      showNotification("error", "Ocurrió un error al reenviar la solicitud.");
      setResendForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  // navegación
  const goToService = (serviceId) => {
    if (!serviceId) return;
    // ajusta a tu ruta real de detalle de servicio
    navigate(`/service/${serviceId}`);
  };

  const goToFreelancer = (username) => {
    if (!username) return;
    navigate(`/freelancer/${username}`);
  };

  const handleRefresh = () => {
    fetchData();
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
                Revisa las solicitudes que has enviado directamente a servicios.
                Desde aquí puedes ver su estado, los motivos de rechazo y
                reenviarlas si lo necesitas.
              </p>
            </div>

            <div className="my-requests-header-right">
              <div className="my-requests-metrics">
                <div className="metric-card">
                  <span className="metric-label">
                    Solicitudes a servicios (activas)
                  </span>
                  <span className="metric-value">
                    {serviceRequests.length}
                  </span>
                </div>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="btn-outline header-btn"
                  onClick={handleRefresh}
                >
                  Actualizar
                </button>
              </div>
            </div>
          </header>

          {/* Notificación en la página */}
          {notification && (
            <div
              className={`page-notification ${
                notification.type === "success"
                  ? "page-notification-success"
                  : "page-notification-error"
              }`}
            >
              {notification.message}
            </div>
          )}

          {error && <div className="my-requests-error">{error}</div>}

          <div className="my-requests-sections">
            {/* SOLO SERVICE REQUESTS */}
            <section className="requests-section">
              <div className="section-header">
                <div>
                  <h2>Solicitudes enviadas a servicios</h2>
                  <p>
                    Mensajes que enviaste directamente a servicios específicos.
                    Solo se muestran las solicitudes enviadas o rechazadas (las
                    aceptadas ya se transforman en proyectos).
                  </p>
                </div>
              </div>

              {serviceRequests.length === 0 ? (
                <div className="empty-state">
                  <h3>No tienes solicitudes activas a servicios</h3>
                  <p>
                    Cuando contactes a un freelancer desde un servicio, tus
                    solicitudes aparecerán aquí.
                  </p>
                </div>
              ) : (
                <ul className="request-cards-list">
                  {serviceRequests.map((sr) => {
                    const isExpanded =
                      expandedItem?.type === "service" &&
                      expandedItem.id === sr.id;

                    return (
                      <li
                        key={sr.id}
                        className={`request-card service-request-card ${
                          isExpanded ? "request-card-expanded" : ""
                        }`}
                      >
                        <div className="request-card-main">
                          <div>
                            <div className="card-top-row">
                              <span className="badge badge-type">Servicio</span>
                              <span
                                className={statusClassServiceRequest(sr.status)}
                              >
                                {statusLabelServiceRequest(sr.status)}
                              </span>
                            </div>

                            <button
                              className="service-title-link"
                              onClick={() => goToService(sr.service_id)}
                            >
                              {sr.service_title || "Servicio"}
                            </button>

                            <div className="service-request-freelancer">
                              <span className="meta-label meta-label-inline">
                                Freelancer:
                              </span>
                              <button
                                className="freelancer-link"
                                onClick={() =>
                                  goToFreelancer(sr.freelancer_username)
                                }
                              >
                                {sr.freelancer_name || "Ver perfil"}
                              </button>
                            </div>
                          </div>

                          <button
                            className="toggle-details-btn"
                            onClick={() => toggleServiceItem(sr.id)}
                          >
                            {isExpanded ? "Ocultar" : "Ver solicitud"}
                          </button>
                        </div>

                        {isExpanded && (
                          <>
                            <div className="request-card-meta">
                              <div>
                                <span className="meta-label">
                                  Presupuesto propuesto
                                </span>
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
                              <span className="meta-label">
                                Mensaje enviado
                              </span>
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

                                <button
                                  className="btn-light"
                                  onClick={() => openResendForm(sr)}
                                >
                                  Reenviar solicitud
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* MODAL REENVIAR SOLICITUD */}
      {isResendModalOpen && resendForm.requestId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reenviar solicitud</h3>
              <button className="modal-close" onClick={closeResendForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleResendSubmit} className="modal-body">
              <label className="form-field">
                <span>Mensaje para el freelancer</span>
                <textarea
                  rows={3}
                  value={resendForm.message}
                  onChange={(e) =>
                    handleChangeResendField("message", e.target.value)
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

              <div className="modal-footer">
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
                  {resendForm.submitting ? "Reenviando..." : "Confirmar reenvío"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MyRequests;
