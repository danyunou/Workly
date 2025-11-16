import React from 'react';
import {useState } from "react";
import '../styles/DisputeTerms.css';
import Navbar from "../components/Navbar";
import FreelancerNavbar from "../components/FreelancerNavbar";
import WelcomeNavbar from "../components/WelcomeNavbar";

const DisputeTerms = () => {

  const [roleId] = useState(null);
  return (
    <>
    {roleId === 2 
    ? <FreelancerNavbar /> 
    : roleId === 1 
      ? <Navbar /> 
      : <WelcomeNavbar />}
    <div className="dispute-terms-container">
      <h1>Términos de Resolución de Disputas</h1>
      <p>En Workly, creemos en la transparencia y la protección de ambas partes durante la realización de un proyecto. A continuación se describen los términos que aplican en caso de una disputa:</p>

      <h2>1. Definición de Disputa</h2>
      <p>Una disputa ocurre cuando el cliente no está satisfecho con los entregables del freelancer o cuando se incumplen los términos del contrato acordado.</p>

      <h2>2. Proceso de Apertura</h2>
      <ul>
        <li>Solo el cliente puede abrir una disputa una vez que el proyecto ha sido marcado como finalizado.</li>
        <li>Debe proporcionar una razón clara y específica.</li>
        <li>Solo puede haber una disputa activa por proyecto a la vez.</li>
      </ul>

      <h2>3. Evaluación</h2>
      <ul>
        <li>El equipo de administración revisará los entregables y archivos adjuntos.</li>
        <li>Se notificará al freelancer con la razón proporcionada por el cliente.</li>
      </ul>

      <h2>4. Decisiones del Administrador</h2>
      <ul>
        <li>El administrador puede aceptar o rechazar la disputa.</li>
        <li>Si se acepta, el proyecto se reactiva para permitir correcciones.</li>
        <li>Si se rechaza, el cliente podrá enviar una nueva disputa si lo considera necesario.</li>
        <li>Todas las decisiones se registran y son visibles para ambas partes.</li>
      </ul>

      <h2>5. Política de Neutralidad</h2>
      <p>El equipo de administración evaluará objetivamente los hechos, sin favorecer a ninguna de las partes.</p>

      <h2>6. Consecuencias de Abuso</h2>
      <p>Abusar del sistema de disputas podría conllevar sanciones, incluyendo la suspensión temporal o permanente de la cuenta.</p>
    </div>
    </>
  );
};

export default DisputeTerms;
