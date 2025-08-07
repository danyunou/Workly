import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/myProjects.css";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios.get("https://workly-cy4b.onrender.com/api/projects/my-projects", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setProjects(res.data))
    .catch(err => console.error("Error al cargar proyectos:", err));
  }, []);

  return (
    <div className="projects-container">
      <h2>Mis proyectos</h2>
      {projects.length === 0 ? (
        <p>No tienes proyectos por ahora.</p>
      ) : (
        <div className="projects-list">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <h3>{project.service_title}</h3>
              <p><strong>Estado:</strong> {project.status}</p>
              <p><strong>Iniciado:</strong> {new Date(project.started_at).toLocaleDateString()}</p>
              <p><strong>Con:</strong> {project.freelancer_name || project.client_name}</p>
              <Link to={`/projects/${project.id}`}>
                <p><strong>Ver proyecto</strong></p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
