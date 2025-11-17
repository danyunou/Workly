import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../styles/freelancerProfile.css";
import Navbar from "../../components/Navbar"; 
import WelcomeNavbar from "../../components/WelcomeNavbar";

export default function PublicFreelancerProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [roleId, setRoleId] = useState(null);
  
  useEffect(() => {
        const token = localStorage.getItem("token");
    
        if (token) {
          const decoded = jwtDecode(token);
          setRoleId(decoded.role_id);
        }
  });

  useEffect(() => {
    fetch(`https://workly-cy4b.onrender.com/api/freelancerProfile/public/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se encontró el perfil");
        return res.json();
      })
      .then((data) => {
        // Parsear educación si viene como string
        if (typeof data.education === "string") {
          try {
            data.education = JSON.parse(data.education);
          } catch {
            data.education = [];
          }
        }
        setProfile(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [username]);

  if (error) {
    return (
      <>
        {roleId === 1 ? <Navbar /> : <WelcomeNavbar />}
        <div className="profile-container">
          <p>{error}</p>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        {roleId === 1 ? <Navbar /> : <WelcomeNavbar />}
        <div className="profile-container">
          <p>Cargando perfil de {username}...</p>
        </div>
      </>
    );
  }

  return (
    <>
      {roleId === 1 ? <Navbar /> : <WelcomeNavbar />}
      <div className="profile-container">
        {/* LADO IZQUIERDO */}
        <div className="profile-left">
          <img
            src={profile.profile_picture}
            alt={profile.full_name}
            className="profile-img"
          />

          <h3>{profile.full_name}</h3>
          <p className="username">@{profile.username}</p>

          <ul className="profile-info">
            <li>
              <strong>Idiomas:</strong>{" "}
              {(profile.languages || []).join(", ") || "No especificados"}
            </li>
            <li>
              <strong>Disponibilidad:</strong>{" "}
              {profile.preferences?.communication_hours || "No especificada"}
            </li>
            <li>
              <strong>Registro:</strong>{" "}
              {new Date(profile.created_at).toLocaleDateString("es-MX", {
                month: "long",
                year: "numeric",
              })}
            </li>
            <li>
              <strong>Verificación:</strong>{" "}
              {profile.verified ? "Verificado" : "Pendiente"}
            </li>
          </ul>

          {profile.skills?.length > 0 && (
            <div className="profile-tags-block">
              <h4>Skills principales</h4>
              <div className="tag-list">
                {profile.skills.slice(0, 6).map((skill, i) => (
                  <span key={i} className="tag-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LADO DERECHO */}
        <div className="profile-right">
          <section className="section-block">
            <h2>🧾 Sobre mí</h2>
            <p className="section-text">
              {profile.description || "Sin descripción aún."}
            </p>
          </section>

          <section className="section-block">
            <h3>🎓 Educación</h3>
            {Array.isArray(profile.education) && profile.education.length > 0 ? (
              <ul className="section-list">
                {profile.education.map((edu, i) => (
                  <li key={i}>
                    <strong>{edu.institution}</strong>{" "}
                    {edu.degree && `— ${edu.degree}`}{" "}
                    {edu.year && <span className="muted">({edu.year})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-text muted">
                No hay registros educativos.
              </p>
            )}
          </section>

          {profile.categories?.length > 0 && (
            <section className="section-block">
              <h3>📂 Categorías</h3>
              <div className="tag-list">
                {profile.categories.map((cat, i) => (
                  <span key={i} className="tag-chip">
                    {cat}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.website && (
            <section className="section-block">
              <h3>🌐 Sitio web</h3>
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="section-link"
              >
                {profile.website}
              </a>
            </section>
          )}

          {profile.social_links?.length > 0 && (
            <section className="section-block">
              <h3>🔗 Redes Sociales</h3>
              <div className="social-links-row">
                {profile.social_links.map((link, i) => {
                  let label = "Portafolio";
                  if (link.includes("behance")) label = "Behance";
                  else if (link.includes("dribbble")) label = "Dribbble";
                  else if (link.includes("linkedin")) label = "LinkedIn";
                  else if (link.includes("instagram")) label = "Instagram";

                  return (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="social-pill"
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
