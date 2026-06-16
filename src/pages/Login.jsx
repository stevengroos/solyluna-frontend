import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

export default function Login() {
  const { colors } = useContext(ThemeContext);
  const navigate = useNavigate();

  // Estados para el formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
     
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await axios.post(`${API_URL}/api/token`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      

      // Guardamos el token JWT que nos devuelve el backend en el navegador
      localStorage.setItem('adminToken', response.data.access_token);
      
      // Redirigimos al Panel de Administración inmediatamente
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError('Credenciales inválidas o error en el servidor. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.bgPrincipal, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px',
      transition: 'background-color 0.3s'
    }}>
      {/* Caja del Formulario */}
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        backgroundColor: colors.bgCards, 
        padding: '40px 30px', 
        borderRadius: '16px', 
        boxShadow: colors.shadow,
        border: colors.borderCard,
        transition: 'background-color 0.3s'
      }}>
        
        {/* Volver a la tienda */}
        <Link to="/" style={{ color: colors.colorAcento, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'inline-block', marginBottom: '20px' }}>
          ← Volver a SOL & LUNA
        </Link>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', color: colors.textoBlanco }}>Acceso Administrativo</h2>
        <p style={{ margin: '0 0 30px 0', fontSize: '14px', color: colors.textoGris }}>Ingresa tus credenciales para gestionar la tienda</p>

        {/* Alerta de Error */}
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#f87171', 
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={manejarLogin}>
          {/* Input Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: colors.textoGris }}>Correo Electrónico</label>
            <input 
              type="email" 
              required
              placeholder="admin@tienda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', padding: '12px', borderRadius: '8px', 
                border: '1px solid', borderColor: colors.borderInputs, 
                backgroundColor: colors.bgInputs, color: colors.textoBlanco,
                fontSize: '15px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          {/* Input Contraseña */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: colors.textoGris }}>Contraseña</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', padding: '12px', borderRadius: '8px', 
                border: '1px solid', borderColor: colors.borderInputs, 
                backgroundColor: colors.bgInputs, color: colors.textoBlanco,
                fontSize: '15px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          {/* Botón de Enviar */}
          <button 
            type="submit" 
            disabled={cargando}
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: cargando ? colors.borderInputs : colors.colorAcento, 
              color: colors.bgPrincipal, 
              border: 'none', 
              borderRadius: '8px', 
              cursor: cargando ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'background-color 0.2s'
            }}
          >
            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </div>
  );
}