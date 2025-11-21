import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../styles/freelancerProfile.css";
import Navbar from "../../components/Navbar";
import WelcomeNavbar from "../../components/WelcomeNavbar";
import FreelancerNavbar from "../../components/FreelancerNavbar";

import { jwtDecode } from "jwt-decode";

export default function PublicFreelancerProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [roleId, setRoleId] = useState(null);

  // Solo leer token una vez
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode(token);
      setRoleId(decoded.role_id);
    }
  }, []);

  useEffect(() => {
    fetch(
      `https://workly-cy4b.onrender.com/api/freelancerProfile/public/${username}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("No se encontró el perfil");
        return res.json();
      })
      .then((data) => {
        // --- EDUCACIÓN ---
        let education = [];

        if (typeof data.education === "string") {
          try {
            education = JSON.parse(data.education);
          } catch {
            education = [];
          }
        } else if (Array.isArray(data.education)) {
          education = data.education;
        }

        const normalizedEducation = education.map((edu) => ({
          institution: edu.institucion || edu.institution || "",
          degree: edu.carrera || edu.degree || "",
          year: edu.anio || edu.year || "",
        }));

        // --- SOCIAL LINKS: quitar vacíos ---
        const socialLinks = (data.social_links || []).filter(
          (link) => link && link.trim() !== ""
        );

        // --- PROYECTOS DESTACADOS ---
        let featuredProjects = data.featured_projects || [];
        if (!Array.isArray(featuredProjects)) {
          try {
            featuredProjects = JSON.parse(featuredProjects);
          } catch {
            featuredProjects = [];
          }
        }

        setProfile({
          ...data,
          education: normalizedEducation,
          social_links: socialLinks,
          featured_projects: featuredProjects,
        });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [username]);

  const NavbarToShow =
    roleId === 2 ? (
      <FreelancerNavbar />
    ) : roleId === 1 ? (
      <Navbar />
    ) : (
      <WelcomeNavbar />
    );

  // Helper para estrellas
  const renderStars = (rating) => {
    const max = 5;
    const filled = Math.round(rating);
    const stars = [];

    for (let i = 1; i <= max; i++) {
      stars.push(
        <span key={i} className={i <= filled ? "star filled" : "star"}>
          ★
        </span>
      );
    }
    return stars;
  };

  if (error) {
    return (
      <>
        {NavbarToShow}
        <div className="profile-container">
          <p>{error}</p>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        {NavbarToShow}
        <div className="profile-container">
          <p>Cargando perfil de {username}...</p>
        </div>
      </>
    );
  }

  // Intentar leer rating y conteo desde distintas keys
  const ratingValue =
    profile.average_rating ??
    profile.avg_rating ??
    profile.rating ??
    null;

  const ratingCount =
    profile.review_count ??
    profile.ratings_count ??
    profile.total_reviews ??
    null;

  const hasRating =
    typeof ratingValue === "number" && !Number.isNaN(ratingValue) && ratingValue > 0;

  return (
    <>
      {NavbarToShow}
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

          {/* CALIFICACIÓN */}
          {hasRating && (
            <div className="rating-row">
              <div className="rating-stars">{renderStars(ratingValue)}</div>
              <span className="rating-number">
                {ratingValue.toFixed(1)}
                {ratingCount != null && (
                  <span className="rating-count">
                    {" "}
                    ({ratingCount} reseñas)
                  </span>
                )}
              </span>
            </div>
          )}

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
            <h2>Acerca del freelancer</h2>
            <p className="section-text">
              {profile.description || "Sin descripción aún."}
            </p>
          </section>

          {/* EDUCACIÓN */}
          <section className="section-block">
            <h3>Educación</h3>
            {Array.isArray(profile.education) &&
            profile.education.length > 0 ? (
              <ul className="section-list">
                {profile.education.map((edu, i) => (
                  <li key={i}>
                    <strong>{edu.institution}</strong>{" "}
                    {edu.degree && `— ${edu.degree}`}{" "}
                    {edu.year && (
                      <span className="muted">({edu.year})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-text muted">
                No hay registros educativos.
              </p>
            )}
          </section>

          {/* CATEGORÍAS */}
          {profile.categories?.length > 0 && (
            <section className="section-block">
              <h3>Categorías</h3>
              <div className="tag-list">
                {profile.categories.map((cat, i) => (
                  <span key={i} className="tag-chip">
                    {cat}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* SITIO WEB */}
          {profile.website && profile.website.trim() !== "" && (
            <section className="section-block">
              <h3>Sitio web</h3>
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

          {/* REDES SOCIALES */}
          {profile.social_links?.length > 0 && (
            <section className="section-block">
              <h3>Redes Sociales</h3>
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

          {/* PROYECTOS DESTACADOS */}
          {profile.featured_projects?.length > 0 && (
            <section className="section-block">
              <h3>Proyectos destacados</h3>
              <div className="projects-grid">
                {profile.featured_projects.map((proj, i) => (
                  <div key={i} className="project-card">
                    {proj.image_url && (
                      <div className="project-card-image-wrapper">
                        <img
                          src={proj.image_url}
                          alt={proj.title || `Proyecto ${i + 1}`}
                          className="project-card-image"
                        />
                      </div>
                    )}

                    <div className="project-card-body">
                      <h4>{proj.title}</h4>
                      {proj.description && (
                        <p className="section-text">{proj.description}</p>
                      )}
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noreferrer"
                          className="section-link"
                        >
                          Ver proyecto
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
