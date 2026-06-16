import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

export default function Header({ filtroTexto, setFiltroTexto }) {
  const { darkMode, toggleTheme, colors } = useContext(ThemeContext);

  return (
    <header style={{ 
      backgroundColor: colors.bgCards, 
      padding: '15px 40px', 
      boxShadow: colors.shadow, 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
      transition: 'background-color 0.3s'
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: colors.colorAcento, fontWeight: '800' }}>SOL & LUNA</h1>
      </Link>
      
      <div style={{ flex: '1', maxWidth: '500px', margin: '0 40px' }}>
        <input 
          type="search" 
          placeholder="Buscar productos por título..." 
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 15px', borderRadius: '25px', 
            border: '1px solid', borderColor: colors.borderInputs, 
            backgroundColor: colors.bgInputs, color: colors.textoBlanco,
            fontSize: '15px', boxSizing: 'border-box', outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '25px', alignItems: 'center', fontSize: '14px', color: colors.textoGris, fontWeight: '500' }}>
        <button onClick={toggleTheme} style={{
          background: 'none', border: '1px solid', borderColor: colors.borderInputs,
          borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', backgroundColor: colors.bgInputs,
          display: 'flex', alignItems: 'center', gap: '6px', color: colors.textoBlanco
        }}>
          {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
        </button>

        {/* --- CAMBIO: AHORA LLEVA AL LOGIN --- */}
        <Link to="/login" style={{ color: colors.textoGris, textDecoration: 'none', fontWeight: 'bold' }}>
        Acceder
        </Link>
      </div>
    </header>
  );
}