// client/src/pages/UserProfile.jsx
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
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error("Error fetching user profile:", err));
  }, []);

  if (!user) return <p>Cargando...</p>;

  return (
    <>
        <Navbar />
        <div className="profile-container">
        <div className="profile-left">
            <img src={user.profile_picture} alt="Perfil" className="profile-img" />
            <h3>{user.full_name}</h3>
            <p>@{user.username}</p>
            <ul className="profile-info">
            <li>📍 Ubicado en {user.location || "México"}</li>
            <li>🕒 Se unió en {new Date(user.created_at).toLocaleString("es-MX", { month: "long", year: "numeric" })}</li>
            <li>🗣️ {user.languages || "Español"}</li>
            <li>⏰ {user.communication_hours || "No establecido"}</li>
            </ul>
            <Link to="/edit-profile" className="edit-profile-btn">Editar perfil</Link>
        </div>

        <div className="profile-right">
            <h2>Hola 👋 Ayudemos a los freelancers a conocerte</h2>
            <p>Aprovecha al máximo Workly compartiendo más sobre ti.</p>

            <div className="checklist">
            <div className="checklist-item"> Cómo planeas usar Workly:{" "}{user.usage_preference || "No especificado"}</div>
            <div className="checklist-item"> Biografía: {user.biography || "0%"}</div>
            </div>

            <div className="comments-section">
            <h3>Comentarios de freelancers</h3>
            <p>Aún no tienes comentarios.</p>
            </div>
        </div>
        </div>
    </>
  );
}
