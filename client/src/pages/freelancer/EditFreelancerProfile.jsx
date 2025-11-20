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

// 0..23
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function EditFreelancerProfile() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [allDay, setAllDay] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(
          "https://workly-cy4b.onrender.com/api/freelancerProfile/profile",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();

        // Leer horario desde preferences o plano
        const ch =
          data.preferences?.communication_hours ||
          data.communication_hours ||
          "";

        let selectedDays = [];
        let start = 8;
        let end = 18;

        if (ch) {
          // "Viernes, Jueves, Miércoles, Martes, Lunes, 10:00 - 16:00"
          const timeMatch = ch.match(
            /(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/
          );
          if (timeMatch) {
            start = parseInt(timeMatch[1], 10);
            end = parseInt(timeMatch[2], 10);
          }

          const lastComma = ch.lastIndexOf(",");
          if (lastComma !== -1) {
            const daysStr = ch.slice(0, lastComma);
            selectedDays = daysStr
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean);
          }
        }

        const isAllDay = start === 0 && end === 23;
        setAllDay(isAllDay);

        setForm({
          languages: data.languages || [],
          categories: data.categories || [],
          skills: data.skills || [],
          education: data.education || [],
          website: data.website || "",
          social_links: data.social_links || [],
          selectedDays,
          startHour: start,
          endHour: end,
          biography: data.description || "",
          profileImageUrl:
            data.profile_picture_url || data.profile_picture || "",
        });

        setPreviewImage(
          data.profile_picture_url || data.profile_picture || ""
        );
      } catch (err) {
        setError("Error al cargar el perfil.");
      }
    };

    fetchProfile();
  }, []);

  const buildCommunicationHours = () => {
    if (!form.selectedDays.length) return "";
    const dias = form.selectedDays.join(", ");
    return `${dias}, ${form.startHour}:00 - ${form.endHour}:00`;
  };

  const handleSubmit = async () => {
    if (!form) return;

    setError("");
    setMessage("");

    const body = {
      description: form.biography,
      languages: form.languages,
      categories: form.categories,
      skills: form.skills,
      education: JSON.stringify(form.education),
      website: form.website,
      social_links: form.social_links,
      communication_hours: buildCommunicationHours(),
    };

    try {
      // 1. Actualizar perfil de freelancer
      const res = await fetch(
        "https://workly-cy4b.onrender.com/api/freelancerProfile/update",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(body),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Error al actualizar el perfil de freelancer.");
        return;
      }

      // 2. Si hay nueva imagen, llamamos al endpoint de usuarios
      if (form.profile_picture) {
        const formData = new FormData();
        formData.append("profile_picture", form.profile_picture);

        const imgRes = await fetch(
          "https://workly-cy4b.onrender.com/api/users/profile",
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
          }
        );

        const imgResult = await imgRes.json();

        if (!imgRes.ok) {
          // El perfil de freelancer sí se actualizó, pero falló la foto
          setError(
            imgResult.error ||
              "Perfil actualizado, pero hubo un error al actualizar la foto."
          );
          return;
        }
      }

      setMessage("Perfil actualizado correctamente.");
      setTimeout(() => {
        navigate("/freelancer-profile");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Error de conexión.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm({ ...form, profile_picture: file });
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
  };

  if (!form) return <p>Cargando datos...</p>;

  return (
    <>
      <Navbar />
      <div className="edit-profile-container">
        <h2>Editar Perfil de Freelancer</h2>

        {/* FOTO DE PERFIL */}
        <div className="avatar-section">
          <div className="avatar-wrapper">
            {previewImage ? (
              <img src={previewImage} alt="Foto de perfil" />
            ) : (
              <div className="avatar-placeholder">Foto</div>
            )}
          </div>
          <label className="avatar-button">
            Cambiar foto
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImageChange}
              hidden
            />
          </label>
        </div>

        {/* BIOGRAFÍA */}
        <label>Biografía (50-500 caracteres)</label>
        <textarea
          value={form.biography}
          onChange={(e) =>
            setForm({ ...form, biography: e.target.value })
          }
          minLength={50}
          maxLength={500}
        />

        {/* IDIOMAS */}
        <label>Idiomas</label>
        <select
          onChange={(e) => {
            const lang = e.target.value;
            if (lang && !form.languages.includes(lang)) {
              setForm({
                ...form,
                languages: [...form.languages, lang],
              });
            }
          }}
        >
          <option value="">Agregar idioma...</option>
          {LANGUAGES.filter((l) => !form.languages.includes(l)).map(
            (lang, i) => (
              <option key={i}>{lang}</option>
            )
          )}
        </select>
        <div className="language-chips">
          {form.languages.map((lang, i) => (
            <div key={i} className="chip">
              {lang}
              <span
                onClick={() =>
                  setForm({
                    ...form,
                    languages: form.languages.filter(
                      (l) => l !== lang
                    ),
                  })
                }
              >
                ×
              </span>
            </div>
          ))}
        </div>

        {/* CATEGORÍAS */}
        <label>Categorías (máx. 3)</label>
        <select
          onChange={(e) => {
            const cat = e.target.value;
            if (
              cat &&
              !form.categories.includes(cat) &&
              form.categories.length < 3
            ) {
              setForm({
                ...form,
                categories: [...form.categories, cat],
              });
            }
          }}
        >
          <option value="">Agregar categoría...</option>
          {CATEGORY_OPTIONS.filter(
            (c) => !form.categories.includes(c)
          ).map((cat, i) => (
            <option key={i}>{cat}</option>
          ))}
        </select>
        <div className="language-chips">
          {form.categories.map((cat, i) => (
            <div key={i} className="chip">
              {cat}
              <span
                onClick={() =>
                  setForm({
                    ...form,
                    categories: form.categories.filter(
                      (c) => c !== cat
                    ),
                  })
                }
              >
                ×
              </span>
            </div>
          ))}
        </div>

        {/* SKILLS */}
        <label>Skills</label>
        <input
          placeholder="Escribe una skill y presiona Enter"
          onKeyDown={(e) => {
            const val = e.target.value.trim();
            if (
              e.key === "Enter" &&
              val &&
              val.length <= 50 &&
              !form.skills.includes(val)
            ) {
              e.preventDefault();
              setForm({
                ...form,
                skills: [...form.skills, val],
              });
              e.target.value = "";
            }
          }}
        />
        <div className="language-chips">
          {form.skills.map((s, i) => (
            <div key={i} className="chip">
              {s}
              <span
                onClick={() =>
                  setForm({
                    ...form,
                    skills: form.skills.filter(
                      (sk) => sk !== s
                    ),
                  })
                }
              >
                ×
              </span>
            </div>
          ))}
        </div>

        {/* EDUCACIÓN */}
        <label>Educación</label>
        {form.education.map((edu, i) => (
          <div key={i} className="education-entry">
            <p>
              <strong>{edu.institucion}</strong> - {edu.carrera} (
              {edu.anio})
            </p>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  education: form.education.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            >
              Eliminar
            </button>
          </div>
        ))}

        {form.education.length < 3 && (
          <div className="education-form">
            <input placeholder="Institución" id="inst" />
            <input placeholder="Carrera" id="carr" />
            <input placeholder="Año" id="anio" />
            <button
              type="button"
              onClick={() => {
                const inst = document
                  .getElementById("inst")
                  .value.trim();
                const carr = document
                  .getElementById("carr")
                  .value.trim();
                const anio = document
                  .getElementById("anio")
                  .value.trim();
                if (inst && carr && anio) {
                  setForm({
                    ...form,
                    education: [
                      ...form.education,
                      { institucion: inst, carrera: carr, anio },
                    ],
                  });
                  document.getElementById("inst").value = "";
                  document.getElementById("carr").value = "";
                  document.getElementById("anio").value = "";
                }
              }}
            >
              Agregar
            </button>
          </div>
        )}

        {/* REDES */}
        <label>Redes Sociales (URL)</label>
        <input
          placeholder="Pega una URL y presiona Enter"
          onKeyDown={(e) => {
            const url = e.target.value.trim();
            if (e.key === "Enter") {
              e.preventDefault();
              if (!url) return;
              try {
                new URL(url);
                if (!form.social_links.includes(url)) {
                  setForm({
                    ...form,
                    social_links: [...form.social_links, url],
                  });
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
              <span
                onClick={() =>
                  setForm({
                    ...form,
                    social_links: form.social_links.filter(
                      (l) => l !== link
                    ),
                  })
                }
              >
                ×
              </span>
            </div>
          ))}
        </div>

        {/* DÍAS DISPONIBLES */}
        <label>Días disponibles</label>
        <div className="day-buttons">
          {[
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ].map((day) => (
            <button
              type="button"
              key={day}
              className={
                form.selectedDays.includes(day) ? "selected" : ""
              }
              onClick={() => {
                const newDays = form.selectedDays.includes(day)
                  ? form.selectedDays.filter((d) => d !== day)
                  : [...form.selectedDays, day];
                setForm({ ...form, selectedDays: newDays });
              }}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* HORARIO – selects + toggle 24h */}
        <label>Horario laboral</label>
        <div className="hour-row">
          <div className="hour-field">
            <span>De</span>
            <select
              disabled={allDay}
              value={form.startHour}
              onChange={(e) => {
                const h = parseInt(e.target.value, 10);
                setForm((prev) => ({
                  ...prev,
                  startHour: h,
                  endHour:
                    prev.endHour <= h ? h + 1 : prev.endHour,
                }));
              }}
            >
              {HOURS.slice(0, 23).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>

          <div className="hour-field">
            <span>a</span>
            <select
              disabled={allDay}
              value={form.endHour}
              onChange={(e) => {
                const h = parseInt(e.target.value, 10);
                setForm((prev) => ({
                  ...prev,
                  endHour: h,
                }));
              }}
            >
              {HOURS.filter((h) => h > form.startHour).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>
        </div>

<div className="all-day-row">
  <input
    type="checkbox"
    id="allDay"
    checked={allDay}
    onChange={(e) => {
      const checked = e.target.checked;
      setAllDay(checked);
      setForm((prev) =>
        checked
          ? { ...prev, startHour: 0, endHour: 23 }
          : { ...prev, startHour: 9, endHour: 18 }
      );
    }}
  />
  <label htmlFor="allDay" className="all-day-label">
    Disponible 24 horas
  </label>
</div>



        {message && <p className="success-msg">{message}</p>}
        {error && <p className="error-msg">{error}</p>}

        {/* BOTONES ACCIÓN */}
        <div className="actions-row">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/freelancer-profile")}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="save-btn"
            onClick={handleSubmit}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  );
}
