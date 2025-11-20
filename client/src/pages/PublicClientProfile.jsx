// src/pages/PublicClientProfile.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/publicClientProfile.css";

export default function PublicClientProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ajusta la URL al endpoint que tengas en el backend
        const res = await fetch(
          `https://workly-cy4b.onrender.com/api/users/public/${username}`
        );

        if (!res.ok) {
          throw new Error("No se pudo cargar el perfil del cliente.");
        }

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err.message || "Error al cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return (
    <>
      <Navbar />
      <main className="client-public-page">
        <div className="client-public-container">
          {loading && <p>Cargando perfil...</p>}
          {error && <p className="client-public-error">{error}</p>}

          {!loading && !error && profile && (
            <>
              <header className="client-public-header">
                {profile.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || username}
                    className="client-public-avatar"
                  />
                )}

                <div>
                  <h1>{profile.full_name || username}</h1>
                  <p className="client-public-username">@{username}</p>

                  {profile.country && (
                    <p className="client-public-meta">
                      Ubicación: <span>{profile.country}</span>
                    </p>
                  )}

                  {profile.member_since && (
                    <p className="client-public-meta">
                      Miembro desde:{" "}
                      <span>
                        {new Date(profile.member_since).toLocaleDateString(
                          "es-MX"
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </header>

              <section className="client-public-section">
                <h2>Sobre el cliente</h2>
                <p>
                  {profile.bio ||
                    "Este cliente aún no ha agregado una descripción."}
                </p>
              </section>

              <section className="client-public-section">
                <h2>Actividad</h2>
                <div className="client-public-stats">
                  <div className="client-public-stat-card">
                    <span className="stat-label">Proyectos creados</span>
                    <span className="stat-value">
                      {profile.total_projects ?? 0}
                    </span>
                  </div>
                  <div className="client-public-stat-card">
                    <span className="stat-label">Proyectos completados</span>
                    <span className="stat-value">
                      {profile.completed_projects ?? 0}
                    </span>
                  </div>
                  <div className="client-public-stat-card">
                    <span className="stat-label">Valoraciones promedio</span>
                    <span className="stat-value">
                      {profile.avg_rating
                        ? profile.avg_rating.toFixed(1)
                        : "Sin reseñas"}
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
