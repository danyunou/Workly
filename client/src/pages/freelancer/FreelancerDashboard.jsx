// src/pages/freelancer/FreelancerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FreelancerNavbar from "../../components/FreelancerNavbar";
import "../../styles/freelancerDashboard.css";

export default function FreelancerDashboard() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 estado para el modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // 🔹 estado para aceptar solicitud / crear proyecto
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [serviceRes, customRes] = await Promise.all([
          fetch(
            "https://workly-cy4b.onrender.com/api/service-requests/freelancer",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
          fetch("https://workly-cy4b.onrender.com/api/requests/by-freelancer", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!serviceRes.ok) {
          throw new Error("Error al obtener solicitudes de tus servicios");
        }
        if (!customRes.ok) {
          throw new Error("Error al obtener custom requests");
        }

        const serviceData = await serviceRes.json();
        const customData = await customRes.json();

        setServiceRequests(serviceData);
        setCustomRequests(customData);
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err.message);
        setError(err.message || "Error al cargar solicitudes.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handlePropose = (requestId) => {
    navigate(`/requests/${requestId}/propose`);
  };

  const handleGoToProjects = () => {
    navigate("/my-projects");
  };

  const handleGoToServices = () => {
    navigate("/MyServices");
  };

  const handleGoToClientProfile = (username) => {
    if (!username) return;
    navigate(`/users/${username}`);
  };

  const openRequestModal = (request) => {
    setSelectedRequest(request);
    setAcceptError(null);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
    setAcceptError(null);
    setIsAccepting(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Sin fecha definida";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Fecha inválida";
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const mapStatusLabel = (status) => {
    if (status === "pending_freelancer") return "Pendiente";
    if (status === "accepted") return "Aceptada";
    if (status === "rejected") return "Rechazada";
    return status || "Sin estado";
  };

  const totalRequests = serviceRequests.length + customRequests.length;

  // 🔹 Aceptar solicitud y crear proyecto
  const handleAcceptAndCreateProject = async () => {
    if (!selectedRequest) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try{
      setIsAccepting(true);
      setAcceptError(null);

      // ⚠️ Ajusta esta URL y body según tu backend real
      const res = await fetch(
        "https://workly-cy4b.onrender.com/api/projects/from-service-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            service_request_id: selectedRequest.id,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("No se pudo crear el proyecto a partir de la solicitud.");
      }

      const project = await res.json();

      // Cerrar modal y mandar al freelancer al proyecto recién creado
      closeRequestModal();

      // ⚠️ Ajusta la ruta de detalle de proyecto según tu app
      if (project && project.id) {
        navigate(`/projects/${project.id}`);
      } else {
        navigate("/my-projects");
      }
    } catch (err) {
      console.error("Error al aceptar solicitud:", err);
      setAcceptError(
        err.message || "Ocurrió un error al crear el proyecto."
      );
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <>
      <FreelancerNavbar />
      <main className="dashboard-page">
        <div className="dashboard-container">
          {/* HEADER PRINCIPAL DEL PANEL */}
          <header className="dashboard-header">
            <div>
              <h1 className="dashboard-main-title">Panel de freelancer</h1>
              <p className="dashboard-subtitle">
                Gestiona las solicitudes que recibes en tus servicios y descubre
                custom requests de clientes que buscan a alguien como tú.
              </p>
            </div>

            <div className="dashboard-header-right">
              <span className="dashboard-pill">
                {totalRequests} solicitud
                {totalRequests === 1 ? "" : "es"} en total
              </span>
              <button
                type="button"
                className="dashboard-outline-btn"
                onClick={handleGoToProjects}
              >
                Ver mis proyectos
              </button>
            </div>
          </header>

          {error && (
            <div className="dashboard-error">
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="dashboard-loading">Cargando solicitudes...</div>
          ) : (
            <>
              {/* 1) SOLICITUDES A TUS SERVICIOS */}
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-title">
                    Solicitudes a tus servicios
                  </h2>
                  <span className="dashboard-section-count">
                    {serviceRequests.length} solicitud
                    {serviceRequests.length === 1 ? "" : "es"}
                  </span>
                </div>

                {serviceRequests.length === 0 ? (
                  <div className="empty-state">
                    <h3>No has recibido solicitudes directas aún</h3>
                    <p>
                      Cuando un cliente solicite uno de tus servicios
                      publicados, aparecerá aquí.
                    </p>
                    <button
                      className="primary-button"
                      onClick={handleGoToServices}
                    >
                      Revisar mis servicios
                    </button>
                  </div>
                ) : (
                  <div className="requests-grid">
                    {serviceRequests.map((sr) => (
                      <article
                        key={sr.id}
                        className="request-card request-card-clickable"
                        onClick={() => openRequestModal(sr)}
                      >
                        <div className="request-card-header">
                          <span className="request-category request-category-service">
                            Servicio
                          </span>
                          <span
                            className={`status-pill status-${
                              sr.status || "default"
                            }`}
                          >
                            {mapStatusLabel(sr.status)}
                          </span>
                        </div>

                        <h3 className="request-title">{sr.service_title}</h3>

                        <p className="request-description">
                          {sr.message
                            ? sr.message.length > 140
                              ? sr.message.slice(0, 140) + "..."
                              : sr.message
                            : "El cliente no agregó un mensaje detallado."}
                        </p>

                        <div className="request-client">
                          {sr.client_pfp && (
                            <img
                              src={sr.client_pfp}
                              alt={
                                sr.client_username ||
                                sr.client_name ||
                                "Cliente"
                              }
                              className="request-client-pfp"
                            />
                          )}

                          <span
                            className="request-client-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToClientProfile(sr.client_username);
                            }}
                          >
                            @{sr.client_username || sr.client_name || "cliente"}
                          </span>
                        </div>

                        <div className="request-meta">
                          <p className="request-budget">
                            Presupuesto propuesto:{" "}
                            <span>
                              {sr.proposed_budget
                                ? `$${sr.proposed_budget} USD`
                                : "No especificado"}
                            </span>
                          </p>
                          <p className="request-deadline">
                            Fecha objetivo: {formatDate(sr.proposed_deadline)}
                          </p>
                          <p className="request-created">
                            Recibida el: {formatDate(sr.created_at)}
                          </p>
                        </div>

                        <button
                          className="primary-button request-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRequestModal(sr);
                          }}
                        >
                          Ver solicitud
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* 2) CUSTOM REQUESTS (PUBLICADAS POR CLIENTES) */}
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-title">
                    Propuestas que podrían interesarte
                  </h2>
                  <span className="dashboard-section-count">
                    {customRequests.length} solicitud
                    {customRequests.length === 1 ? "" : "es"}
                  </span>
                </div>

                {customRequests.length === 0 ? (
                  <div className="empty-state">
                    <h3>Por ahora no hay propuestas para ti</h3>
                    <p>
                      Cuando un cliente publique una solicitud compatible con tu
                      perfil, aparecerá aquí automáticamente.
                    </p>
                    <button
                      className="primary-button"
                      onClick={handleGoToServices}
                    >
                      Revisar mis servicios
                    </button>
                  </div>
                ) : (
                  <div className="requests-grid">
                    {customRequests.map((req) => (
                      <article className="request-card" key={req.id}>
                        <div className="request-card-header">
                          <span className="request-category">
                            {req.category}
                          </span>
                        </div>

                        {/* Cliente que publicó la request */}
                        <div className="request-client">
                          {req.client_pfp && (
                            <img
                              src={req.client_pfp}
                              alt={req.client_username || "Cliente"}
                              className="request-client-pfp"
                            />
                          )}

                          <span
                            className="request-client-link"
                            onClick={() =>
                              handleGoToClientProfile(req.client_username)
                            }
                          >
                            @{req.client_username || "cliente"}
                          </span>
                        </div>

                        <h3 className="request-title">{req.title}</h3>

                        <p className="request-description">
                          {req.description && req.description.length > 120
                            ? req.description.slice(0, 120) + "..."
                            : req.description}
                        </p>

                        {req.additional_info && (
                          <p className="request-additional">
                            <strong>Información adicional:</strong>{" "}
                            {req.additional_info}
                          </p>
                        )}

                        {req.reference_links &&
                          req.reference_links.length > 0 && (
                            <div className="request-links">
                              <h4>Referencias:</h4>
                              <ul>
                                {req.reference_links.map((link, idx) => (
                                  <li key={idx}>
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Link #{idx + 1}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        <div className="request-meta">
                          <p className="request-budget">
                            Presupuesto estimado:{" "}
                            <span>
                              {req.budget
                                ? `$${req.budget} USD`
                                : "No especificado"}
                            </span>
                          </p>

                          <p className="request-deadline">
                            Fecha límite: {formatDate(req.deadline)}
                          </p>

                          <p className="request-created">
                            Publicada el: {formatDate(req.created_at)}
                          </p>
                        </div>

                        <button
                          className="primary-button"
                          onClick={() => handlePropose(req.id)}
                        >
                          Enviar propuesta
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* 🔹 MODAL VER / ACEPTAR SOLICITUD */}
        {showRequestModal && selectedRequest && (
          <div className="fd-modal-backdrop" onClick={closeRequestModal}>
            <div
              className="fd-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="fd-modal-header">
                <div className="fd-modal-header-left">
                  <span className="request-category request-category-service">
                    Servicio
                  </span>
                  <h3 className="fd-modal-title">
                    {selectedRequest.service_title}
                  </h3>
                </div>
                <span
                  className={`status-pill status-${
                    selectedRequest.status || "default"
                  }`}
                >
                  {mapStatusLabel(selectedRequest.status)}
                </span>
              </header>

              <div className="request-client fd-modal-client">
                {selectedRequest.client_pfp && (
                  <img
                    src={selectedRequest.client_pfp}
                    alt={
                      selectedRequest.client_username ||
                      selectedRequest.client_name ||
                      "Cliente"
                    }
                    className="request-client-pfp"
                  />
                )}
                <span
                  className="request-client-link"
                  onClick={() =>
                    handleGoToClientProfile(selectedRequest.client_username)
                  }
                >
                  @{selectedRequest.client_username ||
                    selectedRequest.client_name ||
                    "cliente"}
                </span>
              </div>

              <p className="fd-modal-message">
                {selectedRequest.message ||
                  "El cliente no proporcionó un mensaje adicional."}
              </p>

              <div className="fd-modal-meta">
                <p>
                  <strong>Presupuesto propuesto:</strong>{" "}
                  {selectedRequest.proposed_budget
                    ? `$${selectedRequest.proposed_budget} USD`
                    : "No especificado"}
                </p>
                <p>
                  <strong>Fecha objetivo:</strong>{" "}
                  {formatDate(selectedRequest.proposed_deadline)}
                </p>
                <p>
                  <strong>Recibida el:</strong>{" "}
                  {formatDate(selectedRequest.created_at)}
                </p>
              </div>

              <p className="fd-modal-helper-text">
                Al aceptar esta solicitud se creará un proyecto con este
                cliente.
              </p>

              {acceptError && (
                <div className="fd-modal-error">
                  {acceptError}
                </div>
              )}

              <footer className="fd-modal-actions">
                {selectedRequest.status === "pending_freelancer" && (
                  <button
                    type="button"
                    className="primary-button fd-modal-primary-cta"
                    onClick={handleAcceptAndCreateProject}
                    disabled={isAccepting}
                  >
                    {isAccepting ? "Creando proyecto..." : "Aceptar solicitud"}
                  </button>
                )}

                <button
                  type="button"
                  className="dashboard-outline-btn"
                  onClick={() =>
                    handleGoToClientProfile(selectedRequest.client_username)
                  }
                >
                  Ver perfil del cliente
                </button>

                <button
                  type="button"
                  className="dashboard-outline-btn"
                  onClick={closeRequestModal}
                >
                  Cerrar
                </button>
              </footer>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
