import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/userProfile.css"; // reutilizamos el mismo estilo

export default function PublicClientProfile() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `https://workly-cy4b.onrender.com/api/users/public/${username}`
        );

        if (!res.ok) {
          throw new Error("No se pudo cargar el perfil del cliente.");
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message || "Error al cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <>
        <Navbar />
        <p style={{ padding: "1.5rem" }}>Cargando perfil...</p>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <p style={{ padding: "1.5rem", color: "#b91c1c" }}>
          {error || "No se encontró el perfil."}
        </p>
      </>
    );
  }

  // Helpers para rating (como cliente)
  const hasRating = user.avg_rating && Number(user.avg_rating) > 0;
  const ratingNumber = hasRating ? Number(user.avg_rating).toFixed(1) : null;
  const ratingStars = hasRating
    ? "★".repeat(Math.round(user.avg_rating)) +
      "☆".repeat(5 - Math.round(user.avg_rating))
    : "☆☆☆☆☆";

  const reviewsText =
    user.reviews_count && user.reviews_count > 0
      ? `${user.reviews_count} reseña${
          user.reviews_count === 1 ? "" : "s"
        } de freelancers`
      : "Aún no tiene reseñas de freelancers";

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <div className="profile-left">
          <img
            src={user.profile_picture}
            alt="Perfil"
            className="profile-img"
          />
          <h3>{user.full_name}</h3>
          <p>@{user.username}</p>

          <ul className="profile-info">
            {/* location no existe en la DB, usamos el mismo fallback que en UserProfile */}
            <li>📍 Ubicado en {user.location || "México"}</li>
            <li>
              🕒 Se unió en{" "}
              {new Date(user.created_at).toLocaleString("es-MX", {
                month: "long",
                year: "numeric",
              })}
            </li>
            {/* languages tampoco viene del back, usamos el mismo fallback */}
            <li>🗣️ {user.languages || "Español"}</li>
            <li>⏰ {user.communication_hours || "No establecido"}</li>
          </ul>

          {/* Bloque de calificación pública (como cliente) */}
          <div className="profile-rating-box">
            <div className="profile-rating-main">
              <span className="profile-rating-stars">{ratingStars}</span>
              <span className="profile-rating-value">
                {hasRating ? `${ratingNumber} / 5` : "Sin calificación"}
              </span>
            </div>
            <div className="profile-rating-sub">{reviewsText}</div>
            <p className="profile-rating-helper">
              Calificación basada en proyectos completados con freelancers en
              Workly.
            </p>
          </div>

          {/* Aquí NO mostramos botón de editar porque es perfil público */}
        </div>

        <div className="profile-right">
          <h2>Conozcamos a este cliente 👋</h2>
          <p>
            Esta información ayuda a los freelancers a entender mejor cómo
            trabaja este cliente.
          </p>

          <div className="checklist">
            <div className="checklist-item">
              Cómo planea usar Workly:{" "}
              {user.usage_preference || "No especificado"}
            </div>
            <div className="checklist-item">
              Biografía:{" "}
              {user.biography ||
                "Este cliente aún no ha agregado una biografía."}
            </div>
          </div>

          <div className="comments-section">
            <h3>Comentarios de freelancers</h3>
            <p>
              Por ahora sólo mostramos la calificación global. Más adelante
              podremos listar comentarios individuales por proyecto.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
