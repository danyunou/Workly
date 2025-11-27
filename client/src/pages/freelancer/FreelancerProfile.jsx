import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/freelancerProfile.css";
import Navbar from "../../components/FreelancerNavbar";

export default function FreelancerProfile() {
  const [profile, setProfile] = useState(null);
  const [portfolioDraft, setPortfolioDraft] = useState([]);
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioSuccess, setPortfolioSuccess] = useState("");
  const [expandedProjectIndex, setExpandedProjectIndex] = useState(null);

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // --- EDUCACIÓN ---
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

        // --- SOCIAL LINKS ---
        const socialLinks = (data.social_links || []).filter(
          (link) => link && link.trim() !== ""
        );

        // --- PORTAFOLIO ---
        let featuredProjects = data.featured_projects || [];
        if (!Array.isArray(featuredProjects)) {
          try {
            featuredProjects = JSON.parse(featuredProjects);
          } catch {
            featuredProjects = [];
          }
        }

        const finalProfile = {
          ...data,
          education: normalizedEducation,
          social_links: socialLinks,
          featured_projects: featuredProjects,
        };

        setProfile(finalProfile);
        setPortfolioDraft(featuredProjects);
      })
      .catch((err) =>
        console.error("Error fetching freelancer profile:", err)
      );
  }, []);

  const handleChangeProjectField = (index, field, value) => {
    setPortfolioDraft((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // SUBIR IMAGEN A S3 PARA UN PROYECTO
  const handleUploadProjectImage = async (index, file) => {
    if (!file) return;

    setPortfolioError("");
    setPortfolioSuccess("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        "https://workly-cy4b.onrender.com/api/freelancerProfile/portfolio/image",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        setPortfolioError(
          data.message || "Ocurrió un error al subir la imagen."
        );
        return;
      }

      // Guardamos la URL regresada por el backend en el proyecto
      handleChangeProjectField(index, "image_url", data.url);
      setPortfolioSuccess("Imagen subida correctamente.");
    } catch (err) {
      console.error("Error subiendo imagen de proyecto:", err);
      setPortfolioError(
        "Error al conectar con el servidor al subir la imagen."
      );
    }
  };

  const handleAddProject = () => {
    if (portfolioDraft.length >= 5) {
      setPortfolioError("Solo puedes tener hasta 5 proyectos en tu portafolio.");
      return;
    }
    setPortfolioError("");

    setPortfolioDraft((prev) => {
      const next = [
        ...prev,
        { title: "", description: "", link: "", image_url: "" },
      ];
      // expandimos el nuevo
      setExpandedProjectIndex(next.length - 1);
      return next;
    });

    setIsEditingPortfolio(true);
  };

  const handleRemoveProject = (index) => {
    setPortfolioDraft((prev) => prev.filter((_, i) => i !== index));

    // si borramos el que estaba abierto, cerramos el acordeón
    setExpandedProjectIndex((prevIndex) =>
      prevIndex === index ? null : prevIndex > index ? prevIndex - 1 : prevIndex
    );
  };

  const handleCancelPortfolioEdit = () => {
    setPortfolioError("");
    setPortfolioSuccess("");
    setIsEditingPortfolio(false);
    setExpandedProjectIndex(null);
    // restaurar desde profile
    setPortfolioDraft(profile?.featured_projects || []);
  };

  const handleSavePortfolio = async () => {
    setSavingPortfolio(true);
    setPortfolioError("");
    setPortfolioSuccess("");

    // 1) Normalizar + quitar espacios
    const cleanedProjects = portfolioDraft
      .map((p) => ({
        title: (p.title || "").trim(),
        description: (p.description || "").trim(),
        link: (p.link || "").trim(),
        image_url: (p.image_url || "").trim(),
      }))
      // 2) Quitar proyectos totalmente vacíos
      .filter((p) => p.title || p.description || p.link || p.image_url);

    // 3) Si no queda nada, avisar y no guardar
    if (cleanedProjects.length === 0) {
      setSavingPortfolio(false);
      setPortfolioError(
        "Agrega al menos un proyecto con información antes de guardar."
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "https://workly-cy4b.onrender.com/api/freelancerProfile/portfolio",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            featured_projects: cleanedProjects,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setPortfolioError(
          data.message || "Ocurrió un error al guardar el portafolio."
        );
      } else {
        setPortfolioSuccess("Portafolio actualizado correctamente.");
        // actualizar en el perfil
        setProfile((prev) =>
          prev ? { ...prev, featured_projects: cleanedProjects } : prev
        );
        setPortfolioDraft(cleanedProjects);
        setIsEditingPortfolio(false);
        setExpandedProjectIndex(null);
      }
    } catch (err) {
      console.error("Error guardando portafolio:", err);
      setPortfolioError("Error al conectar con el servidor.");
    } finally {
      setSavingPortfolio(false);
    }
  };

  // Helper estrellas
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

  if (!profile) return <p>Cargando perfil de freelancer...</p>;

  // ==== Rating global del freelancer ====
  const ratingValueRaw =
    profile.average_rating ??
    profile.avg_rating ??
    profile.rating ??
    null;

  const ratingValue =
    ratingValueRaw !== null && ratingValueRaw !== undefined
      ? Number(ratingValueRaw)
      : null;

  const ratingCountRaw =
    profile.review_count ??
    profile.reviews_count ?? // 👈 la más probable desde el back
    profile.ratings_count ??
    profile.total_reviews ??
    null;

  const ratingCount =
    ratingCountRaw !== null && ratingCountRaw !== undefined
      ? Number(ratingCountRaw)
      : null;

  const hasRating =
    ratingValue !== null && !Number.isNaN(ratingValue) && ratingValue > 0;

  // ==== Lista de reseñas para mostrar comentarios ====
  const reviewsArray =
    profile.recent_reviews ??
    profile.reviews ??
    profile.last_reviews ??
    [];

  const hasReviewsList =
    Array.isArray(reviewsArray) && reviewsArray.length > 0;

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
            <li>Alias: {profile.alias}</li>
            <li>Idiomas: {(profile.languages || []).join(", ")}</li>
            <li>
              <strong>Disponibilidad:</strong>{" "}
              {profile.preferences?.communication_hours || "No especificada"}
            </li>
            <li>
              Verificación: {profile.verified ? "Verificado" : "Pendiente"}
            </li>
            <li>
              Registro:{" "}
              {new Date(profile.created_at).toLocaleDateString("es-MX", {
                month: "long",
                year: "numeric",
              })}
            </li>
          </ul>

          <Link to="/edit-freelancer-profile" className="edit-profile-btn">
            Editar perfil
          </Link>

          <Link
            to={`/freelancer/${profile.username}`}
            className="public-profile-btn"
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

          {/* RESEÑAS RECIBIDAS */}
          <section className="section-block">
            <h3>Reseñas de clientes</h3>
            {hasReviewsList ? (
              <ul className="reviews-list">
                {reviewsArray.slice(0, 5).map((rev, i) => {
                  const reviewerName =
                    rev.reviewer_name ||
                    rev.client_name ||
                    rev.reviewer ||
                    "Cliente";

                  const projectTitle =
                    rev.project_title ||
                    rev.service_title ||
                    rev.project_name ||
                    null;

                  return (
                    <li key={rev.id || i} className="review-item">
                      <div className="review-header">
                        <div className="review-stars">
                          {renderStars(rev.rating || 0)}
                        </div>
                        <span className="review-meta">
                          {reviewerName}
                          {projectTitle && ` · ${projectTitle}`}
                        </span>
                        <span className="review-date">
                          {rev.created_at &&
                            new Date(rev.created_at).toLocaleDateString(
                              "es-MX"
                            )}
                        </span>
                      </div>
                      <p className="review-comment">
                        {rev.comment && rev.comment.trim() !== ""
                          ? rev.comment
                          : "El cliente solo dejó la calificación numérica."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="section-text muted">
                Aún no has recibido reseñas en tus proyectos completados.
              </p>
            )}
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

          {/* PORTAFOLIO */}
          <section className="section-block">
            <div className="section-header-row">
              <h3>Portafolio</h3>
              {!isEditingPortfolio && (
                <button
                  type="button"
                  className="edit-portfolio-btn"
                  onClick={() => {
                    setPortfolioError("");
                    setPortfolioSuccess("");
                    setIsEditingPortfolio(true);
                    setExpandedProjectIndex(null);
                  }}
                >
                  Editar portafolio
                </button>
              )}
            </div>

            {/* Mensajes */}
            {portfolioError && (
              <p className="section-text portfolio-error">{portfolioError}</p>
            )}
            {portfolioSuccess && (
              <p className="section-text portfolio-success">
                {portfolioSuccess}
              </p>
            )}

            {!isEditingPortfolio ? (
              // Vista solo lectura
              profile.featured_projects?.length > 0 ? (
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
              ) : (
                <p className="section-text muted">
                  Aún no has agregado proyectos a tu portafolio.
                </p>
              )
            ) : (
              // MODO EDICIÓN
              <div className="portfolio-edit-wrapper">
                {portfolioDraft.length === 0 && (
                  <p className="section-text muted">
                    Empieza agregando un proyecto a tu portafolio.
                  </p>
                )}

                {portfolioDraft.map((proj, index) => (
                  <div key={index} className="project-edit-collapse">
                    <button
                      type="button"
                      className={
                        "project-edit-summary" +
                        (expandedProjectIndex === index ? " open" : "")
                      }
                      onClick={() =>
                        setExpandedProjectIndex(
                          expandedProjectIndex === index ? null : index
                        )
                      }
                    >
                      <span className="project-edit-summary-title">
                        {proj.title?.trim() || `Proyecto ${index + 1}`}
                      </span>
                      <span className="project-edit-summary-toggle">
                        {expandedProjectIndex === index ? "Ocultar" : "Editar"}
                      </span>
                    </button>

                    {expandedProjectIndex === index && (
                      <div className="project-edit-card">
                        <div className="portfolio-field">
                          <label>Título</label>
                          <input
                            type="text"
                            value={proj.title || ""}
                            onChange={(e) =>
                              handleChangeProjectField(
                                index,
                                "title",
                                e.target.value
                              )
                            }
                            maxLength={150}
                          />
                        </div>

                        <div className="portfolio-field">
                          <label>Descripción</label>
                          <textarea
                            value={proj.description || ""}
                            onChange={(e) =>
                              handleChangeProjectField(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="portfolio-field">
                          <label>Link (Dribbble, Behance, sitio, etc.)</label>
                          <input
                            type="url"
                            value={proj.link || ""}
                            onChange={(e) =>
                              handleChangeProjectField(
                                index,
                                "link",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="portfolio-field">
                          <label>Imagen del proyecto</label>
                          <label className="upload-image-btn">
                            Subir imagen
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleUploadProjectImage(
                                  index,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>

                          {proj.image_url && (
                            <div className="portfolio-image-preview">
                              <img
                                src={proj.image_url}
                                alt={proj.title || `Proyecto ${index + 1}`}
                              />
                              <small className="muted">
                                Esta imagen se mostrará como portada del
                                proyecto.
                              </small>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="remove-project-btn"
                          onClick={() => handleRemoveProject(index)}
                        >
                          Eliminar proyecto
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {portfolioDraft.length < 5 && (
                  <button
                    type="button"
                    className="add-project-btn"
                    onClick={handleAddProject}
                  >
                    + Agregar proyecto
                  </button>
                )}

                <div className="portfolio-actions-row">
                  <button
                    type="button"
                    className="save-portfolio-btn"
                    onClick={handleSavePortfolio}
                    disabled={savingPortfolio}
                  >
                    {savingPortfolio ? "Guardando..." : "Guardar portafolio"}
                  </button>
                  <button
                    type="button"
                    className="cancel-portfolio-btn"
                    onClick={handleCancelPortfolioEdit}
                    disabled={savingPortfolio}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
