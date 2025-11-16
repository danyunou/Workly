import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../styles/freelancerRegister.css";

const LANGUAGES = [
  "Alemán", "Árabe", "Bengalí", "Chino mandarín", "Español",
  "Francés", "Hindi", "Indonesio", "Inglés", "Japonés",
  "Portugués", "Ruso", "Swahili", "Turco", "Urdu"
];

const CATEGORY_OPTIONS = [
  "Artes gráficas y diseño", "Marketing", "Escritura y traduccion", "Video y animacion", "Musica y audio", 
  "Programacion y tencología", "Negocios", "Estilo de vida", "Datos", "Fotografía"
];

export default function FreelancerRegister() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "",
    alias: "",
    profile_picture: null,
    description: "",
    languages: [],
    categories: [],
    skills: [],
    education: [],
    website: "",
    social_links: [],
    verification_file: null,
  });

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState("");


  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://workly-cy4b.onrender.com/api/freelancerProfile/status", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error("No se pudo obtener el estado");
        const data = await res.json();
        setStatus(data.status || "not_submitted");
        if (data.status === "rejected" && data.rejection_message) {
          setRejectionMessage(data.rejection_message);
        } else {
          setRejectionMessage("");
        }
      } catch (err) {
        console.error("Error al verificar estado del perfil:", err);
        setStatus("not_submitted");
      }
    };

    fetchStatus();
  }, []);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("");
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    if (selected && !form.languages.includes(selected)) {
      setForm({ ...form, languages: [...form.languages, selected] });
    }
  };

  const handleRemoveLanguage = (lang) => {
    setForm({ ...form, languages: form.languages.filter(l => l !== lang) });
  };

  const isValidURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateStep1 = () => {
    const nameRegex = /^[A-Za-z\s]{2,}$/;
    const aliasRegex = /^[A-Za-z0-9]{3,20}$/;
    const file = form.profile_picture;
    const hasLinks = /(http|www)/.test(form.description);

    return (
      nameRegex.test(form.full_name) &&
      aliasRegex.test(form.alias) &&
      file && ["image/jpeg", "image/png"].includes(file.type) && file.size <= 2 * 1024 * 1024 &&
      form.description.length >= 50 && form.description.length <= 500 && !hasLinks &&
      form.languages.length > 0 
    );
  };

  const validateStep2 = () => {
    const cats = form.categories;
    const skills = form.skills;
    const educationList = form.education;
    const socials = form.social_links;

    return (
      Array.isArray(cats) && cats.length > 0 && cats.length <= 3 &&
      Array.isArray(skills) && skills.length > 0 && skills.every(s => s.length <= 50) &&
      Array.isArray(educationList) && educationList.length <= 3 &&
      (!form.website || isValidURL(form.website)) && // ✅ website opcional
      (
        socials.length === 0 ||                      // ✅ redes sociales opcionales
        (Array.isArray(socials) && socials.every(link => isValidURL(link)))
      )
    );
  };

  const validateStep3 = () => {
    const file = form.verification_file;
    return file && ["image/jpeg", "image/png", "application/pdf"].includes(file.type) && file.size <= 5 * 1024 * 1024;
  };

  const handleNext = () => {
    if (status === "verified") return setError("Tu perfil ya fue verificado.");
    if (status === "pending") return setError("Perfil ya enviado, espera validación.");
    if (step === 1 && validateStep1()) return setStep(2);
    if (step === 2 && validateStep2()) return setStep(3);
    if (step === 3 && validateStep3()) return handleSubmit();
    setError("Completa correctamente todos los campos.");
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      // Validación manual de archivos
      const profile = form.profile_picture;
      const idFile = form.verification_file;

      if (!profile || !["image/jpeg", "image/png"].includes(profile.type) || profile.size > 2 * 1024 * 1024) {
        setError("La foto de perfil debe ser JPG o PNG y pesar menos de 2MB.");
        return;
      }

      if (!idFile || !["image/jpeg", "image/png", "application/pdf"].includes(idFile.type) || idFile.size > 15 * 1024 * 1024) {
        setError("El archivo de verificación debe ser PDF, JPG o PNG y pesar menos de 15MB.");
        return;
      }

      const formData = new FormData();

      for (let key in form) {
        if (key === "education") {
          formData.append("education", JSON.stringify(form.education));
        } else if (Array.isArray(form[key])) {
          formData.append(key, form[key].join(","));
        } else if (key === "profile_picture" || key === "verification_file") {
          formData.append(key, form[key]); // Ya validados
        } else {
          formData.append(key, form[key]);
        }
      }

      const res = await fetch("https://workly-cy4b.onrender.com/api/freelancerProfile", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await res.json();

      if (res.ok) {
        setMessage("Perfil enviado. Será validado por un administrador.");
        setStatus("pending");
      } else {
        setError(result.error || "Error al enviar.");
      }

    } catch (err) {
      setError("Error en la conexión.");
      console.error(err);
    }
  };

  return (
    <>
      <Navbar />

      {status === "pending" && (
        <div className="freelancer-register-container">
          <h2>Solicitud enviada</h2>
          <p className="info-message">Tu solicitud está pendiente de revisión.</p>
        </div>
      )}

      {status === "verified" && (
        <div className="freelancer-register-container">
          <h2>Perfil verificado</h2>
          <p className="success-message">Ya puedes usar tu cuenta como freelancer.</p>
        </div>
      )}

      {(status === "not_submitted" || status === "rejected") && (
        <>
          {<div className="freelancer-register-container">
      <h2>Registro como Freelancer</h2>

      <div className="progress-bar">
        <div className={`progress-step ${step >= 1 ? "active" : ""}`}></div>
        <div className={`progress-step ${step >= 2 ? "active" : ""}`}></div>
        <div className={`progress-step ${step === 3 ? "active" : ""}`}></div>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      {status === "rejected" && rejectionMessage && (
        <p className="error-message">Tu solicitud fue rechazada: {rejectionMessage}</p>
      )}
      {status === "rejected" && (
        <p className="info-message">Puedes corregir los datos y volver a enviar el formulario.</p>
      )}

      {/* Paso 1: Info Personal */}
      {step === 1 && (
        <div className="step-section">
          <br />
          <h3>1. Información Personal</h3>
          <input placeholder="Nombre completo" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Apodo (alias)" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} />


<label
  htmlFor="profile_picture"
  className="form-label"
>
  Foto de perfil (JPG o PNG, máx. 2MB):
</label>

<div className="file-field">
  <input
    id="profile_picture"
    name="profile_picture"
    type="file"
    accept="image/jpeg,image/png"
    className="file-input"
    onChange={(e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      // usamos la versión "prev" para evitar problemas de estado
      setForm((prev) => ({
        ...prev,
        profile_picture: file,
      }));
    }}
  />

  <p className="file-help">
    {form.profile_picture
      ? form.profile_picture.name
      : "Aún no has seleccionado un archivo"}
  </p>
</div>



          <textarea placeholder="Descripción (mínimo 50 caracteres, sin enlaces)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          <label>Idiomas que hablas:</label>
          <div className="language-selector">
            <select onChange={handleLanguageChange} value="">
              <option value="" disabled>Selecciona un idioma...</option>
              {LANGUAGES.filter(lang => !form.languages.includes(lang)).map((lang, i) => (
                <option key={i} value={lang}>{lang}</option>
              ))}
            </select>

            <div className="language-chips">
              {form.languages.map((lang, i) => (
                <div key={i} className="chip">
                  {lang}
                  <span className="remove" onClick={() => handleRemoveLanguage(lang)}>×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Info Profesional */}
      {step === 2 && (
        <div className="step-section">
          <br />
          <h3>2. Información Profesional</h3>

          <label>Categorías (máx. 3):</label>
          <select
            value=""
            onChange={(e) => {
              const selected = e.target.value;
              if (!form.categories.includes(selected) && form.categories.length < 3) {
                setForm({ ...form, categories: [...form.categories, selected] });
              }
            }}
          >
            <option disabled value="">Selecciona una categoría...</option>
            {CATEGORY_OPTIONS.filter(c => !form.categories.includes(c)).map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="language-chips">
            {form.categories.map((cat, i) => (
              <div key={i} className="chip">
                {cat}
                <span className="remove" onClick={() =>
                  setForm({ ...form, categories: form.categories.filter(c => c !== cat) })
                }>×</span>
              </div>
            ))}
          </div>

          <label>Skills (máx. 50 caracteres c/u):</label>
          <div className="input-add-chip">
            <input
              placeholder="Escribe una skill y presiona Enter"
              onKeyDown={(e) => {
                const skill = e.target.value.trim();
                if (e.key === "Enter" && skill && skill.length <= 50 && !form.skills.includes(skill)) {
                  e.preventDefault();
                  setForm({ ...form, skills: [...form.skills, skill] });
                  e.target.value = "";
                }
              }}
            />
          </div>
          <div className="language-chips">
            {form.skills.map((s, i) => (
              <div key={i} className="chip">
                {s}
                <span className="remove" onClick={() =>
                  setForm({ ...form, skills: form.skills.filter(skill => skill !== s) })
                }>×</span>
              </div>
            ))}
          </div>

          <label>Educación (máx. 3 entradas):</label>
          {form.education.map((edu, i) => (
            <div key={i} className="education-entry">
              <div className="education-text">
                <strong>{edu.institucion}</strong> - {edu.carrera} ({edu.anio})
              </div>
              <button
                type="button"
                className="education-remove-button"
                onClick={() =>
                  setForm({ ...form, education: form.education.filter((_, idx) => idx !== i) })
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
                className="education-add-button"
                onClick={() => {
                  const inst = document.getElementById("inst").value.trim();
                  const carr = document.getElementById("carr").value.trim();
                  const anio = document.getElementById("anio").value.trim();
                  if (inst && carr && anio) {
                    setForm({
                      ...form,
                      education: [...form.education, { institucion: inst, carrera: carr, anio }]
                    });
                    document.getElementById("inst").value = "";
                    document.getElementById("carr").value = "";
                    document.getElementById("anio").value = "";
                  }
                }}
              >
                Agregar educación
              </button>
            </div>
          )}


          <label>Redes sociales (URL):</label>
          <div className="input-add-chip">
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
          </div>
          <div className="language-chips">
            {form.social_links.map((url, i) => (
              <div key={i} className="chip">
                {url}
                <span className="remove" onClick={() =>
                  setForm({ ...form, social_links: form.social_links.filter(link => link !== url) })
                }>×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paso 3: Verificación */}
      {step === 3 && (
        <div className="step-section">
          <br />
          <h3>3. Verificación de Identidad</h3>
          <p>Sube tu identificación oficial (PDF, JPG o PNG. Máx. 5MB)</p>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, verification_file: e.target.files[0] })} />
        </div>
      )}

      <div className="button-group">
        {step > 1 && (
          <button
            type="button"
            className="back-button"
            onClick={handleBack}
          >
            Anterior
          </button>
        )}

        <button
          type="button"
          className="submit-button"
          onClick={step < 3 ? handleNext : handleSubmit}
        >
          {step < 3 ? "Siguiente" : "Enviar"}
        </button>
      </div>

    </div>}
        </>
      )}
    </>
  );
}
