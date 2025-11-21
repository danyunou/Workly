import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/home.css";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // Campos de la solicitud
  const [requestMessage, setRequestMessage] = useState("");
  const [proposedDeadline, setProposedDeadline] = useState("");
  const [proposedBudget, setProposedBudget] = useState("");
  const [isDeadlineFlexible, setIsDeadlineFlexible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Mensaje dentro del modal (éxito / info / error)
  const [requestAlert, setRequestAlert] = useState(null);
  // { type: 'info' | 'error' | 'success', message: string }

  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/services")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  const handleExplore = (categoryId) => {
    navigate(`/services?category=${categoryId}`);
  };

  const handleGoToFreelancer = (username) => {
    if (!username) return;
    navigate(`/freelancer/${username}`);
  };

  const openServiceModal = (service) => {
    setSelectedService(service);
    setIsModalClosing(false);
    setIsModalOpen(true);

    // Limpiar / setear valores por defecto del formulario
    setRequestMessage("");
    setProposedDeadline("");
    setProposedBudget(service?.price ? String(service.price) : "");
    setIsDeadlineFlexible(false);
    setIsSubmitting(false);
    setRequestAlert(null); // 🔹 limpiar mensaje previo
  };

  const startCloseModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSelectedService(null);
      setIsModalClosing(false);
      setRequestMessage("");
      setProposedDeadline("");
      setProposedBudget("");
      setIsDeadlineFlexible(false);
      setIsSubmitting(false);
      setRequestAlert(null); // 🔹 limpiar mensaje
    }, 200);
  };

  const getMinDeadline = () => {
    if (!selectedService) return "";

    const days = Number(selectedService.delivery_time_days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);

    if (!Number.isFinite(days) || days <= 0) {
      // fallback: al menos mañana si no hay delivery_time_days
      minDate.setDate(minDate.getDate() + 1);
    } else {
      // mínimo: hoy + delivery_time_days
      minDate.setDate(minDate.getDate() + days);
    }

    return minDate.toISOString().split("T")[0];
  };

  const handleSendRequestFromModal = async () => {
    if (!selectedService || isSubmitting) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Necesitas iniciar sesión para solicitar este servicio.");
      navigate("/login");
      return;
    }

    if (!requestMessage.trim()) {
      alert("Por favor describe qué necesitas en el mensaje.");
      return;
    }

    const minDeadline = getMinDeadline();

    if (proposedDeadline && minDeadline && proposedDeadline < minDeadline) {
      alert(
        `La fecha límite no puede ser anterior a ${minDeadline.replaceAll(
          "-",
          "/"
        )}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setRequestAlert(null); // limpiar mensajes anteriores

      await axios.post(
        `https://workly-cy4b.onrender.com/api/services/hire/${selectedService.id}`,
        {
          message: requestMessage,
          proposed_deadline: proposedDeadline || null,
          proposed_budget: proposedBudget || null,
          // deadline_flexible: isDeadlineFlexible,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRequestAlert({
        type: "success",
        message: "Tu solicitud fue enviada al freelancer. Te avisaremos cuando la acepte.",
      });

      // Cierra el modal automáticamente después de 2.5s
      setTimeout(() => {
        startCloseModal();
      }, 2500);
    } catch (err) {
      console.error("Error al enviar la solicitud:", err);

      // 🔹 Manejo específico para 'ya tienes una solicitud activa'
      if (err.response?.status === 409) {
        const msgBack =
          err.response.data?.error ||
          "Ya tienes una solicitud activa para este servicio.";
        setRequestAlert({
          type: "info",
          message: `${msgBack} Podrás gestionarla desde la sección "Mis propuestas".`,
        });
      } else {
        const msg =
          err.response?.data?.error ||
          "Hubo un error al enviar la solicitud. Inténtalo de nuevo.";
        setRequestAlert({
          type: "error",
          message: msg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="home-body">
        <div className="home-inner">
          <h2 className="home-title">Servicios para ti</h2>

          {categories.map((cat) => (
            <div className="category-section" key={cat.category}>
              <div className="category-header">
                <h3 className="category-title">{cat.category}</h3>
                {/* <button
                  className="explore-btn"
                  onClick={() => handleExplore(cat.category_id)}
                >
                  Ver todo
                </button> */}
              </div>

              <div className="services-scroll">
                {cat.services.map((service) => (
                  <div
                    className="service-card"
                    key={service.id}
                    onClick={() => openServiceModal(service)}
                  >
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="service-image"
                    />

                    <div className="service-details">
                      <h4 className="service-title">{service.title}</h4>

                      <button
                        type="button"
                        className="service-freelancer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoToFreelancer(service.username);
                        }}
                      >
                        {service.profile_picture && (
                          <img
                            src={service.profile_picture}
                            alt={service.user_alias || service.username}
                            className="service-avatar"
                          />
                        )}

                        <span className="service-user">
                          @{service.user_alias || service.username}
                        </span>
                      </button>

                      <div className="service-metrics compact-metrics">
                        <span className="metric-item">
                          ⭐ {Number(service.rating_avg || 0).toFixed(1)}
                        </span>
                        <span className="metric-item">
                          📦 {service.completed_orders || 0}
                        </span>
                        <span className="metric-item">
                          ⏱️ {service.delivery_time_days} días
                        </span>
                      </div>

                      <p className="service-price">
                        Desde ${service.price} USD
                      </p>

                      <button
                        className="hire-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openServiceModal(service);
                        }}
                      >
                        Ver detalles y solicitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {isModalOpen && selectedService && (
            <div
              className={`service-modal-backdrop ${
                isModalClosing ? "closing" : ""
              }`}
              onClick={startCloseModal}
            >
              <div
                className={`service-modal ${
                  isModalClosing ? "closing" : ""
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="service-modal-close"
                  onClick={startCloseModal}
                >
                  ✕
                </button>

                <div className="service-modal-header">
                  <h2>{selectedService.title}</h2>
                  <span className="service-modal-category">
                    {selectedService.category}
                  </span>
                </div>

                <img
                  src={selectedService.image_url}
                  alt={selectedService.title}
                  className="service-modal-image"
                />

                <div className="service-modal-body">
                  <p>
                    <strong>Descripción:</strong>{" "}
                    {selectedService.description}
                  </p>

                  <div className="service-modal-meta">
                    <span>
                      ⏱️ Entrega estimada:{" "}
                      {selectedService.delivery_time_days} días
                    </span>
                    <span>
                      ⭐ {Number(selectedService.rating_avg || 0).toFixed(1)} ·{" "}
                      {selectedService.completed_orders || 0} pedidos
                    </span>
                  </div>

                  <p className="service-modal-price">
                    Desde ${selectedService.price} USD
                  </p>

                  <div className="service-modal-form">
                    {/* 🔹 Mensaje dentro del modal */}
                    {requestAlert && (
                      <div
                        className={`service-modal-alert service-modal-alert--${requestAlert.type}`}
                      >
                        {requestAlert.message}
                      </div>
                    )}

                    <h3>Cuéntale al freelancer qué necesitas</h3>

                    <label className="service-modal-label">
                      Mensaje para el freelancer <span>*</span>
                      <textarea
                        className="service-modal-textarea"
                        placeholder="Describe tu proyecto, objetivos, referencias, etc."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                      />
                    </label>

                    <div className="service-modal-form-row">
                      <label className="service-modal-label">
                        Fecha límite (opcional)
                        <input
                          type="date"
                          className="service-modal-input"
                          value={proposedDeadline}
                          onChange={(e) =>
                            setProposedDeadline(e.target.value)
                          }
                          min={getMinDeadline()}
                        />
                      </label>

                      <label className="service-modal-label">
                        Presupuesto aproximado (opcional)
                        <input
                          type="number"
                          min="0"
                          className="service-modal-input"
                          placeholder="USD"
                          value={proposedBudget}
                          onChange={(e) =>
                            setProposedBudget(e.target.value)
                          }
                        />
                      </label>
                    </div>

                    <label className="service-modal-flex-row">
                      <input
                        type="checkbox"
                        checked={isDeadlineFlexible}
                        onChange={(e) =>
                          setIsDeadlineFlexible(e.target.checked)
                        }
                      />
                      <span>Soy flexible con la fecha límite</span>
                    </label>
                  </div>
                </div>

                <div className="service-modal-actions">
                  <button
                    className="service-modal-hire-btn"
                    onClick={handleSendRequestFromModal}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Enviando..."
                      : "Enviar solicitud al freelancer"}
                  </button>

                  <button
                    className="service-modal-secondary-btn"
                    onClick={() =>
                      handleGoToFreelancer(selectedService.username)
                    }
                  >
                    Ver perfil del freelancer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
