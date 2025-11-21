// src/pages/freelancer/FreelancerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FreelancerNavbar from "../../components/FreelancerNavbar";
import "../../styles/freelancerDashboard.css";

export default function FreelancerDashboard() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 estado para el modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // 🔹 aceptar solicitud / crear proyecto
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  // 🔹 rechazar solicitud
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState(null);
  const [rejectReason, setRejectReason] = useState(""); // <-- motivo del rechazo

  // 🔹 contador de proyectos activos
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);

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

        const [serviceRes, projectsRes] = await Promise.all([
          fetch(
            "https://workly-cy4b.onrender.com/api/service-requests/freelancer",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
          fetch("https://workly-cy4b.onrender.com/api/projects/my-projects", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!serviceRes.ok) {
          throw new Error("Error al obtener solicitudes de tus servicios");
        }

        const serviceData = await serviceRes.json();

        // 🔹 Mostrar solo solicitudes pendientes del freelancer
        const filteredServiceRequests = serviceData.filter(
          (sr) => !sr.status || sr.status === "pending_freelancer"
        );

        setServiceRequests(filteredServiceRequests);

        // 🔹 Proyectos activos (no completados / cancelados)
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const activeCount = projectsData.filter(
            (p) => p.status !== "completed" && p.status !== "cancelled"
          ).length;
          setActiveProjectsCount(activeCount);
        } else {
          console.error("Error al obtener proyectos para el contador");
        }
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err.message);
        setError(err.message || "Error al cargar solicitudes.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

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
    setRejectError(null);
    setRejectReason(""); // limpiar motivo al abrir
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
    setAcceptError(null);
    setRejectError(null);
    setRejectReason(""); // limpiar motivo al cerrar
    setIsAccepting(false);
    setIsRejecting(false);
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

  // 🔹 Contar solo lo que realmente se muestra (ahora solo serviceRequests)
  const totalRequests = serviceRequests.length;

  // 🔹 Aceptar solicitud y crear proyecto
  const handleAcceptAndCreateProject = async () => {
    if (!selectedRequest) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setIsAccepting(true);
      setAcceptError(null);

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
        throw new Error(
          "No se pudo crear el proyecto a partir de la solicitud."
        );
      }

      const project = await res.json();

      // Cerrar modal
      closeRequestModal();

      // Redirigir al proyecto
      if (project && project.id) {
        navigate(`/projects/${project.id}`);
      } else {
        navigate("/my-projects");
      }
    } catch (err) {
      console.error("Error al aceptar solicitud:", err);
      setAcceptError(err.message || "Ocurrió un error al crear el proyecto.");
    } finally {
      setIsAccepting(false);
    }
  };

  // 🔹 Rechazar solicitud con motivo
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!rejectReason.trim()) {
      setRejectError("Por favor indica un motivo para rechazar la solicitud.");
      return;
    }

    try {
      setIsRejecting(true);
      setRejectError(null);

      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/service-requests/${selectedRequest.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo rechazar la solicitud.");
      }

      // Sacar la solicitud de la lista en el front
      setServiceRequests((prev) =>
        prev.filter((sr) => sr.id !== selectedRequest.id)
      );

      // Cerrar modal
      closeRequestModal();
    } catch (err) {
      console.error("Error al rechazar solicitud:", err);
      setRejectError(err.message || "Error al rechazar la solicitud.");
    } finally {
      setIsRejecting(false);
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
                Gestiona las solicitudes que recibes en tus servicios y
                conviértelas en proyectos activos.
              </p>
            </div>

            <div className="dashboard-header-right">
              <span className="dashboard-pill">
                {totalRequests} solicitud
                {totalRequests === 1 ? "" : "es"} pendiente
              </span>

              <span className="dashboard-pill dashboard-pill-secondary">
                {activeProjectsCount} proyecto
                {activeProjectsCount === 1 ? "" : "s"} activo
                {activeProjectsCount === 1 ? "" : "s"}
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
                    <h3>No tienes solicitudes pendientes</h3>
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
            </>
          )}
        </div>

        {/* 🔹 MODAL VER / ACEPTAR / RECHAZAR SOLICITUD */}
        {showRequestModal && selectedRequest && (
          <div className="fd-modal-backdrop" onClick={closeRequestModal}>
            <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
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
                cliente, donde podrás gestionar entregables, revisiones y pagos.
              </p>

              {/* Bloque para escribir el motivo del rechazo */}
              {selectedRequest.status === "pending_freelancer" && (
                <div className="fd-modal-reject-block">
                  <label className="service-modal-label">
                    Motivo del rechazo (se enviará al cliente)
                    <textarea
                      className="service-modal-textarea"
                      placeholder="Explica brevemente por qué no puedes tomar este proyecto, o qué tendría que cambiar el cliente."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {acceptError && (
                <div className="fd-modal-error">{acceptError}</div>
              )}
              {rejectError && (
                <div className="fd-modal-error">{rejectError}</div>
              )}

              <footer className="fd-modal-actions">
                {selectedRequest.status === "pending_freelancer" && (
                  <>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={handleRejectRequest}
                      disabled={isRejecting}
                    >
                      {isRejecting ? "Rechazando..." : "Rechazar solicitud"}
                    </button>

                    <button
                      type="button"
                      className="primary-button fd-modal-primary-cta"
                      onClick={handleAcceptAndCreateProject}
                      disabled={isAccepting}
                    >
                      {isAccepting
                        ? "Creando proyecto..."
                        : "Aceptar solicitud y crear proyecto"}
                    </button>
                  </>
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
