import React, { useState, useContext, useEffect } from 'react';
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
  
  // --- SEGURIDAD: Control de intentos fallidos ---
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL;

  // Efecto para manejar la cuenta regresiva del bloqueo
  useEffect(() => {
    let intervalo;
    if (bloqueadoHasta) {
      intervalo = setInterval(() => {
        const ahora = Date.now();
        if (ahora >= bloqueadoHasta) {
          setBloqueadoHasta(null);
          setIntentosFallidos(0);
          setTiempoRestante(0);
          setError('');
        } else {
          setTiempoRestante(Math.ceil((bloqueadoHasta - ahora) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [bloqueadoHasta]);

  const manejarLogin = async (e) => {
    e.preventDefault();
    
    // 1. Escudo anti-bots: Si está bloqueado, no hace nada
    if (bloqueadoHasta) return;

    const emailLimpio = email.trim();
    const passLimpia = password.trim();

    // 2. Validación temprana: Evitar requests inútiles al servidor
    if (passLimpia.length < 5) {
      setError('La contraseña debe tener al menos 5 caracteres.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const params = new URLSearchParams();
      params.append('username', emailLimpio);
      params.append('password', passLimpia);

      const response = await axios.post(`${API_URL}/api/token`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Login exitoso: Limpiamos historial de fallos
      setIntentosFallidos(0);
      localStorage.setItem('adminToken', response.data.access_token);
      navigate('/admin');

    } catch (err) {
      console.error(err);
      
      // 3. Sistema de penalización progresiva
      const nuevosIntentos = intentosFallidos + 1;
      setIntentosFallidos(nuevosIntentos);
      
      if (nuevosIntentos >= 3) {
        // Bloqueo de 30 segundos tras 3 intentos fallidos
        const tiempoBloqueo = Date.now() + 30000; 
        setBloqueadoHasta(tiempoBloqueo);
        setTiempoRestante(30);
        setError('Demasiados intentos fallidos. Por seguridad, espera 30 segundos.');
      } else {
        setError(`Credenciales inválidas. Intento ${nuevosIntentos} de 3.`);
      }
      
      // Borramos la contraseña ingresada por seguridad
      setPassword('');

    } finally {
      setCargando(false);
    }
  };

  const formDeshabilitado = cargando || bloqueadoHasta !== null;

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
      
      <style>{`
        .spinner-elegante {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-left-color: ${colors.colorAcento};
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {cargando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="spinner-elegante"></div>
          <p style={{ marginTop: '20px', color: '#fff', fontSize: '15px', fontWeight: '500', letterSpacing: '1px' }}>Verificando credenciales...</p>
        </div>
      )}

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
        
        <Link to="/" style={{ color: colors.colorAcento, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'inline-block', marginBottom: '20px' }}>
          ← Volver a SOL & LUNA
        </Link>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', color: colors.textoBlanco }}>Acceso Administrativo</h2>
        <p style={{ margin: '0 0 30px 0', fontSize: '14px', color: colors.textoGris }}>Ingresa tus credenciales para gestionar la tienda</p>

        {error && (
          <div style={{ 
            backgroundColor: bloqueadoHasta ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid',
            borderColor: bloqueadoHasta ? '#f59e0b' : '#ef4444', 
            color: bloqueadoHasta ? '#d97706' : '#f87171', 
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            {bloqueadoHasta ? `🔒 Acceso bloqueado temporalmente. Inténtalo de nuevo en ${tiempoRestante}s.` : `⚠️ ${error}`}
          </div>
        )}

        <form onSubmit={manejarLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: colors.textoGris }}>Correo Electrónico</label>
            <input 
              type="email" 
              required
              disabled={formDeshabilitado}
              placeholder="admin@tienda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', padding: '12px', borderRadius: '8px', 
                border: '1px solid', borderColor: colors.borderInputs, 
                backgroundColor: formDeshabilitado ? colors.bgPrincipal : colors.bgInputs, 
                color: colors.textoBlanco,
                fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                opacity: formDeshabilitado ? 0.6 : 1
              }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: colors.textoGris }}>Contraseña</label>
            <input 
              type="password" 
              required
              disabled={formDeshabilitado}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', padding: '12px', borderRadius: '8px', 
                border: '1px solid', borderColor: colors.borderInputs, 
                backgroundColor: formDeshabilitado ? colors.bgPrincipal : colors.bgInputs, 
                color: colors.textoBlanco,
                fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                opacity: formDeshabilitado ? 0.6 : 1
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={formDeshabilitado}
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: formDeshabilitado ? colors.borderInputs : colors.colorAcento, 
              color: formDeshabilitado ? colors.textoGris : colors.bgPrincipal, 
              border: 'none', 
              borderRadius: '8px', 
              cursor: formDeshabilitado ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
          >
            {cargando ? 'Verificando...' : bloqueadoHasta ? `Bloqueado (${tiempoRestante}s)` : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </div>
  );
}