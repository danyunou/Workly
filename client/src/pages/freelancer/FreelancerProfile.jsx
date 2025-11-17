import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/freelancerProfile.css";
import Navbar from "../../components/FreelancerNavbar";

export default function FreelancerProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // --- EDUCACIÓN: asegurar array y claves consistentes ---
        let education = [];

        if (typeof data.education === "string") {
          try {
            education = JSON.parse(data.education);
          } catch (e) {
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

        // --- PORTAFOLIO / PROYECTOS DESTACADOS ---
        // Espera algo tipo: [{ title, description, link, image_url }]
        const featuredProjects = data.featured_projects || [];

        setProfile({
          ...data,
          education: normalizedEducation,
          social_links: socialLinks,
          featured_projects: featuredProjects,
        });
      })
      .catch((err) => console.error("Error fetching freelancer profile:", err));
  }, []);

  if (!profile) return <p>Cargando perfil de freelancer...</p>;

  return (
    <>
      <Navbar />
      <div className="profile-container">
        {/* LADO IZQUIERDO */}
        <div className="profile-left">
          <img
            src={profile.profile_picture}
            alt="Perfil"
            className="profile-img"
          />

          <h3>{profile.full_name}</h3>
          <p className="username">@{profile.username}</p>

          <ul className="profile-info">
            <li>Alias: {profile.alias}</li>
            <li>Idiomas: {(profile.languages || []).join(", ")}</li>
            <li>
              <strong>Disponibilidad:</strong>{" "}
              {profile.preferences?.communication_hours || "No especificada"}
            </li>
            <li>Verificación: {profile.verified ? "Verificado" : "Pendiente"}</li>
            <li>
              Registro:{" "}
              {new Date(profile.created_at).toLocaleDateString("es-MX", {
                month: "long",
                year: "numeric",
              })}
            </li>
          </ul>

          <Link
            to="/edit-freelancer-profile"
            className="edit-profile-btn"
          >
            Editar perfil
          </Link>

          {/* Enlace a perfil público opcional */}
          <Link
            to={`/freelancer/${profile.username}`}
            className="edit-profile-btn public-profile-btn"
          >
            Ver perfil público
          </Link>
        </div>

        {/* LADO DERECHO */}
        <div className="profile-right">
          {/* SOBRE MÍ */}
          <section className="section-block">
            <h2>Sobre mí</h2>
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
                    <strong>{edu.institution}</strong>
                    {edu.degree && ` — ${edu.degree}`}
                    {edu.year && <span className="muted"> ({edu.year})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-text">No hay registros educativos.</p>
            )}
          </section>

          {/* CATEGORÍAS */}
          {profile.categories?.length > 0 && (
            <section className="section-block">
              <h3>Categorías</h3>
              <ul className="section-list">
                {profile.categories.map((cat, i) => (
                  <li key={i}>{cat}</li>
                ))}
              </ul>
            </section>
          )}

          {/* SKILLS */}
          {profile.skills?.length > 0 && (
            <section className="section-block">
              <h3>Skills</h3>
              <ul className="section-list">
                {profile.skills.map((skill, i) => (
                  <li key={i}>{skill}</li>
                ))}
              </ul>
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
              <ul className="section-list">
                {profile.social_links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="section-link"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* PORTAFOLIO / PROYECTOS DESTACADOS */}
          <section className="section-block">
            <div className="section-header-row">
              <h3>Portafolio</h3>
              <Link
                to="/freelancer/portfolio"
                className="section-link add-portfolio-link"
              >
                Gestionar portafolio
              </Link>
            </div>

            {profile.featured_projects?.length > 0 ? (
              <div className="projects-grid">
                {profile.featured_projects.map((proj, i) => (
                  <div key={i} className="project-card">
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
                ))}
              </div>
            ) : (
              <p className="section-text muted">
                Aún no has agregado proyectos a tu portafolio.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
