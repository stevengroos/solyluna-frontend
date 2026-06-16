import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Header from '../components/Header'; // Reutilizamos tu Header

export default function ProductDetail() {
  const { id } = useParams(); // Obtenemos el ID del producto desde la URL
  const navigate = useNavigate();
  const { colors, darkMode } = useContext(ThemeContext);

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- CONFIGURACIÓN DE WHATSAPP ---
  // Cambia este número por el de tu tienda (con el código de país, ej: 595 para Paraguay)
  const numeroWhatsApp = "595986201213"; 
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/products/${id}`);
        setProducto(response.data);
      } catch (err) {
        console.error(err);
        setError('No se pudo encontrar el producto.');
      } finally {
        setCargando(false);
      }
    };
    fetchProducto();
  }, [id]);

  const comprarPorWhatsApp = () => {
    // Formateamos el mensaje para que llegue lindo y claro a tu WhatsApp
    const mensaje = `Hola SOL & LUNA 🌙☀️\nEstoy interesado en el producto: *${producto.title}*.\nPrecio marcado: Gs. ${producto.price.toLocaleString('es-PY')}.\n\n¿Me podrías dar más información?`;
    
    // Codificamos el mensaje para URL y abrimos la pestaña de WhatsApp
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  if (cargando) return <div style={{ padding: '50px', textAlign: 'center', color: colors.textoBlanco, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>Cargando detalles...</div>;
  if (error) return <div style={{ padding: '50px', textAlign: 'center', color: colors.colorRojo, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Usamos un Header simplificado sin buscador para esta vista */}
      <Header /> 

      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        
        {/* Botón de volver */}
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: colors.textoGris, cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', padding: 0 }}
        >
          ← Volver a la tienda
        </button>

        {/* Tarjeta Principal del Producto */}
        <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', border: colors.borderCard, boxShadow: colors.shadow, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', overflow: 'hidden' }}>
          
          {/* Columna Izquierda: Imagen */}
          <div style={{ backgroundColor: '#ffffff', padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <img 
              src={producto.image_url} 
              alt={producto.title} 
              style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.1))' }} 
            />
          </div>

          {/* Columna Derecha: Información */}
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '15px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', color: colors.textoBlanco, lineHeight: '1.2' }}>{producto.title}</h1>
            </div>

            <div style={{ fontSize: '32px', fontWeight: '900', color: colors.colorPrecio, marginBottom: '25px' }}>
              Gs. {producto.price.toLocaleString('es-PY')}
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: producto.stock > 0 ? (darkMode ? '#34d399' : '#155724') : (darkMode ? '#f87171' : '#721c24'), 
              backgroundColor: producto.stock > 0 ? (darkMode ? 'rgba(52, 211, 153, 0.1)' : '#d4edda') : (darkMode ? 'rgba(248, 113, 113, 0.1)' : '#f8d7da'), 
              padding: '8px 16px', 
              borderRadius: '20px', 
              display: 'inline-block', 
              width: 'fit-content', 
              fontWeight: 'bold',
              marginBottom: '30px'
            }}>
              {producto.stock > 0 ? `✅ ${producto.stock} unidades disponibles` : '❌ Agotado temporalmente'}
            </div>

            <div style={{ flexGrow: 1, marginBottom: '40px' }}>
              <h3 style={{ fontSize: '16px', color: colors.textoGris, marginBottom: '10px', borderBottom: `1px solid ${colors.borderInputs}`, paddingBottom: '10px' }}>
                Descripción del producto
              </h3>
              <p style={{ color: colors.textoBlanco, lineHeight: '1.7', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                {producto.description}
              </p>
            </div>

            {/* BOTÓN DE COMPRAR VÍA WHATSAPP */}
            <button 
              onClick={comprarPorWhatsApp}
              disabled={producto.stock === 0}
              style={{ 
                width: '100%', 
                padding: '16px', 
                backgroundColor: producto.stock > 0 ? '#25D366' : (darkMode ? '#475569' : '#bdc3c7'), // Color oficial de WhatsApp
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: producto.stock > 0 ? 'pointer' : 'not-allowed', 
                fontWeight: 'bold',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                boxShadow: producto.stock > 0 ? '0 4px 15px rgba(37, 211, 102, 0.3)' : 'none',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => producto.stock > 0 && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => producto.stock > 0 && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {/* Icono de WhatsApp en SVG para no depender de librerías externas */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.01 2.004c-5.46 0-9.89 4.435-9.89 9.89 0 1.936.556 3.754 1.517 5.322L2 22l4.945-1.55c1.51.87 3.25 1.353 5.065 1.353 5.46 0 9.89-4.436 9.89-9.89 0-5.456-4.43-9.89-9.89-9.89zm5.34 14.155c-.246.685-1.42 1.3-1.97 1.385-.506.078-1.168.125-3.344-.77-2.624-1.076-4.296-3.765-4.425-3.94-.13-.173-1.055-1.405-1.055-2.682 0-1.277.662-1.905.892-2.152.23-.245.503-.306.67-.306.168 0 .336.002.483.008.153.007.357-.06.558.423.207.498.71 1.737.772 1.862.06.124.103.27.02.433-.083.163-.125.263-.248.41-.122.146-.26.315-.368.422-.122.122-.25.257-.107.504.143.247.64 1.055 1.374 1.708.948.844 1.745 1.106 1.995 1.23.25.123.398.102.544-.06.147-.164.634-.74.805-.994.17-.253.34-.212.565-.128.224.083 1.422.67 1.666.793.244.123.407.184.468.287.06.103.06.6-.186 1.285z"/>
              </svg>
              Comprar por WhatsApp
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}