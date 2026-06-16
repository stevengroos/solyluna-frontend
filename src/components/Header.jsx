import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

export default function Header({ filtroTexto, setFiltroTexto }) {
  const { colors, darkMode, toggleTheme } = useContext(ThemeContext); // Usamos tus variables del contexto
  const navigate = useNavigate();
  
  // Detector de pantalla móvil para reordenar los elementos
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);
  const tieneToken = !!localStorage.getItem('adminToken');

  useEffect(() => {
    const manejarResize = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  return (
    <header style={{
      backgroundColor: colors.bgCards,
      padding: esMovil ? '15px 20px' : '20px 40px',
      boxShadow: colors.shadow,
      borderBottom: colors.borderCard,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      transition: 'background-color 0.3s, padding 0.3s',
      display: 'flex',
      flexDirection: 'column',
      gap: esMovil && setFiltroTexto ? '12px' : '0px'
    }}>
      {/* FILA PRINCIPAL: Logo y Acciones */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        
        {/* LOGO */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{
            margin: 0,
            fontSize: esMovil ? '20px' : '24px',
            fontWeight: '800',
            color: colors.colorAcento || '#38bdf8',
            letterSpacing: '1px',
            whiteSpace: 'nowrap' // Evita que se rompa en dos líneas como en la foto
          }}>
            SOL & LUNA
          </h1>
        </Link>

        {/* BUSCADOR (Versión Escritorio) */}
        {!esMovil && setFiltroTexto && (
          <div style={{ position: 'relative', width: '400px' }}>
            <span style={{ position: 'absolute', left: '15px', top: '11px', color: colors.textoGris }}>🔍</span>
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              value={filtroTexto} 
              onChange={(e) => setFiltroTexto(e.target.value)} 
              style={{ 
                width: '100%', padding: '12px 15px 12px 42px', borderRadius: '25px', 
                border: '1px solid', borderColor: colors.borderInputs, 
                backgroundColor: colors.bgInputs, color: colors.textoBlanco,
                fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }} 
            />
          </div>
        )}

        {/* BOTONES DERECHOS: Modo Claro/Oscuro y Acceso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: esMovil ? '10px' : '15px' }}>
          
          {/* Botón de Tema (Mantiene tu funcionalidad nativa) */}
          <button 
            onClick={toggleTheme} 
            style={{ 
              backgroundColor: colors.bgInputs, border: '1px solid', borderColor: colors.borderInputs,
              color: colors.textoBlanco, padding: '8px 14px', borderRadius: '20px',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
          </button>

          {/* Botón Dinámico: Si ya inició sesión va al Workspace, si no, a iniciar sesión */}
          <button 
            onClick={() => navigate(tieneToken ? '/admin' : '/login')}
            style={{ 
              backgroundColor: 'transparent', border: `1px solid ${colors.colorAcento}`, 
              color: colors.colorAcento, padding: '8px 16px', borderRadius: '20px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s'
            }}
          >
            {tieneToken ? 'Workspace' : 'Acceder'}
          </button>
        </div>
      </div>

      {/* BUSCADOR (Versión Móvil - Se despliega abajo de forma limpia) */}
      {esMovil && setFiltroTexto && (
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '15px', top: '11px', color: colors.textoGris }}>🔍</span>
          <input 
            type="text" 
            placeholder="¿Qué estás buscando?..." 
            value={filtroTexto} 
            onChange={(e) => setFiltroTexto(e.target.value)} 
            style={{ 
              width: '100%', padding: '12px 15px 12px 42px', borderRadius: '25px', 
              border: '1px solid', borderColor: colors.borderInputs, 
              backgroundColor: colors.bgInputs, color: colors.textoBlanco,
              fontSize: '14px', outline: 'none', boxSizing: 'border-box'
            }} 
          />
        </div>
      )}
    </header>
  );
}