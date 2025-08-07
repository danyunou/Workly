import { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/MyServices.css";
import Navbar from "../../components/FreelancerNavbar";

const MyServices = () => {
  const [services, setServices] = useState([]);
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [serviceRequests, setServiceRequests] = useState({});

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/services/by-freelancer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const deleteService = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this service?");
    if (!confirm) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchServices();
    } catch (err) {
      console.error("Error deleting service:", err);
    }
  };

  const toggleRequests = async (serviceId) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/services/${serviceId}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServiceRequests(prev => ({ ...prev, [serviceId]: res.data }));
      setExpandedServiceId(serviceId);
    } catch (err) {
      console.error("Error fetching requests for service:", err);
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5000/api/requests/accept-service-request/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Request accepted and project created.");
      // Refresh the requests list for that service
      if (expandedServiceId) toggleRequests(expandedServiceId);
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("There was an error accepting the request.");
    }
  };

  return (
    <>
          <Navbar />
    <div className="my-services">
      <h2>My Services</h2>
      {services.length === 0 ? (
        <p>You haven't published any services yet.</p>
      ) : (
        <ul className="service-list">
          {services.map((service) => (
            <li key={service.id} className="service-item">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <p><strong>Category:</strong> {service.category}</p>
              <p><strong>Price:</strong> ${service.price}</p>
              <p><strong>Interested clients:</strong> {service.interested_count || 0}</p>

              <button onClick={() => deleteService(service.id)}>Delete</button>
              
              <button onClick={() => toggleRequests(service.id)}>
                {expandedServiceId === service.id ? "Hide Requests" : "View Requests"}
              </button>

              {expandedServiceId === service.id && (
                <div className="requests-container">
                  {serviceRequests[service.id]?.length === 0 ? (
                    <p>No requests for this service yet.</p>
                  ) : (
                    <ul>
                      {serviceRequests[service.id]?.map((req) => (
                        <li key={req.id} className="request-item">
                          <p><strong>Client:</strong> {req.client_name}</p>
                          <p><strong>Message:</strong> {req.message}</p>
                          <p><strong>Proposed Budget:</strong> ${req.proposed_budget}</p>
                          <p><strong>Sent:</strong> {new Date(req.created_at).toLocaleString()}</p>
                          <button onClick={() => acceptRequest(req.id)}>Accept</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
};

export default MyServices;
