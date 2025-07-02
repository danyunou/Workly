// client/src/App.jsx
import AppRoutes from "./routes/AppRoutes";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="layout">
      <main className="main-content">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

export default App;
