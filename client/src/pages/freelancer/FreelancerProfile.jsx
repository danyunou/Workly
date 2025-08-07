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
      .then(res => res.json())
      .then(data => {
        // Aseguramos que education venga como array
        if (typeof data.education === "string") {
          try {
            data.education = JSON.parse(data.education);
          } catch (e) {
            data.education = [];
          }
        }
        setProfile(data);
      })
      .catch(err => console.error("Error fetching freelancer profile:", err));
  }, []);

  if (!profile) return <p>Cargando perfil de freelancer...</p>;

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <div className="profile-left">
          <img src={profile.profile_picture} alt="Perfil" className="profile-img" />
          <h3>{profile.full_name}</h3>
          <p>@{profile.username}</p>
          <ul className="profile-info">
            <li>🆔 Alias: {profile.alias}</li>
            <li>📍 Idiomas: {(profile.languages || []).join(", ")}</li>
            <li><strong>🕒 Disponibilidad:</strong> {profile.preferences?.communication_hours || "No especificada"}</li>
            <li>✅ Verificación: {profile.verified ? "Verificado" : "Pendiente"}</li>
            <li>📅 Registro: {new Date(profile.created_at).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</li>
          </ul>
          <Link to="/edit-freelancer-profile" className="edit-profile-btn">Editar perfil</Link>
        </div>

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
                        <strong>{edu.institution}</strong> — {edu.degree} ({edu.year})
                    </li>
                    ))}
                </ul>
                ) : (
                <p className="section-text">No hay registros educativos.</p>
                )}
            </section>

            {profile.categories?.length > 0 && (
                <section className="section-block">
                <h3>📂 Categorías</h3>
                <ul className="section-list">
                    {profile.categories.map((cat, i) => (
                    <li key={i}>{cat}</li>
                    ))}
                </ul>
                </section>
            )}

            {profile.skills?.length > 0 && (
                <section className="section-block">
                <h3>💻 Skills</h3>
                <ul className="section-list">
                    {profile.skills.map((skill, i) => (
                    <li key={i}>{skill}</li>
                    ))}
                </ul>
                </section>
            )}

            {profile.website && (
                <section className="section-block">
                <h3>🌐 Sitio web</h3>
                <a href={profile.website} target="_blank" rel="noreferrer" className="section-link">
                    {profile.website}
                </a>
                </section>
            )}

            {profile.social_links?.length > 0 && (
                <section className="section-block">
                <h3>🔗 Redes Sociales</h3>
                <ul className="section-list">
                    {profile.social_links.map((link, i) => (
                    <li key={i}>
                        <a href={link} target="_blank" rel="noreferrer" className="section-link">
                        {link}
                        </a>
                    </li>
                    ))}
                </ul>
                </section>
            )}
        </div>


      </div>
    </>
  );
}
