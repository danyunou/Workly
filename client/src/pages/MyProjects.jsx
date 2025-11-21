import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FreelancerNavbar from "../components/FreelancerNavbar";
import { jwtDecode } from "jwt-decode";
import "../styles/myProjects.css";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [roleId, setRoleId] = useState(null); // 1 = cliente, 2 = freelancer
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const isClient = roleId === 1;
  const isFreelancer = roleId === 2;

  // Leer token y rol una sola vez
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setRoleId(decoded.role_id);
    } catch (err) {
      console.error("Error al decodificar token:", err);
      navigate("/login");
    }
  }, [navigate]);

  // Cargar proyectos
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await axios.get(
          "https://workly-cy4b.onrender.com/api/projects/my-projects",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setProjects(res.data || []);
      } catch (err) {
        console.error("Error al cargar proyectos:", err);
        setError("Error al cargar tus proyectos. Intenta de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Helpers UI
  const formatDate = (value) => {
    if (!value) return "Aún no iniciado";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Aún no iniciado";
    return d.toLocaleDateString();
  };

  const formatAmount = (amount) => {
    if (amount == null) return "—";
    return `$${Number(amount).toFixed(2)}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending_contract":
      case "awaiting_contract":
        return "Pendiente de contrato";
      case "awaiting_payment":
        return "Pendiente de pago";
      case "in_progress":
        return "En progreso";
      case "in_revision":
        return "En revisión";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return status || "Sin estado";
    }
  };

  const getStatusType = (status) => {
    switch (status) {
      case "pending_contract":
      case "awaiting_contract":
      case "awaiting_payment":
        return "pending";
      case "in_progress":
      case "in_revision":
        return "active";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "neutral";
    }
  };

  const getPrimaryActionLabel = (status) => {
    if (status === "pending_contract" || status === "awaiting_contract") {
      return isClient ? "Revisar y firmar contrato" : "Ver contrato";
    }
    if (status === "awaiting_payment") {
      return isClient ? "Realizar pago" : "Ver estado de pago";
    }
    if (status === "in_progress") {
      return isFreelancer ? "Subir entregables" : "Ver avances";
    }
    if (status === "in_revision") {
      return isClient ? "Revisar cambios" : "Ver comentarios del cliente";
    }
    if (status === "completed") {
      return isClient ? "Dejar reseña" : "Ver reseña";
    }
    return "Ver proyecto";
  };

  // Filtros
  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const title = (p.service_title || "").toLowerCase();
      const counterpartName = (
        isClient ? p.freelancer_name : p.client_name
      )?.toLowerCase();

      if (!title.includes(term) && !(counterpartName || "").includes(term)) {
        return false;
      }
    }

    return true;
  });

  // Contadores
  const activeStatuses = [
    "pending_contract",
    "awaiting_contract",
    "awaiting_payment",
    "in_progress",
    "in_revision",
  ];
  const completedStatuses = ["completed"];
  const cancelledStatuses = ["cancelled"];

  const totalActive = projects.filter((p) =>
    activeStatuses.includes(p.status)
  ).length;
  const totalCompleted = projects.filter((p) =>
    completedStatuses.includes(p.status)
  ).length;
  const totalCancelled = projects.filter((p) =>
    cancelledStatuses.includes(p.status)
  ).length;

  const counterpartLabel = isClient ? "Freelancer" : "Cliente";

  return (
    <>
      {roleId === 2 ? <FreelancerNavbar /> : <Navbar />}

      <div className="projects-page">
        <div className="projects-container">
          {/* Header */}
          <div className="projects-header">
            <div>
              <h1 className="projects-main-title">Mis proyectos</h1>
              <p className="projects-subtitle">
                Administra tus proyectos en curso, revisa contratos, pagos y
                entregables en un solo lugar.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="projects-stats">
            <div className="projects-stat-card">
              <span className="projects-stat-label">Activos</span>
              <span className="projects-stat-value">{totalActive}</span>
            </div>
            <div className="projects-stat-card">
              <span className="projects-stat-label">Completados</span>
              <span className="projects-stat-value">{totalCompleted}</span>
            </div>
            <div className="projects-stat-card">
              <span className="projects-stat-label">Cancelados</span>
              <span className="projects-stat-value">{totalCancelled}</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="projects-filters">
            <div className="projects-search-wrapper">
              <input
                type="text"
                placeholder="Buscar por proyecto o nombre…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="projects-search-input"
              />
            </div>

            <div className="projects-select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="projects-filter-select"
              >
                <option value="all">Todos los estados</option>
                <option value="pending_contract">Pendiente de contrato</option>
                <option value="awaiting_contract">Contrato en revisión</option>
                <option value="awaiting_payment">Pendiente de pago</option>
                <option value="in_progress">En progreso</option>
                <option value="in_revision">En revisión</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
          </div>

          {/* Contenido */}
          {isLoading ? (
            <p className="projects-helper-text">Cargando proyectos…</p>
          ) : error ? (
            <p className="projects-error-text">{error}</p>
          ) : filteredProjects.length === 0 ? (
            <div className="projects-empty">
              <h3>No tienes proyectos con estos filtros.</h3>
              <p>
                Cuando contrates o aceptes proyectos, aparecerán aquí para que
                puedas hacer seguimiento.
              </p>
            </div>
          ) : (
            <div className="projects-grid">
              {filteredProjects.map((project) => {
                const statusLabel = getStatusLabel(project.status);
                const statusType = getStatusType(project.status);
                const startedLabel = formatDate(project.started_at);
                const deadlineLabel = formatDate(project.contract_deadline);
                const amountLabel = formatAmount(project.contract_price);
                const counterpartName = isClient
                  ? project.freelancer_name
                  : project.client_name;

                return (
                  <div key={project.id} className="project-card">
                    <div className="project-card-header">
                      <h3 className="project-title">
                        {project.service_title || "Proyecto sin título"}
                      </h3>
                      <span
                        className={`project-status-badge project-status-badge--${statusType}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="project-meta">
                      <p>
                        <span className="meta-label">{counterpartLabel}:</span>{" "}
                        <span className="meta-value">
                          {counterpartName || "Por definir"}
                        </span>
                      </p>
                      <p>
                        <span className="meta-label">Inicio:</span>{" "}
                        <span className="meta-value">{startedLabel}</span>
                      </p>
                      <p>
                        <span className="meta-label">Fecha límite:</span>{" "}
                        <span className="meta-value">{deadlineLabel}</span>
                      </p>
                      <p>
                        <span className="meta-label">Monto:</span>{" "}
                        <span className="meta-value">{amountLabel}</span>
                      </p>
                    </div>

                    <div className="project-card-footer">
                      <Link to={`/projects/${project.id}`}>
                        <button className="project-primary-btn">
                          {getPrimaryActionLabel(project.status)}
                        </button>
                      </Link>
                      <Link
                        to={`/projects/${project.id}`}
                        className="project-secondary-link"
                      >
                        Ver detalles del proyecto
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
