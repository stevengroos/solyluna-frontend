import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import Header from '../components/Header';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors } = useContext(ThemeContext);

  // --- MEJORA DE CACHÉ: Buscar el producto en la memoria primero ---
  const [producto, setProducto] = useState(() => {
    try {
      const cached = sessionStorage.getItem('solyluna_productos');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Buscamos si el producto ya existe en la lista guardada
        const found = parsed.find(p => p.id.toString() === id);
        if (found) return found;
      }
    } catch (e) {}
    return null;
  });

  // Si encontramos el producto en caché, NO mostramos la pantalla de carga
  const [cargando, setCargando] = useState(() => {
    try {
      const cached = sessionStorage.getItem('solyluna_productos');
      if (cached) {
        const parsed = JSON.parse(cached);
        const found = parsed.find(p => p.id.toString() === id);
        if (found) return false;
      }
    } catch (e) {}
    return true;
  });

  const [error, setError] = useState('');
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);

  // --- OPCIONES DEL CUOTERO ---
  const [modalidad, setModalidad] = useState('financiado'); 
  const [cuotasElegidas, setCuotasElegidas] = useState(3); 
  const tasasExcel = {
    2: 6.4, 3: 8.4, 4: 10.4, 5: 12.3, 6: 14.2, 7: 16.0, 8: 17.7, 
    9: 19.5, 10: 21.2, 11: 22.8, 12: 24.4, 13: 25.9, 14: 27.5, 
    15: 28.9, 16: 30.4, 17: 31.8, 18: 33.2, 19: 34.5, 20: 35.8, 
    21: 37.0, 22: 38.3, 23: 39.5, 24: 40.7
  };

  // --- ESTADOS DEL CARRITO FLOTANTE ---
  const [carrito, setCarrito] = useState(() => {
    try {
      const carritoGuardado = localStorage.getItem('solyluna_carrito');
      return carritoGuardado ? JSON.parse(carritoGuardado) : [];
    } catch (e) {
      return [];
    }
  });
  const [mostrarCarrito, setMostrarCarrito] = useState(false);

  const numeroWhatsApp = "595986201213"; 
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // --- OBTENCIÓN DE DATOS CON REVALIDACIÓN SILENCIOSA ---
  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/products/${id}`);
        const dataSegura = Array.isArray(response.data) ? response.data[0] : response.data;
        
        if (!dataSegura) throw new Error('Producto vacío');
        
        // Actualizamos el estado con los datos más frescos del servidor
        setProducto(dataSegura);
        
      } catch (err) {
        console.error("Error al cargar producto:", err);
        if (!producto) setError('No se pudo encontrar el producto.');
      } finally {
        setCargando(false);
      }
    };
    fetchProducto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, API_URL]);

  // --- SINCRONIZACIÓN DEL CARRITO ---
  useEffect(() => {
    const actualizarCarrito = () => {
      try {
        const carritoGuardado = localStorage.getItem('solyluna_carrito');
        if (carritoGuardado) setCarrito(JSON.parse(carritoGuardado));
      } catch (e) {}
    };
    window.addEventListener('storage', actualizarCarrito);
    return () => window.removeEventListener('storage', actualizarCarrito);
  }, []);

  useEffect(() => {
    localStorage.setItem('solyluna_carrito', JSON.stringify(carrito));
  }, [carrito]);

  // --- FUNCIONES DEL CUOTERO ---
  const precioBase = producto ? Number(producto.price) || 0 : 0;
  const imagenMostrar = varianteSeleccionada?.image_url || producto?.image_url;
  const stockMostrar = varianteSeleccionada ? varianteSeleccionada.stock : (producto?.stock || 0);
  const nombreProductoFinal = varianteSeleccionada ? `${producto?.title} - ${varianteSeleccionada.color_name}` : producto?.title;
  
  const calcularCuotaIndividual = () => {
    if (!producto) return 0;
    const tasa = tasasExcel[cuotasElegidas] || 0;
    const precioFinal = precioBase / (1 - (tasa / 100));
    return Math.round(precioFinal / cuotasElegidas);
  };

  const comprarPorWhatsApp = () => {
    if (!producto) return;
    let mensaje = "";
    const precioContadoStr = `Gs. ${precioBase.toLocaleString('es-PY')}`;
    const cuotaStr = `Gs. ${calcularCuotaIndividual().toLocaleString('es-PY')}`;

    if (modalidad === 'financiado') {
      mensaje = `Hola SOL & LUNA, estoy interesado en el producto *${nombreProductoFinal}* (Contado: ${precioContadoStr}). \n\nQuiero solicitar el plan de financiación de *${cuotasElegidas} cuotas* de *${cuotaStr}* al mes. ¿Me pasan los requisitos?`;
    } else if (modalidad === 'contado') {
      mensaje = `Hola SOL & LUNA, quiero adquirir el producto *${nombreProductoFinal}* al contado por el valor de *${precioContadoStr}*. \n\n¿Tienen stock disponible para entrega o retiro inmediato?`;
    }

    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje.trim())}`;
    window.open(url, '_blank');
  };

  // --- FUNCIONES DEL CARRITO ---
  const agregarAlCarrito = () => {
    setCarrito(prev => {
      const nuevoItem = {
        ...producto,
        idUnicoInterno: Date.now() + Math.random(), 
        price: precioBase,
        cantidad: 1,
        modalidadElegida: modalidad,
        cuotasElegidas: modalidad === 'financiado' ? cuotasElegidas : null,
        valorCuotaCalculado: modalidad === 'financiado' ? calcularCuotaIndividual() : 0,
        color_name: varianteSeleccionada?.color_name || null,
        image_url: imagenMostrar
      };
      return [...prev, nuevoItem];
    });
    setMostrarCarrito(true); 
  };

  const modificarCantidad = (idUnico, cambio) => {
    setCarrito(prev => prev.map(item => {
      if (item.idUnicoInterno === idUnico) {
        const nuevaCant = item.cantidad + cambio;
        return { ...item, cantidad: nuevaCant > 0 ? nuevaCant : 1 };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (idUnico) => {
    setCarrito(prev => prev.filter(item => item.idUnicoInterno !== idUnico));
  };

  const enviarCarritoCompletoPorWhatsApp = () => {
    if (carrito.length === 0) return;
    let mensaje = "Hola SOL & LUNA, quiero realizar el siguiente pedido de mi carrito:\n\n";
    
    carrito.forEach(item => {
      if (item.modalidadElegida === 'financiado') {
        mensaje += `▪️ ${item.cantidad}x *${item.title}* -> Plan Financiado de *${item.cuotasElegidas} cuotas* de *Gs. ${item.valorCuotaCalculado.toLocaleString('es-PY')}* c/u por mes.\n`;
      } else {
        mensaje += `▪️ ${item.cantidad}x *${item.title}* -> Al Contado (Gs. ${Number(item.price).toLocaleString('es-PY')} c/u).\n`;
      }
    });
    
    mensaje += `\n¿Tienen disponibilidad de estos artículos para iniciar la solicitud?`;
    window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // --- LOADER PREMIUM ---
  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
        <div className="spinner-elegante"></div>
        <p style={{ marginTop: '20px', color: colors.textoBlanco, fontSize: '15px', fontWeight: '500', letterSpacing: '1px' }}>Cargando detalles...</p>
      </div>
    );
  }

  if (error || !producto) return <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.colorRojo, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>{error || 'El producto no existe.'}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif' }}>
      
      <Header filtroTexto="" setFiltroTexto={() => {}} />

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      {carrito.length > 0 && (
        <button 
          onClick={() => setMostrarCarrito(true)}
          style={{ position: 'fixed', bottom: '25px', right: '25px', backgroundColor: colors.colorAcento, color: '#fff', border: 'none', borderRadius: '50%', width: '65px', height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 999 }}
        >
          🛒
          <span style={{ position: 'absolute', top: '0px', right: '0px', backgroundColor: colors.colorRojo, color: '#fff', fontSize: '13px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${colors.bgPrincipal}` }}>
            {carrito.reduce((acc, item) => acc + item.cantidad, 0)}
          </span>
        </button>
      )}

      <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px', boxSizing: 'border-box' }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: colors.colorAcento, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', marginBottom: '30px', padding: 0 }}>
          ← Volver al catálogo
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '40px', backgroundColor: colors.bgCards, borderRadius: '20px', padding: window.innerWidth < 768 ? '20px' : '40px', border: colors.borderCard, boxShadow: colors.shadow }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', minHeight: '300px', maxHeight: '450px' }}>
            <img src={imagenMostrar} alt={producto.title || 'Producto'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: window.innerWidth < 768 ? '24px' : '28px', fontWeight: '800', color: colors.textoBlanco }}>{producto.title}</h1>
              {producto.variants && producto.variants.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', color: colors.textoGris, display: 'block', marginBottom: '8px' }}>
                    Opciones disponibles: <strong>{varianteSeleccionada ? varianteSeleccionada.color_name : 'Color Principal (Original)'}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    
                    {/* Botón para el producto Original */}
                    <button 
                      onClick={() => setVarianteSeleccionada(null)}
                      style={{ 
                        padding: '8px 16px', borderRadius: '8px', 
                        border: varianteSeleccionada === null ? `2px solid ${colors.colorAcento}` : `1px solid ${colors.borderInputs}`, 
                        backgroundColor: varianteSeleccionada === null ? 'rgba(56, 189, 248, 0.1)' : colors.bgInputs, 
                        color: colors.textoBlanco, cursor: 'pointer', fontSize: '13px',
                        fontWeight: varianteSeleccionada === null ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                      }}>
                      Estandar (Original)
                    </button>

                    {/* Botones de las variantes extra */}
                    {producto.variants.map(v => (
                      <button 
                        key={v.id} 
                        onClick={() => setVarianteSeleccionada(v)}
                        style={{ 
                          padding: '8px 16px', borderRadius: '8px', 
                          border: varianteSeleccionada?.id === v.id ? `2px solid ${colors.colorAcento}` : `1px solid ${colors.borderInputs}`, 
                          backgroundColor: varianteSeleccionada?.id === v.id ? 'rgba(56, 189, 248, 0.1)' : colors.bgInputs, 
                          color: colors.textoBlanco, cursor: 'pointer', fontSize: '13px',
                          fontWeight: varianteSeleccionada?.id === v.id ? 'bold' : 'normal',
                          transition: 'all 0.2s'
                        }}>
                        {v.color_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'inline-block', backgroundColor: stockMostrar > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: stockMostrar > 0 ? '#10b981' : '#f87171', border: `1px solid ${stockMostrar > 0 ? '#10b981' : '#ef4444'}`, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
                {stockMostrar > 0 ? `Stock Disponible: ${stockMostrar} uds` : 'Agotado'}
              </div>

              {stockMostrar > 0 && producto.has_physical_stock === false && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#d97706', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '20px', lineHeight: '1.4' }}>
                  ⚠️ <strong>Aviso:</strong> Este artículo cuenta con stock para entrega o envío inmediato, pero <strong>no se encuentra en exhibición</strong> en nuestro local físico.
                </div>
              )}

              <div style={{ borderBottom: `1px solid ${colors.borderInputs}`, paddingBottom: '20px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: colors.textoGris, display: 'block', marginBottom: '4px' }}>Precio de Contado</span>
                <span style={{ fontSize: '32px', fontWeight: '800', color: colors.colorPrecio }}>Gs. {precioBase.toLocaleString('es-PY')}</span>
              </div>

              {/* ================= SIMULADOR DE CUOTAS PERSONALIZADO ================= */}
              <div style={{ backgroundColor: colors.bgInputs, border: `1px solid ${colors.borderInputs}`, borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                
                <div style={{ display: 'flex', gap: '4px', marginBottom: '15px', backgroundColor: colors.bgPrincipal, padding: '4px', borderRadius: '8px' }}>
                  <button type="button" onClick={() => setModalidad('financiado')} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: modalidad === 'financiado' ? colors.colorAcento : 'transparent', color: modalidad === 'financiado' ? '#fff' : colors.textoGris }}>
                    Pagar en Cuotas
                  </button>
                  <button type="button" onClick={() => setModalidad('contado')} style={{ flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: modalidad === 'contado' ? colors.colorAcento : 'transparent', color: modalidad === 'contado' ? '#fff' : colors.textoGris }}>
                    Al Contado
                  </button>
                </div>

                {modalidad !== 'contado' ? (
                  <>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '15px', lineHeight: '1.4' }}>
                      🚨 <strong>Promoción Bancaria:</strong> Plan sin intereses sujeto a convenios activos de la empresa con entidades emisoras. Favor consultar tarjetas adheridas vía WhatsApp.
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: colors.textoGris, marginBottom: '6px' }}>Seleccionar cantidad de cuotas:</label>
                      <select value={cuotasElegidas} onChange={(e) => setCuotasElegidas(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: colors.bgPrincipal, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                        {Object.keys(tasasExcel).map(mes => (
                          <option key={mes} value={mes}>{mes} Cuotas</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ textAlign: 'center', backgroundColor: colors.bgPrincipal, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
                      <span style={{ fontSize: '12px', color: colors.textoGris, display: 'block' }}>Monto de la Cuota</span>
                      <span style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', display: 'block', margin: '4px 0' }}>
                        Gs. {calcularCuotaIndividual().toLocaleString('es-PY')} <small style={{ fontSize: '12px', color: colors.textoGris, fontWeight: 'normal' }}>/ mes</small>
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', backgroundColor: colors.bgPrincipal, padding: '25px 15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
                    <span style={{ fontSize: '13px', color: colors.textoGris, display: 'block', marginBottom: '5px' }}>Precio Final</span>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: colors.colorPrecio }}>Gs. {precioBase.toLocaleString('es-PY')}</span>
                    <span style={{ fontSize: '12px', color: '#10b981', display: 'block', marginTop: '6px', fontWeight: '500' }}></span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '15px', lineHeight: '1.6', color: colors.textoGris, margin: '0 0 30px 0' }}>
                {producto.description || "Este artículo no cuenta con una descripción detallada por el momento. Comunícate con nuestros asesores para recibir más detalles."}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={comprarPorWhatsApp}
                disabled={stockMostrar <= 0}
                style={{ width: '100%', padding: '16px', backgroundColor: stockMostrar > 0 ? '#25D366' : colors.borderInputs, color: '#fff', border: 'none', borderRadius: '12px', cursor: stockMostrar > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: stockMostrar > 0 ? '0 4px 15px rgba(37, 211, 102, 0.3)' : 'none' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.01 2.004c-5.46 0-9.89 4.435-9.89 9.89 0 1.936.556 3.754 1.517 5.322L2 22l4.945-1.55c1.51.87 3.25 1.353 5.065 1.353 5.46 0 9.89-4.436 9.89-9.89 0-5.456-4.43-9.89-9.89-9.89zm5.292 13.922c-.223.63-.1.144-.927.958-.81.796-1.196.79-2.122.422-.533-.212-2.03-.795-3.863-2.433-1.422-1.272-2.382-2.843-2.66-3.324-.28-.48-.03-.74.21-.978.215-.213.48-.56.72-.84.238-.28.318-.48.477-.8.16-.32.08-.6-.04-.84-.12-.24-.96-2.312-1.316-3.17-.346-.833-.7-.72-.962-.733-.243-.013-.52-.013-.794-.013-.275 0-.72.103-1.097.514-.377.412-1.44 1.407-1.44 3.43 0 2.024 1.474 3.98 1.677 4.254.204.274 2.9 4.43 7.027 6.21 1.008.435 1.764.694 2.366.885 1.012.32 1.933.275 2.66.166.812-.12 2.484-1.014 2.833-1.993.35-.98.35-1.82.246-1.994-.104-.174-.388-.28-.81-.492z"/></svg>
                {stockMostrar > 0 ? 'Consultar esta opción' : 'Sin existencias'}
              </button>

              <button 
                onClick={agregarAlCarrito} 
                disabled={stockMostrar <= 0}
                style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', color: stockMostrar > 0 ? colors.colorAcento : colors.textoGris, border: `2px solid ${stockMostrar > 0 ? colors.colorAcento : colors.borderInputs}`, borderRadius: '12px', cursor: stockMostrar > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background-color 0.2s' }}
                onMouseEnter={e => { if(stockMostrar>0) {e.target.style.backgroundColor = colors.colorAcento; e.target.style.color = '#fff'} }}
                onMouseLeave={e => { if(stockMostrar>0) {e.target.style.backgroundColor = 'transparent'; e.target.style.color = colors.colorAcento} }}
              >
                🛒 {stockMostrar > 0 ? 'Añadir al Carrito de Pedidos' : 'Agotado'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL DEL CARRITO DESLIZANTE ================= */}
      {mostrarCarrito && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 2000 }}>
          <div style={{ width: window.innerWidth < 768 ? '100%' : '450px', backgroundColor: colors.bgCards, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s forwards' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${colors.borderInputs}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgInputs }}>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: colors.textoBlanco, display: 'flex', alignItems: 'center', gap: '10px' }}>🛒 Tu Carrito ({carrito.length})</h2>
              <button onClick={() => setMostrarCarrito(false)} style={{ background: 'none', border: 'none', color: colors.textoGris, fontSize: '28px', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {carrito.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textoGris, marginTop: '50px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '15px' }}>🛍️</div>
                  <p>Tu carrito está vacío.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {carrito.map(item => (
                    <div key={item.idUnicoInterno} style={{ display: 'flex', gap: '15px', backgroundColor: colors.bgInputs, padding: '15px', borderRadius: '12px', border: `1px solid ${colors.borderInputs}` }}>
                      <img src={item.image_url} alt={item.title}  style={{ width: '60px', height: '60px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: colors.textoBlanco, lineHeight: '1.3' }}>
                          {item.title} {item.color_name && <span style={{color: colors.textoGris, fontWeight: 'normal'}}> - {item.color_name}</span>}
                        </h4>
                        
                        {item.modalidadElegida === 'financiado' ? (
                          <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>
                            {item.cuotasElegidas} cuotas de Gs. {item.valorCuotaCalculado.toLocaleString('es-PY')}
                          </span>
                        ) : (
                          <span style={{ color: colors.colorPrecio, fontWeight: 'bold', fontSize: '14px' }}>
                            Gs. {Number(item.price).toLocaleString('es-PY')} (Contado)
                          </span>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.bgPrincipal, borderRadius: '6px', padding: '4px 8px', border: `1px solid ${colors.borderInputs}` }}>
                            <button onClick={() => modificarCantidad(item.idUnicoInterno, -1)} style={{ background: 'none', border: 'none', color: colors.textoBlanco, cursor: 'pointer', fontSize: '16px' }}>-</button>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                            <button onClick={() => modificarCantidad(item.idUnicoInterno, 1)} style={{ background: 'none', border: 'none', color: colors.textoBlanco, cursor: 'pointer', fontSize: '16px' }}>+</button>
                          </div>
                          <button onClick={() => eliminarDelCarrito(item.idUnicoInterno)} style={{ background: 'none', border: 'none', color: colors.colorRojo, cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div style={{ padding: '25px 20px', borderTop: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs }}>
                <button onClick={enviarCarritoCompletoPorWhatsApp} style={{ width: '100%', padding: '16px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.01 2.004c-5.46 0-9.89 4.435-9.89 9.89 0 1.936.556 3.754 1.517 5.322L2 22l4.945-1.55c1.51.87 3.25 1.353 5.065 1.353 5.46 0 9.89-4.436 9.89-9.89 0-5.456-4.43-9.89-9.89-9.89zm5.292 13.922c-.223.63-.1.144-.927.958-.81.796-1.196.79-2.122.422-.533-.212-2.03-.795-3.863-2.433-1.422-1.272-2.382-2.843-2.66-3.324-.28-.48-.03-.74.21-.978.215-.213.48-.56.72-.84.238-.28.318-.48.477-.8.16-.32.08-.6-.04-.84-.12-.24-.96-2.312-1.316-3.17-.346-.833-.7-.72-.962-.733-.243-.013-.52-.013-.794-.013-.275 0-.72.103-1.097.514-.377.412-1.44 1.407-1.44 3.43 0 2.024 1.474 3.98 1.677 4.254.204.274 2.9 4.43 7.027 6.21 1.008.435 1.764.694 2.366.885 1.012.32 1.933.275 2.66.166.812-.12 2.484-1.014 2.833-1.993.35-.98.35-1.82.246-1.994-.104-.174-.388-.28-.81-.492z"/></svg>
                  Enviar Pedido Completo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}