import { Link } from 'react-router-dom';

function ServicePreviewCard({ service }) {
  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '1rem',
      borderRadius: '8px',
      margin: '1rem 0',
      maxWidth: '500px'
    }}>
      <h3>{service.title}</h3>
      <p><strong>Freelancer:</strong> {service.freelancerName}</p>
      <p><strong>Precio:</strong> ${service.price}</p>
      <p><strong>Calificación:</strong> {'⭐'.repeat(Math.round(service.rating))}</p>
      <Link to={`/services/${service.category}/${service.id}`}>Ver más</Link>
    </div>
  );
}

export default ServicePreviewCard;
