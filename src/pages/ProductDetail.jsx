import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Header from '../components/Header';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors, darkMode } = useContext(ThemeContext);

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- OPCIONES DEL NUEVO CUOTERO ---
  // Las modalidades ahora son: 'financiado' (Pagar en cuotas), 'tarjeta' (Convenios bancarios), 'contado'
  const [modalidad, setModalidad] = useState('financiado'); 
  const [cuotasElegidas, setCuotasElegidas] = useState(3); // Por defecto arranca en 3 cuotas

  // Tasas oficiales de tu Excel (Ocultas para el cliente)
  const tasasExcel = {
    2: 6.4, 3: 8.4, 4: 10.4, 5: 12.3, 6: 14.2, 7: 16.0, 8: 17.7, 
    9: 19.5, 10: 21.2, 11: 22.8, 12: 24.4, 13: 25.9, 14: 27.5, 
    15: 28.9, 16: 30.4, 17: 31.8, 18: 33.2, 19: 34.5, 20: 35.8, 
    21: 37.0, 22: 38.3, 23: 39.5, 24: 40.7
  };

  const numeroWhatsApp = "595986201213"; 
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  // --- CÁLCULOS INTERNOS ---
  const calcularCuotaIndividual = () => {
    if (!producto) return 0;
    const precioBase = producto.price;
    const tasa = tasasExcel[cuotasElegidas] || 0;

    if (modalidad === 'financiado') {
      // Fórmula matemática exacta de tu Excel (Precio más Interés)
      const precioFinal = precioBase / (1 - (tasa / 100));
      return Math.round(precioFinal / cuotasElegidas);
    } else if (modalidad === 'tarjeta') {
      // Precio sin interés dividido cuotas exactas
      return Math.round(precioBase / cuotasElegidas);
    }
    return 0; // Para contado no aplica cuotas
  };

  const calcularPrecioTotalCliente = () => {
    if (!producto) return 0;
    if (modalidad === 'financiado') {
      const tasa = tasasExcel[cuotasElegidas] || 0;
      return Math.round(producto.price / (1 - (tasa / 100)));
    }
    return producto.price; // Tarjeta y Contado mantienen el precio original
  };

  // --- ENVIAR MENSAJE PERSONALIZADO A WHATSAPP ---
  const comprarPorWhatsApp = () => {
    if (!producto) return;

    let mensaje = "";
    const precioContadoStr = `Gs. ${producto.price.toLocaleString('es-PY')}`;
    const cuotaStr = `Gs. ${calcularCuotaIndividual().toLocaleString('es-PY')}`;
    const totalFinanciadoStr = `Gs. ${calcularPrecioTotalCliente().toLocaleString('es-PY')}`;

    if (modalidad === 'financiado') {
      mensaje = `Hola SOL & LUNA, estoy interesado en el producto *${producto.title}* (Contado: ${precioContadoStr}). 
      
Quiero solicitar el plan de financiación de *${cuotasElegidas} cuotas* de *${cuotaStr}* al mes (Total a financiar: ${totalFinanciadoStr}). ¿Me pasan los requisitos?`;
    
    } else if (modalidad === 'tarjeta') {
      mensaje = `Hola SOL & LUNA, vi el producto *${producto.title}* (${precioContadoStr}) y me interesa la opción de *Tarjeta de Crédito sin intereses*. 
      
Me gustaría consultar si mi banco/tarjeta entra en las promociones para pagarlo en *${cuotasElegidas} cuotas* de *${cuotaStr}*.`;
    
    } else if (modalidad === 'contado') {
      mensaje = `Hola SOL & LUNA, quiero adquirir el producto *${producto.title}* al contado por el valor de *${precioContadoStr}*. 
      
¿Tienen stock disponible para entrega o retiro inmediato?`;
    }

    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje.trim())}`;
    window.open(url, '_blank');
  };

  if (cargando) return <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.textoBlanco, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>Cargando detalles...</div>;
  if (error || !producto) return <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.colorRojo, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>{error || 'El producto no existe.'}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: colors.colorAcento, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', marginBottom: '30px', padding: 0 }}>
          ← Volver al catálogo
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '40px', backgroundColor: colors.bgCards, borderRadius: '20px', padding: window.innerWidth < 768 ? '20px' : '40px', border: colors.borderCard, boxShadow: colors.shadow }}>
          
          {/* Zona Izquierda */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', minHeight: '300px', maxHeight: '450px' }}>
            <img src={producto.image_url} alt={producto.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>

          {/* Zona Derecha */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: window.innerWidth < 768 ? '24px' : '28px', fontWeight: '800', color: colors.textoBlanco }}>{producto.title}</h1>
              
              <div style={{ display: 'inline-block', backgroundColor: producto.stock > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: producto.stock > 0 ? '#10b981' : '#f87171', border: `1px solid ${producto.stock > 0 ? '#10b981' : '#ef4444'}`, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
                {producto.stock > 0 ? `Stock Disponible: ${producto.stock} uds` : 'Agotado'}
              </div>

              <div style={{ borderBottom: `1px solid ${colors.borderInputs}`, paddingBottom: '20px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: colors.textoGris, display: 'block', marginBottom: '4px' }}>Precio de Contado</span>
                <span style={{ fontSize: '32px', fontWeight: '800', color: colors.colorPrecio }}>Gs. {producto.price.toLocaleString('es-PY')}</span>
              </div>

              {/* ================= SIMULADOR DE CUOTAS PERSONALIZADO ================= */}
              <div style={{ backgroundColor: colors.bgInputs, border: `1px solid ${colors.borderInputs}`, borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                
                {/* Interruptor de 3 Modalidades */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '15px', backgroundColor: colors.bgPrincipal, padding: '4px', borderRadius: '8px' }}>
                  <button type="button" onClick={() => setModalidad('financiado')} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: modalidad === 'financiado' ? colors.colorAcento : 'transparent', color: modalidad === 'financiado' ? '#fff' : colors.textoGris }}>
                    Pagar en Cuotas
                  </button>
                  <button type="button" onClick={() => setModalidad('tarjeta')} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: modalidad === 'tarjeta' ? colors.colorAcento : 'transparent', color: modalidad === 'tarjeta' ? '#fff' : colors.textoGris }}>
                    Tarjeta de Crédito
                  </button>
                  <button type="button" onClick={() => setModalidad('contado')} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: modalidad === 'contado' ? colors.colorAcento : 'transparent', color: modalidad === 'contado' ? '#fff' : colors.textoGris }}>
                    Al Contado
                  </button>
                </div>

                {/* Contenido Dinámico según pestaña */}
                {modalidad !== 'contado' ? (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: colors.textoGris, marginBottom: '6px' }}>Seleccionar cantidad de cuotas:</label>
                      <select value={cuotasElegidas} onChange={(e) => setCuotasElegidas(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: colors.bgPrincipal, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                        {Object.keys(tasasExcel).map(mes => (
                          <option key={mes} value={mes}>{mes} meses</option>
                        ))}
                      </select>
                    </div>

                    {modalidad === 'tarjeta' && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '15px', lineHeight: '1.4' }}>
                      🚨 <strong>Promoción Bancaria:</strong> Plan sin intereses sujeto a convenios activos de la empresa con entidades emisoras. Favor consultar tarjetas adheridas vía WhatsApp.
                    </div>
                    )}

                    <div style={{ textAlign: 'center', backgroundColor: colors.bgPrincipal, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
                      <span style={{ fontSize: '12px', color: colors.textoGris, display: 'block' }}>Monto de la Cuota</span>
                      <span style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', display: 'block', margin: '4px 0' }}>
                        Gs. {calcularCuotaIndividual().toLocaleString('es-PY')} <small style={{ fontSize: '12px', color: colors.textoGris, fontWeight: 'normal' }}>/ mes</small>
                      </span>
                      {modalidad === 'financiado' && (
                        <span style={{ fontSize: '11px', color: colors.textoGris }}>
                          Valor total del artículo financiado: Gs. {calcularPrecioTotalCliente().toLocaleString('es-PY')}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', backgroundColor: colors.bgPrincipal, padding: '25px 15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
                    <span style={{ fontSize: '13px', color: colors.textoGris, display: 'block', marginBottom: '5px' }}>Precio Final en Efectivo / Transferencia</span>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: colors.colorPrecio }}>Gs. {producto.price.toLocaleString('es-PY')}</span>
                    <span style={{ fontSize: '12px', color: '#10b981', display: 'block', marginTop: '6px', fontWeight: '500' }}>✓ Sin cargos adicionales por gestión</span>
                  </div>
                )}

              </div>
              {/* ================================================================= */}

              <p style={{ fontSize: '15px', lineHeight: '1.6', color: colors.textoGris, margin: '0 0 30px 0' }}>
                {producto.description || "Este artículo no cuenta con una descripción detallada por el momento. Comunícate con nuestros asesores para recibir más detalles."}
              </p>
            </div>

            {/* Botón Verde de Acción */}
            <button 
              onClick={comprarPorWhatsApp}
              disabled={producto.stock <= 0}
              style={{ 
                width: '100%', padding: '16px', 
                backgroundColor: producto.stock > 0 ? '#25D366' : colors.borderInputs, 
                color: '#fff', border: 'none', borderRadius: '12px', 
                cursor: producto.stock > 0 ? 'pointer' : 'not-allowed', 
                fontWeight: 'bold', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: producto.stock > 0 ? '0 4px 15px rgba(37, 211, 102, 0.3)' : 'none'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.01 2.004c-5.46 0-9.89 4.435-9.89 9.89 0 1.936.556 3.754 1.517 5.322L2 22l4.945-1.55c1.51.87 3.25 1.353 5.065 1.353 5.46 0 9.89-4.436 9.89-9.89 0-5.456-4.43-9.89-9.89-9.89zm5.292 13.922c-.223.63-.1.144-.927.958-.81.796-1.196.79-2.122.422-.533-.212-2.03-.795-3.863-2.433-1.422-1.272-2.382-2.843-2.66-3.324-.28-.48-.03-.74.21-.978.215-.213.48-.56.72-.84.238-.28.318-.48.477-.8.16-.32.08-.6-.04-.84-.12-.24-.96-2.312-1.316-3.17-.346-.833-.7-.72-.962-.733-.243-.013-.52-.013-.794-.013-.275 0-.72.103-1.097.514-.377.412-1.44 1.407-1.44 3.43 0 2.024 1.474 3.98 1.677 4.254.204.274 2.9 4.43 7.027 6.21 1.008.435 1.764.694 2.366.885 1.012.32 1.933.275 2.66.166.812-.12 2.484-1.014 2.833-1.993.35-.98.35-1.82.246-1.994-.104-.174-.388-.28-.81-.492z"/>
              </svg>
              {producto.stock > 0 ? 'Consultar disponibilidad por WhatsApp' : 'Sin existencias'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}