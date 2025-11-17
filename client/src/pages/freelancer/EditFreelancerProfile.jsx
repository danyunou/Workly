import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/editFreelancerProfile.css";
import Navbar from "../../components/FreelancerNavbar";

const LANGUAGES = [
  "Alemán", "Árabe", "Bengalí", "Chino mandarín", "Español",
  "Francés", "Hindi", "Indonesio", "Inglés", "Japonés",
  "Portugués", "Ruso", "Swahili", "Turco", "Urdu"
];

const CATEGORY_OPTIONS = [
  "Artes gráficas y diseño", "Marketing", "Escritura y traduccion", "Video y animacion", "Musica y audio",
  "Programacion y tencología", "Negocios", "Estilo de vida", "Datos", "Fotografía"
];

export default function EditFreelancerProfile() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/profile", {
        headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    })
        .then(res => res.json())
        .then(data => {
        const days = data.communication_hours?.split(", ")?.slice(0, -1) || [];
        const hourRange = data.communication_hours?.match(/(\d+):00\s*-\s*(\d+):00/);
        const start = parseInt(hourRange?.[1]) || 8;
        const end = parseInt(hourRange?.[2]) || 18;

        setForm({
            languages: data.languages || [],
            categories: data.categories || [],
            skills: data.skills || [],
            education: data.education || [],
            website: data.website || "",
            social_links: data.social_links || [],
            selectedDays: days,
            startHour: start,
            endHour: end,
            biography: data.description || "", // <-- importante: description → biography
        });
        });
    }, []);

  useEffect(() => {
    if (!form) return;
    const dias = form.selectedDays.join(", ");
    setForm(prev => ({
        ...prev,
        communication_hours: `${dias}, ${form.startHour}:00 - ${form.endHour}:00`
    }));
    }, [form?.selectedDays, form?.startHour, form?.endHour]);


  const handleSubmit = async () => {
    const body = {
        description: form.biography,
        languages: form.languages,
        categories: form.categories,
        skills: form.skills,
        education: JSON.stringify(form.education),
        website: form.website,
        social_links: form.social_links,
        communication_hours: form.communication_hours
    };

    try {
        const res = await fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/update", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(body)
        });

        const result = await res.json();
        if (res.ok) {
        setMessage("Perfil actualizado correctamente.");
        setTimeout(() => {
            navigate("/freelancer-profile");
        }, 1000);
        } else {
        setError(result.error || "Error al actualizar.");
        }
    } catch (err) {
        setError("Error de conexión.");
    }
    };

  if (!form) return <p>Cargando datos...</p>;

  return (
    <>
    <Navbar />
    <div className="edit-profile-container">
      <h2>Editar Perfil de Freelancer</h2>

      <label>Biografía (50-500 caracteres)</label>
      <textarea
        value={form.biography}
        onChange={e => setForm({ ...form, biography: e.target.value })}
        minLength={50}
        maxLength={500}
      />

      <label>Idiomas</label>
      <select onChange={e => {
        const lang = e.target.value;
        if (!form.languages.includes(lang))
          setForm({ ...form, languages: [...form.languages, lang] });
      }}>
        <option value="">Agregar idioma...</option>
        {LANGUAGES.filter(l => !form.languages.includes(l)).map((lang, i) => (
          <option key={i}>{lang}</option>
        ))}
      </select>
      <div className="language-chips">
        {form.languages.map((lang, i) => (
          <div key={i} className="chip">
            {lang}
            <span onClick={() => setForm({ ...form, languages: form.languages.filter(l => l !== lang) })}>×</span>
          </div>
        ))}
      </div>

      <br></br>
      <label>Categorías (máx. 3)</label>
      <select onChange={e => {
        const cat = e.target.value;
        if (!form.categories.includes(cat) && form.categories.length < 3)
          setForm({ ...form, categories: [...form.categories, cat] });
      }}>
        <option value="">Agregar categoría...</option>
        {CATEGORY_OPTIONS.filter(c => !form.categories.includes(c)).map((cat, i) => (
          <option key={i}>{cat}</option>
        ))}
      </select>
      <div className="language-chips">
        {form.categories.map((cat, i) => (
          <div key={i} className="chip">
            {cat}
            <span onClick={() => setForm({ ...form, categories: form.categories.filter(c => c !== cat) })}>×</span>
          </div>
        ))}
      </div>

      <br></br>
      <label>Skills</label>
      <input
        placeholder="Escribe una skill y presiona Enter"
        onKeyDown={(e) => {
          const val = e.target.value.trim();
          if (e.key === "Enter" && val && val.length <= 50 && !form.skills.includes(val)) {
            e.preventDefault();
            setForm({ ...form, skills: [...form.skills, val] });
            e.target.value = "";
          }
        }}
      />
      <div className="language-chips">
        {form.skills.map((s, i) => (
          <div key={i} className="chip">
            {s}
            <span onClick={() => setForm({ ...form, skills: form.skills.filter(sk => sk !== s) })}>×</span>
          </div>
        ))}
      </div>

        <br></br>
      <label>Educación</label>
      <br></br>
      {form.education.map((edu, i) => (
        <div key={i} className="education-entry">
          <p><strong>{edu.institucion}</strong> - {edu.carrera} ({edu.anio})</p>
          <br></br>
          <button onClick={() => setForm({ ...form, education: form.education.filter((_, idx) => idx !== i) })}>Eliminar</button>
          <br></br><br></br>
        </div>
        
      ))}
      {form.education.length < 3 && (
        <div className="education-form">
          <input placeholder="Institución" id="inst" />
          <input placeholder="Carrera" id="carr" />
          <input placeholder="Año" id="anio" />
          <button onClick={() => {
            const inst = document.getElementById("inst").value.trim();
            const carr = document.getElementById("carr").value.trim();
            const anio = document.getElementById("anio").value.trim();
            if (inst && carr && anio) {
              setForm({ ...form, education: [...form.education, { institucion: inst, carrera: carr, anio }] });
              document.getElementById("inst").value = "";
              document.getElementById("carr").value = "";
              document.getElementById("anio").value = "";
            }
          }}>Agregar</button>
        </div>
      )}

      <br></br>
      <label>Redes Sociales (URL)</label>
      <input
        placeholder="Pega una URL y presiona Enter"
        onKeyDown={(e) => {
          const url = e.target.value.trim();
          if (e.key === "Enter") {
            e.preventDefault();
            try {
              new URL(url);
              if (!form.social_links.includes(url)) {
                setForm({ ...form, social_links: [...form.social_links, url] });
                e.target.value = "";
              }
            } catch {
              setError("URL inválida.");
            }
          }
        }}
      />
      <div className="language-chips">
        {form.social_links.map((link, i) => (
          <div key={i} className="chip">
            {link}
            <span onClick={() => setForm({ ...form, social_links: form.social_links.filter(l => l !== link) })}>×</span>
          </div>
        ))}
      </div>

        <br></br>
      <label>Días disponibles</label>
      <div className="day-buttons">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
          <button
            type="button"
            key={day}
            className={form.selectedDays.includes(day) ? "selected" : ""}
            onClick={() => {
              const newDays = form.selectedDays.includes(day)
                ? form.selectedDays.filter(d => d !== day)
                : [...form.selectedDays, day];
              setForm({ ...form, selectedDays: newDays });
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <label>Hora de inicio: {form.startHour}:00</label>
      <input type="range" min="6" max="22" step="1" value={form.startHour} onChange={(e) => {
        const h = parseInt(e.target.value);
        setForm({ ...form, startHour: h, endHour: Math.max(form.endHour, h + 1) });
      }} />

      <label>Hora de fin: {form.endHour}:00</label>
      <input type="range" min="7" max="23" step="1" value={form.endHour} onChange={(e) => {
        const h = parseInt(e.target.value);
        setForm({ ...form, endHour: Math.max(h, form.startHour + 1) });
      }} />

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <button className="save-btn" onClick={handleSubmit}>Guardar cambios</button>
    </div>
    </>
  );
}
