import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/home.css";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/services")
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error loading categories:", err));
  }, []);

  const handleExplore = (categoryId) => {
    navigate(`/services?category=${categoryId}`);
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
              <button className="explore-btn" onClick={() => handleExplore(cat.category)}>Explorar</button>
            </div>

            <div className="services-scroll">
              {cat.services.map(service => (
                <div className="service-card" key={service.id}>
                  <img src={service.image_url} alt={service.title} className="service-image" />
                  <div className="service-details">
                    <h4 className="service-title">{service.title}</h4>
                    <p className="service-user">@{service.user_alias}</p>
                    <p className="service-price">Desde ${service.price} USD</p>
                    <button className="hire-btn" onClick={() => navigate(`/hire/${service.id}`)}>Contratar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
    </>
  );
}
