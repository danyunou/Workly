import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/home.css";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://workly-cy4b.onrender.com/api/services")
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error loading categories:", err));
  }, []);

  const handleExplore = (categoryId) => {
    navigate(`/services?category=${categoryId}`);
  };

  const handleGoToFreelancer = (username) => {
    if (!username) return;
    navigate(`/freelancer/${username}`);
  };

  return (
    <>
      <Navbar />
      <div className="home-body">
        <h2 className="home-title">Servicios para ti</h2>

        {categories.map(cat => (
          <div className="category-section" key={cat.category}>
            <div className="category-header">
              <h3 className="category-title">{cat.category}</h3>
              {/* Si quieres reutilizar handleExplore */}
              {/* <button onClick={() => handleExplore(cat.category_id)} className="see-all-btn">
                Ver todo
              </button> */}
            </div>

            <div className="services-scroll">
              {cat.services.map(service => (
                <div className="service-card" key={service.id}>
                  <img
                    src={service.image_url}
                    alt={service.title}
                    className="service-image"
                  />

                  <div className="service-details">
                    <h4 className="service-title">{service.title}</h4>

                    {/* Bloque freelancer: avatar + alias clicable */}
                    <button
                      type="button"
                      className="service-freelancer"
                      onClick={() => handleGoToFreelancer(service.username)}
                    >
                      {service.profile_picture && (
                        <img
                          src={service.profile_picture}
                          alt={service.user_alias || service.username}
                          className="service-avatar"
                        />
                      )}
                      <div className="service-freelancer-text">
                        <span className="service-user">
                          @{service.user_alias || service.username}
                        </span>
                        {/* Si luego agregas rating en el backend, lo pintas aquí */}
                        {service.avg_rating && (
                          <span className="service-rating">
                            {Number(service.avg_rating).toFixed(1)} ⭐
                          </span>
                        )}
                      </div>
                    </button>

                    <p className="service-price">
                      Desde ${service.price} USD
                    </p>

                    <button
                      className="hire-btn"
                      onClick={() => navigate(`/hire/${service.id}`)}
                    >
                      Contratar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
      <Footer />
    </>
  );
}
