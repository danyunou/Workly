import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import FreelancerNavbar from "../../components/FreelancerNavbar";
import "../../styles/myServices.css";

export default function MyServicesPage() {
  const { token } = useAuth();

  const [services, setServices] = useState([]);
  const [freelancerCategories, setFreelancerCategories] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");   // ⬅️ error de carga de página
  const [actionError, setActionError] = useState(""); // ⬅️ errores de acciones (aceptar, toggle, etc.)

  // Modal crear / editar
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [currentService, setCurrentService] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    delivery_time_days: "", // ⬅️ NUEVO campo
  });
  const [modalError, setModalError] = useState(""); // ⬅️ errores solo del modal

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Solicitudes por servicio
  const [requestsMap, setRequestsMap] = useState({}); // { serviceId: [] }
  const [openRequestsServiceId, setOpenRequestsServiceId] = useState(null);
  const [requestsLoadingId, setRequestsLoadingId] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  // Eliminar / pausar servicio
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // ========= HELPERS MODAL =========

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      category: "",
      delivery_time_days: "",
    });
    setImageFile(null);
    setPreviewUrl("");
    setCurrentService(null);
    setModalError("");
  };

  const openCreateModal = () => {
    setModalMode("create");
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (service) => {
    setModalMode("edit");
    setCurrentService(service);
    setForm({
      title: service.title || "",
      description: service.description || "",
      price: service.price || "",
      category: service.category || "",
      delivery_time_days:
        service.delivery_time_days != null
          ? String(service.delivery_time_days)
          : "",
    });
    setImageFile(null);
    setPreviewUrl(service.image_url || "");
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  // ========= FETCH INICIAL =========

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setPageError("");
        setActionError("");

        const [servicesRes, profileRes] = await Promise.all([
          fetch("https://workly-cy4b.onrender.com/api/services/by-freelancer", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            "https://workly-cy4b.onrender.com/api/freelancerProfile/profile",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

        if (!servicesRes.ok) {
          throw new Error("Error al cargar tus servicios");
        }
        const servicesData = await servicesRes.json();
        setServices(
          Array.isArray(servicesData)
            ? servicesData
            : servicesData.services || []
        );

        const profileText = await profileRes.text();
        try {
          const profileData = JSON.parse(profileText);
          if (Array.isArray(profileData.categories)) {
            setFreelancerCategories(profileData.categories);
          } else {
            setFreelancerCategories([]);
          }
        } catch (jsonErr) {
          console.error("Error al parsear perfil:", jsonErr.message);
          setFreelancerCategories([]);
        }
      } catch (err) {
        console.error(err);
        setPageError(
          err.message || "Ocurrió un error al cargar la información."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // ========= FORM HANDLERS =========

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl("");
    }
  };

  // ========= CREAR / EDITAR SERVICIO =========

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    const titleTrim = form.title.trim();
    const descTrim = form.description.trim();
    const deliveryDays = Number(form.delivery_time_days);

    if (!titleTrim) {
      return setModalError("El título es obligatorio.");
    }
    if (!descTrim) {
      return setModalError("La descripción es obligatoria.");
    }
    if (!form.category) {
      return setModalError("Selecciona una categoría.");
    }
    if (!form.price || Number(form.price) <= 0) {
      return setModalError("El precio debe ser mayor a 0.");
    }
    if (!deliveryDays || deliveryDays <= 0) {
      return setModalError(
        "Indica el tiempo de entrega (en días) para este servicio."
      );
    }
    if (modalMode === "create" && !imageFile) {
      return setModalError("Por favor, sube una imagen para tu servicio.");
    }

    const body = new FormData();
    body.append("title", titleTrim);
    body.append("description", descTrim);
    body.append("price", form.price);
    body.append("category", form.category);
    body.append("delivery_time_days", String(deliveryDays)); // ⬅️ se envía al back

    if (imageFile) {
      body.append("image", imageFile);
    }

    try {
      let url = "https://workly-cy4b.onrender.com/api/services";
      let method = "POST";

      if (modalMode === "edit" && currentService) {
        url = `https://workly-cy4b.onrender.com/api/services/${currentService.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          throw new Error("Error al guardar el servicio");
        }
        throw new Error(errorData.error || "Error al guardar el servicio");
      }

      const savedService = await res.json();

      setServices((prev) => {
        if (modalMode === "create") {
          return [savedService, ...prev];
        } else {
          return prev.map((s) => (s.id === savedService.id ? savedService : s));
        }
      });

      closeModal();
      resetForm();
    } catch (err) {
      console.error(err);
      setModalError(err.message || "Ocurrió un error al guardar el servicio.");
    }
  };

  // ========= SOLICITUDES =========

  const handleToggleRequests = async (service) => {
    const serviceId = service.id;

    // Si ya está abierto, lo cerramos
    if (openRequestsServiceId === serviceId) {
      setOpenRequestsServiceId(null);
      return;
    }

    // Si ya tenemos en cache, solo abrimos
    if (requestsMap[serviceId]) {
      setOpenRequestsServiceId(serviceId);
      return;
    }

    // Fetch
    try {
      setRequestsLoadingId(serviceId);
      setActionError("");
      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/services/${serviceId}/requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error("Error al obtener solicitudes");
      }

      const data = await res.json();
      setRequestsMap((prev) => ({ ...prev, [serviceId]: data }));
      setOpenRequestsServiceId(serviceId);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Error al obtener solicitudes");
    } finally {
      setRequestsLoadingId(null);
    }
  };

  const handleAcceptRequest = async (req, service) => {
    try {
      setAcceptingId(req.id);
      setActionError("");
      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/services/requests/${req.id}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("Error al aceptar la solicitud");
        }
        throw new Error(data.error || "Error al aceptar la solicitud");
      }

      await res.json(); // viene el proyecto creado, si luego lo necesitas

      // Actualizar status de la solicitud localmente
      setRequestsMap((prev) => ({
        ...prev,
        [service.id]: (prev[service.id] || []).map((r) =>
          r.id === req.id ? { ...r, status: "accepted" } : r
        ),
      }));
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Error al aceptar la solicitud.");
    } finally {
      setAcceptingId(null);
    }
  };

  // ========= CAMBIAR ACTIVO / INACTIVO =========

  const handleToggleActive = async (service) => {
    try {
      setTogglingId(service.id);
      setActionError("");
      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/services/${service.id}/active`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !service.is_active }),
        }
      );

      if (!res.ok) {
        let data;
        try {
          data = await res.json();
          // eslint-disable-next-line no-empty
        } catch {}
        throw new Error(
          (data && data.error) || "Error al cambiar el estado del servicio"
        );
      }

      const updated = await res.json();

      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Error al cambiar el estado del servicio.");
    } finally {
      setTogglingId(null);
    }
  };

  // ========= ELIMINAR SERVICIO =========

  const handleDeleteService = async (service) => {
    if (
      !window.confirm(
        `¿Seguro que quieres eliminar el servicio "${service.title}"?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(service.id);
      setActionError("");
      const res = await fetch(
        `https://workly-cy4b.onrender.com/api/services/${service.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("Error al eliminar el servicio");
        }
        throw new Error(data.error || "Error al eliminar el servicio");
      }

      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Error al eliminar el servicio.");
    } finally {
      setDeletingId(null);
    }
  };

  // ========= RENDER =========

  return (
    <>
      <FreelancerNavbar />

      <div className="my-services-page">
        <div className="my-services-header">
          <div>
            <h2>Mis servicios</h2>
            <p>
              Administra los servicios que ofreces, revisa el interés de los
              clientes y acepta solicitudes para convertirlas en proyectos.
            </p>
          </div>

          <button className="btn-primary" onClick={openCreateModal}>
            + Crear servicio
          </button>
        </div>

        {isLoading ? (
          <p>Cargando servicios...</p>
        ) : pageError ? (
          <p style={{ color: "red" }}>{pageError}</p>
        ) : services.length === 0 ? (
          <div className="my-services-empty">
            <h3>Aún no tienes servicios publicados</h3>
            <p>
              Crea tu primer servicio para que los clientes puedan encontrarte.
            </p>
            <button className="btn-primary" onClick={openCreateModal}>
              Crear mi primer servicio
            </button>
          </div>
        ) : (
          <>
            {actionError && (
              <p
                className="my-services-action-error"
                style={{ color: "red", marginBottom: "0.75rem" }}
              >
                {actionError}
              </p>
            )}

            <ul className="service-list">
              {services.map((service) => {
                const requestsForService = requestsMap[service.id] || [];
                const interestedCount = requestsForService.length;
                const deliveryDays =
                  service.delivery_time_days != null
                    ? service.delivery_time_days
                    : 7;
                const completedOrders = service.completed_orders || 0;

                return (
                  <li key={service.id} className="service-item">
                    {/* Imagen */}
                    <div className="service-image-wrapper">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="service-image"
                        />
                      ) : (
                        <span className="service-image-placeholder">
                          Sin imagen
                        </span>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="service-content">
                      <div className="service-title-row">
                        <h3>{service.title}</h3>
                        <span className="service-price">
                          ${Number(service.price).toFixed(2)} USD
                        </span>
                      </div>

                      <p className="service-description">
                        {service.description}
                      </p>

                      {/* META */}
                      <div className="service-meta-row">
                        {service.category && (
                          <span className="service-category-chip">
                            {service.category}
                          </span>
                        )}

                        <span className="service-pill">
                          {interestedCount} clientes interesados
                        </span>

                        <span
                          className={
                            "service-status " +
                            (service.is_active
                              ? "service-status-active"
                              : "service-status-inactive")
                          }
                        >
                          {service.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      {/* STATS */}
                      <div className="service-stats-row">
                        <span className="service-pill-muted">
                          Entrega: {deliveryDays} día
                          {deliveryDays === 1 ? "" : "s"}
                        </span>
                        <span className="service-pill-muted">
                          {completedOrders} pedidos completados
                        </span>
                      </div>

                      {/* ACCIONES */}
                      <div className="service-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => handleToggleRequests(service)}
                        >
                          {openRequestsServiceId === service.id
                            ? "Ocultar solicitudes"
                            : "Ver solicitudes"}
                        </button>

                        <button
                          className={
                            service.is_active
                              ? "btn-secondary"
                              : "btn-primary-outline"
                          }
                          onClick={() => handleToggleActive(service)}
                          disabled={togglingId === service.id}
                        >
                          {togglingId === service.id
                            ? "Actualizando..."
                            : service.is_active
                            ? "Pausar servicio"
                            : "Reactivar servicio"}
                        </button>

                        <button
                          className="btn-primary-outline"
                          onClick={() => openEditModal(service)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn-secondary-danger"
                          onClick={() => handleDeleteService(service)}
                          disabled={deletingId === service.id}
                        >
                          {deletingId === service.id
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </div>

                      {/* SOLICITUDES */}
                      {openRequestsServiceId === service.id && (
                        <div className="requests-container">
                          <h4>Solicitudes</h4>

                          {requestsLoadingId === service.id ? (
                            <p className="no-requests-text">
                              Cargando solicitudes...
                            </p>
                          ) : requestsForService.length === 0 ? (
                            <p className="no-requests-text">
                              Aún no hay solicitudes para este servicio.
                            </p>
                          ) : (
                            <ul className="requests-list">
                              {requestsForService.map((req) => (
                                <li key={req.id} className="request-item">
                                  <div className="request-main">
                                    <p>
                                      <strong>Cliente:</strong>{" "}
                                      {req.client_name}
                                    </p>
                                    {req.message && <p>{req.message}</p>}
                                  </div>

                                  <div className="request-meta">
                                    {req.proposed_budget && (
                                      <p>
                                        <strong>Presupuesto:</strong> $
                                        {req.proposed_budget} USD
                                      </p>
                                    )}

                                    {req.proposed_deadline && (
                                      <p>
                                        <strong>Fecha solicitada:</strong>{" "}
                                        {formatDate(req.proposed_deadline)}
                                      </p>
                                    )}

                                    <p>
                                      <strong>Solicitud enviada:</strong>{" "}
                                      {formatDate(req.created_at)}
                                    </p>

                                    <p>
                                      <strong>Estado:</strong>{" "}
                                      {req.status === "accepted"
                                        ? "Aceptada"
                                        : req.status === "rejected"
                                        ? "Rechazada"
                                        : "Pendiente"}
                                    </p>
                                  </div>

                                  <div className="request-actions">
                                    <button
                                      className="btn-primary"
                                      disabled={
                                        req.status === "accepted" ||
                                        acceptingId === req.id
                                      }
                                      onClick={() =>
                                        handleAcceptRequest(req, service)
                                      }
                                    >
                                      {req.status === "accepted"
                                        ? "Aceptada"
                                        : acceptingId === req.id
                                        ? "Aceptando..."
                                        : "Aceptar solicitud"}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ========== MODAL CREAR / EDITAR ========== */}
        {showModal && (
          <div className="edit-service-backdrop" onClick={closeModal}>
            <div
              className="edit-service-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="edit-service-close" onClick={closeModal}>
                ✕
              </button>

              <h3>
                {modalMode === "create"
                  ? "Crear nuevo servicio"
                  : "Editar servicio"}
              </h3>

              <form
                className="edit-service-form"
                onSubmit={handleSubmit}
                encType="multipart/form-data"
              >
                <div className="edit-section">
                  <h4>Detalles del servicio</h4>

                  <div className="edit-field">
                    <label>Título</label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="edit-field">
                    <label>Descripción</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                    />
                    <small>
                      Describe claramente qué incluye tu servicio y qué puede
                      esperar el cliente.
                    </small>
                  </div>

                  <div className="edit-row-two">
                    <div className="edit-field">
                      <label>Precio (USD)</label>
                      <input
                        type="number"
                        name="price"
                        min={1}
                        value={form.price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="edit-field">
                      <label>Tiempo de entrega (días)</label>
                      <input
                        type="number"
                        name="delivery_time_days"
                        min={1}
                        value={form.delivery_time_days}
                        onChange={handleInputChange}
                        required
                      />
                      <small>
                        Este valor se usa para calcular la fecha mínima que verá
                        el cliente al solicitar tu servicio.
                      </small>
                    </div>
                  </div>

                  <div className="edit-field">
                    <label>Categoría</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {freelancerCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <small>
                      Solo puedes elegir entre las categorías configuradas en tu
                      perfil de freelancer.
                    </small>
                  </div>
                </div>

                <div className="edit-section">
                  <h4>Imagen del servicio</h4>
                  <div className="edit-service-upload">
                    <label className="upload-button">
                      Seleccionar imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                    <span className="upload-file-hint">
                      Formatos recomendados: JPG, PNG. Tamaño máximo ~2-3MB.
                    </span>

                    {previewUrl && (
                      <div className="edit-service-image-preview">
                        <img src={previewUrl} alt="Vista previa" />
                        <button
                          type="button"
                          className="btn-link-small"
                          onClick={() => {
                            setImageFile(null);
                            setPreviewUrl("");
                          }}
                        >
                          Quitar imagen
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {modalError && (
                  <p style={{ color: "red", fontSize: "0.85rem" }}>
                    {modalError}
                  </p>
                )}

                <div className="edit-service-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="btn-primary">
                    {modalMode === "create"
                      ? "Publicar servicio"
                      : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
