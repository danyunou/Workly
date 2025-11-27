import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/userProfile.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/users/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // por si el backend viniera anidado o con error
        if (data && !data.error) {
          setUser(data);
        } else {
          console.error("Error en profile:", data.error);
        }
      })
      .catch((err) => console.error("Error fetching user profile:", err));
  }, []);

  if (!user)
    return (
      <>
        <Navbar />
        <p style={{ padding: "1.5rem" }}>Cargando perfil...</p>
      </>
    );

  // Helper fecha de unión
  const joinedText = (() => {
    if (!user.created_at) return "Fecha no disponible";
    const d = new Date(user.created_at);
    if (Number.isNaN(d.getTime())) return "Fecha no disponible";
    return d.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
  })();

  // Helpers de rating
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
        } recibida${user.reviews_count === 1 ? "" : "s"}`
      : "Aún no tienes reseñas";

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
            <li>📍 Ubicado en {user.location || "México"}</li>
            <li>🕒 Se unió en {joinedText}</li>
            <li>🗣️ {user.languages || "Español"}</li>
            <li>⏰ {user.communication_hours || "No establecido"}</li>
          </ul>

          <div className="profile-rating-box">
            <div className="profile-rating-main">
              <span className="profile-rating-stars">{ratingStars}</span>
              <span className="profile-rating-value">
                {hasRating ? `${ratingNumber} / 5` : "Sin calificación"}
              </span>
            </div>
            <div className="profile-rating-sub">{reviewsText}</div>
            <p className="profile-rating-helper">
              Esta calificación se calcula con las reseñas que recibes en tus
              proyectos completados.
            </p>
          </div>

          <Link to="/edit-profile" className="edit-profile-btn">
            Editar perfil
          </Link>
        </div>

        <div className="profile-right">
          <h2>Hola 👋 Ayudemos a los freelancers a conocerte</h2>
          <p>Aprovecha al máximo Workly compartiendo más sobre ti.</p>

          <div className="checklist">
            <div className="checklist-item">
              Cómo planeas usar Workly:{" "}
              {user.usage_preference || "No especificado"}
            </div>
            <div className="checklist-item">
              Biografía:{" "}
              {user.biography ||
                "Aún no has agregado una biografía en tu perfil."}
            </div>
          </div>

          <div className="comments-section">
            <h3>Comentarios de otros usuarios</h3>
            <p>
              De momento se muestra solo tu calificación global. Más adelante se
              podrán ver comentarios individuales por proyecto.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
