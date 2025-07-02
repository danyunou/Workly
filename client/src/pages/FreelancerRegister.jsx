import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/freelancerRegister.css";

export default function FreelancerRegister() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "",
    alias: "",
    profile_picture: null,
    description: "",
    languages: "",
    categories: "",
    skills: "",
    education: "",
    website: "",
    social_links: "",
    verification_file: null,
  });

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/freelancerProfile/status", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) throw new Error("No se pudo obtener el estado");

        const data = await res.json();
        setStatus(data.status || "not_submitted");
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
      form.languages.trim()
    );
  };

  const validateStep2 = () => {
    const cats = form.categories.split(",").map(c => c.trim()).filter(Boolean);
    const skills = form.skills.split(",").map(s => s.trim());
    let educationList;
    try {
      educationList = JSON.parse(form.education);
    } catch {
      educationList = [];
    }
    const socials = form.social_links.split(",").map(s => s.trim());

    return (
      cats.length > 0 && cats.length <= 3 &&
      skills.length > 0 && skills.every(s => s.length <= 50) &&
      Array.isArray(educationList) && educationList.length <= 3 &&
      isValidURL(form.website) &&
      socials.every(link => isValidURL(link))
    );
  };

  const validateStep3 = () => {
    const file = form.verification_file;
    return file && ["image/jpeg", "image/png", "application/pdf"].includes(file.type) && file.size <= 5 * 1024 * 1024;
  };

  const handleNext = () => {
    if (status === "verified" || status === "pending") {
      setError("Ya tienes un perfil enviado o verificado.");
      return;
    }

    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      handleSubmit();
    } else {
      setError("Completa correctamente todos los campos.");
    }
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      for (let key in form) {
        formData.append(key, form[key]);
      }

      const res = await fetch("http://localhost:5000/api/freelancerProfile", {
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
      <div className="freelancer-register-container">
        <h2>Registro como Freelancer</h2>

        {/* Progress bar visual */}
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? "active" : ""}`}></div>
          <div className={`progress-step ${step >= 2 ? "active" : ""}`}></div>
          <div className={`progress-step ${step === 3 ? "active" : ""}`}></div>
        </div>

        {/* Mensajes */}
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        {step === 1 && (
          <div className="step-section">
            <h3>1. Información Personal</h3>
            <input placeholder="Nombre completo" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <input placeholder="Apodo (alias)" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} />
            <input placeholder="Foto de Perfil" type="file" accept="image/jpeg,image/png" onChange={e => setForm({ ...form, profile_picture: e.target.files[0] })} />
            <textarea placeholder="Descripción (mínimo 50 caracteres, sin enlaces)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input placeholder="Idiomas (separados por coma)" value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })} />
          </div>
        )}

        {step === 2 && (
          <div className="step-section">
            <h3>2. Información Profesional</h3>
            <input placeholder="Categorías (máx. 3, separadas por coma)" value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} />
            <input placeholder="Skills (separadas por coma, máx. 50 caracteres c/u)" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
            <textarea placeholder='Educación (formato JSON)' value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} />
            <input placeholder="Sitio web personal" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            <input placeholder="Redes sociales (URLs separadas por coma)" value={form.social_links} onChange={e => setForm({ ...form, social_links: e.target.value })} />
          </div>
        )}

        {step === 3 && (
          <div className="step-section">
            <h3>3. Verificación de Identidad</h3>
            <p>Sube tu identificación oficial (PDF, JPG o PNG. Máx. 5MB)</p>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setForm({ ...form, verification_file: e.target.files[0] })} />
          </div>
        )}

        <button className="submit-button" onClick={handleNext}>
          {step < 3 ? "Siguiente" : "Enviar"}
        </button>
      </div>
    </>
  );
}
