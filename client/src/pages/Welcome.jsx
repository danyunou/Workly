// client/src/pages/Welcome.jsx
import "../styles/welcome.css";
import WelcomeNavbar from "../components/WelcomeNavbar";
import Footer from "../components/Footer";
import design from "../assets/icons/design.png";
import marketing from "../assets/icons/marketing.png";
import writing from "../assets/icons/writing.png";
import video from "../assets/icons/video.png";
import music from "../assets/icons/music.png";
import code from "../assets/icons/code.png";
import business from "../assets/icons/business.png";
import lifestyle from "../assets/icons/lifestyle.png";
import data from "../assets/icons/data.png";
import photography from "../assets/icons/photography.png";

export default function Welcome() {
  return (
    <>
      <WelcomeNavbar />

      <div className="welcome-container">
        {/* Hero */}
        <section className="hero">
          <div className="hero-text">
            <h1>Freelancers competentes en todos los campos a solo un clic</h1>
            <ul>
              <li>
                <strong> Trabajo de calidad – eficiente y confiable:</strong> Recibe entregas puntuales y de alta calidad, ya sea un trabajo a corto plazo o un proyecto complejo.
              </li>
              <li>
                <strong> Seguridad en cada pedido:</strong> Pagos protegidos mediante tecnología SSL. Las transacciones no se liberan hasta que se apruebe la entrega.
              </li>
              <li>
                <strong> Locales o globales:</strong> Trabaja con expertos de habla hispana o con talento profesional internacional, de acuerdo a tus preferencias y requisitos.
              </li>
              <li>
                <strong> 24/7 – soporte continuo a cualquier hora del día:</strong> ¿Tienes alguna pregunta? Nuestro equipo de soporte está disponible en todo momento y lugar.
              </li>
            </ul>
          </div>

          <div className="hero-video">
            <video width="480" height="270" controls muted autoPlay loop>
              <source src="/videos/demo.mp4" type="video/mp4" />
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        </section>

        {/* ¿Cómo funciona? */}
        <section className="how-it-works">
          <h2>¿Cómo funciona Workly?</h2>
          <div className="steps">
            <div className="step">
              <span>🔎</span>
              <h3>Búsqueda simple</h3>
              <p>Usa la barra de búsqueda para explorar servicios o navega por categoría.</p>
            </div>
            <div className="step">
              <span>📋</span>
              <h3>Selección clara</h3>
              <p>Elige basándote en habilidades, calificaciones y comentarios de otros usuarios.</p>
            </div>
            <div className="step">
              <span>💳</span>
              <h3>Pago fácil</h3>
              <p>Contrata de manera segura: pagos protegidos, comunicación directa y entregas puntuales.</p>
            </div>
          </div>
        </section>

        {/* Testimonio / resumen final */}
        <section className="testimonial">
          <p>
            Permite la colaboración rápida con freelancers talentosos.<br />
            Con frecuencia usamos Workly para subcontratar proyectos individuales.
          </p>
        </section>
              {/* Categorías populares */}
        <section className="categories">
          <h2>Lo necesitas, nosotros lo tenemos</h2>
          <div className="category-grid">
            <div className="category">
              <img src={design} alt="Diseño" />
              <p>Artes gráficas y diseño</p>
            </div>
            <div className="category">
              <img src={marketing} alt="Marketing" />
              <p>Marketing digital</p>
            </div>
            <div className="category">
              <img src={writing} alt="Escritura" />
              <p>Escritura y traducción</p>
            </div>
            <div className="category">
              <img src={video} alt="Video" />
              <p>Video y animación</p>
            </div>
            <div className="category">
              <img src={music} alt="Música" />
              <p>Música y audio</p>
            </div>
            <div className="category">
              <img src={code} alt="Tecnología" />
              <p>Programación y tecnología</p>
            </div>
            <div className="category">
              <img src={business} alt="Negocios" />
              <p>Negocios</p>
            </div>
            <div className="category">
              <img src={lifestyle} alt="Estilo de vida" />
              <p>Estilo de vida</p>
            </div>
            <div className="category">
              <img src={data} alt="Datos" />
              <p>Datos</p>
            </div>
            <div className="category">
              <img src={photography} alt="Fotografía" />
              <p>Fotografía</p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
