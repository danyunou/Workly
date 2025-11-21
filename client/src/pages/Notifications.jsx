// src/pages/Notifications.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import "../styles/notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const navigate = useNavigate();

  const fetchNotifications = async (currentFilter = filter) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params =
        currentFilter === "unread" ? { onlyUnread: "true" } : {};

      const res = await axios.get(
        "https://workly-cy4b.onrender.com/api/notifications",
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications(res.data);
    } catch (err) {
      console.error("Error al obtener notificaciones:", err);
      setError(
        err.response?.data?.error ||
          "No se pudieron cargar las notificaciones."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeFilter = (newFilter) => {
    setFilter(newFilter);
    fetchNotifications(newFilter);
  };

  const handleMarkAsRead = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await axios.patch(
        `https://workly-cy4b.onrender.com/api/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                is_read: true,
              }
            : n
        )
      );
    } catch (err) {
      console.error("Error al marcar como leída:", err);
      // aquí podrías disparar también un toast si implementaste el NotificationProvider
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setMarkingAll(true);
      await axios.patch(
        "https://workly-cy4b.onrender.com/api/notifications/mark-all-read",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Navbar />
      <div className="notifications-page">
        <header className="notifications-header">
          <div>
            <h2>Notificaciones</h2>
            <p>
              Aquí verás el historial de eventos importantes: propuestas,
              proyectos, pagos, disputas y más.
            </p>
          </div>

          <div className="notifications-header-actions">
            <span className="notifications-count">
              No leídas:{" "}
              <strong>{unreadCount}</strong>
            </span>
            <button
              className="btn-mark-all"
              onClick={handleMarkAllAsRead}
              disabled={markingAll || unreadCount === 0}
            >
              {markingAll
                ? "Marcando..."
                : "Marcar todas como leídas"}
            </button>
          </div>
        </header>

        <div className="notifications-filters">
          <button
            className={
              filter === "all"
                ? "filter-btn active"
                : "filter-btn"
            }
            onClick={() => handleChangeFilter("all")}
          >
            Todas
          </button>
          <button
            className={
              filter === "unread"
                ? "filter-btn active"
                : "filter-btn"
            }
            onClick={() => handleChangeFilter("unread")}
          >
            No leídas
          </button>
        </div>

        {loading && (
          <div className="notifications-state">
            Cargando notificaciones...
          </div>
        )}

        {error && !loading && (
          <div className="notifications-state error">
            {error}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notifications-state">
            No tienes notificaciones por ahora.
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="notifications-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`notification-item ${
                  n.is_read ? "read" : "unread"
                }`}
              >
                <div className="notification-main">
                  <div className="notification-icon" />
                  <div className="notification-texts">
                    <div className="notification-type">
                      {n.type === "success" && "Éxito"}
                      {n.type === "error" && "Error"}
                      {n.type === "warning" && "Aviso"}
                      {n.type === "info" && "Información"}
                      {n.type === "system" && "Sistema"}
                    </div>
                    <div className="notification-message">
                      {n.message}
                    </div>
                    <div className="notification-meta">
                      <span>{formatDate(n.created_at)}</span>
                      {!n.is_read && (
                        <span className="badge-unread">
                          Nueva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="notification-actions">
                  {n.link && (
                    <Link
                      to={n.link}
                      className="btn-link-details"
                    >
                      Ver detalle
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      className="btn-mark-read"
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      Marcar como leída
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
