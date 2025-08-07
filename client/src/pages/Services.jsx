import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/services.css";

export default function Services() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      const res = await fetch("https://workly-cy4b.onrender.com/api/services", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      setCategories(data);
    };
    fetchServices();
  }, []);

  return (
    <>
      <Navbar />
      <div className="services-page">
        {categories.map((cat) => (
          <div key={cat.category_id} className="category-block">
            <h2>{cat.category_name}</h2>
            <div className="service-cards">
              {cat.services
                .filter(s => s.id !== null)
                .map(service => (
                <div key={service.id} className="service-card">
                  <h4>{service.title}</h4>
                  <p>{service.description}</p>
                  <p><strong>Desde ${service.price}</strong></p>
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
