import { Link } from 'react-router-dom';

function CategoryCard({ icon, name }) {
  return (
    <Link to={`/services/${name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>{icon}</div>
        <h3>{name}</h3>
      </div>
    </Link>
  );
}

export default CategoryCard;
