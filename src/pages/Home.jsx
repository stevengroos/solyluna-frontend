import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  // --- MEJORA DE CACHÉ: Inicializar estado desde la memoria si existe ---
  const [products, setProducts] = useState(() => {
    const cached = sessionStorage.getItem('solyluna_productos');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [categorias, setCategorias] = useState(() => {
    const cached = sessionStorage.getItem('solyluna_categorias');
    return cached ? JSON.parse(cached) : [];
  }); 
  
  // Si ya tenemos productos en caché, NO mostramos la pantalla de carga inicial
  const [cargando, setCargando] = useState(() => {
    return !sessionStorage.getItem('solyluna_productos');
  });
  
  const [error, setError] = useState('');

  // Buscador superior
  const [filtroTexto, setFiltroTexto] = useState('');
  
  // --- DEBOUNCE (ANTI-LAG) PARA EL BUSCADOR ---
  const [filtroDebounced, setFiltroDebounced] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroDebounced(filtroTexto);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtroTexto]);

  // Filtros laterales
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [ordenPrecio, setOrdenPrecio] = useState(''); 

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 12; 

  const { darkMode, colors } = useContext(ThemeContext);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);

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
  const numeroWhatsApp = "595983464526";

  useEffect(() => {
    const manejarResize = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

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

  // --- OBTENCIÓN DE DATOS CON CACHÉ (STALE-WHILE-REVALIDATE) ---
  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [resProd, resCat] = await Promise.all([
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/categories`)
        ]);
        
        setProducts(resProd.data);
        setCategorias(resCat.data);
        
        // Guardamos los datos frescos en la memoria del navegador
        sessionStorage.setItem('solyluna_productos', JSON.stringify(resProd.data));
        sessionStorage.setItem('solyluna_categorias', JSON.stringify(resCat.data));
        
      } catch (err) {
        console.error(err);
        if (products.length === 0) setError('Error al cargar los datos del catálogo.');
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL]);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroDebounced, precioMin, precioMax, soloConStock, categoriaSeleccionada, ordenPrecio]);

  // --- FUNCIONES DEL CARRITO ---
  const modificarCantidad = (idUnico, cambio) => {
    setCarrito(prev => prev.map(item => {
      const currentId = item.idUnicoInterno || item.id;
      if (currentId === idUnico) {
        const nuevaCant = item.cantidad + cambio;
        return { ...item, cantidad: nuevaCant > 0 ? nuevaCant : 1 };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (idUnico) => {
    setCarrito(prev => prev.filter(item => (item.idUnicoInterno || item.id) !== idUnico));
  };

  const enviarCarritoCompletoPorWhatsApp = () => {
    if (carrito.length === 0) return;
    let mensaje = "Hola SOL & LUNA, quiero realizar el siguiente pedido de mi carrito:\n\n";
    
    carrito.forEach(item => {
      const nombreConVariante = item.color_name ? `${item.title} (${item.color_name})` : item.title;
      if (item.modalidadElegida === 'financiado') {
        mensaje += `▪️ ${item.cantidad}x *${nombreConVariante}* -> Plan Financiado de *${item.cuotasElegidas} cuotas* de *Gs. ${item.valorCuotaCalculado?.toLocaleString('es-PY')}* c/u por mes.\n`;
      } else {
        mensaje += `▪️ ${item.cantidad}x *${nombreConVariante}* -> Al Contado (Gs. ${Number(item.price).toLocaleString('es-PY')} c/u).\n`;
      }
    });
    
    mensaje += `\n¿Tienen disponibilidad de estos artículos para iniciar la solicitud?`;
    window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // LÓGICA DE FILTRADO Y PAGINACIÓN
  const productosFiltrados = products.filter((p) => {
    const texto = filtroDebounced.toLowerCase();
    const coincideTexto = p.title.toLowerCase().includes(texto);
    const coincideMin = precioMin === '' || p.price >= parseFloat(precioMin);
    const coincideMax = precioMax === '' || p.price <= parseFloat(precioMax);
    const coincideStock = !soloConStock || p.stock > 0;
    const coincideCategoria = categoriaSeleccionada === '' || p.category_id === parseInt(categoriaSeleccionada);
    return coincideTexto && coincideMin && coincideMax && coincideStock && coincideCategoria;
  });

  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    if (ordenPrecio === 'asc') return a.price - b.price; 
    if (ordenPrecio === 'desc') return b.price - a.price; 
    return 0; 
  });

  const totalProductos = productosOrdenados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  const indiceUltimoProducto = paginaActual * productosPorPagina;
  const indicePrimerProducto = indiceUltimoProducto - productosPorPagina;
  const productosVisibles = productosOrdenados.slice(indicePrimerProducto, indiceUltimoProducto);

  const limpiarFiltrosLaterales = () => {
    setPrecioMin(''); setPrecioMax(''); setSoloConStock(false);
    setCategoriaSeleccionada(''); setOrdenPrecio(''); 
  };

  if (error) return <div style={{ padding: '50px', textAlign: 'center', color: colors.colorRojo, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif', transition: 'background-color 0.3s, color 0.3s' }}>
      
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

      {/* Solo mostramos el cargando si NO hay nada en caché */}
      {cargando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="spinner-elegante"></div>
          <p style={{ marginTop: '20px', color: '#fff', fontSize: '15px', fontWeight: '500', letterSpacing: '1px' }}>Cargando catálogo...</p>
        </div>
      )}

      <Header filtroTexto={filtroTexto} setFiltroTexto={setFiltroTexto} />

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

      <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: '25px', padding: esMovil ? '15px' : '30px 40px' }}>
        
        <aside style={{ flex: esMovil ? '1 1 auto' : '0 0 280px', backgroundColor: colors.bgCards, padding: '25px', borderRadius: '12px', boxShadow: colors.shadow, height: 'fit-content', position: esMovil ? 'static' : 'sticky', top: '100px', border: colors.borderCard, transition: 'background-color 0.3s', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, borderBottom: darkMode ? '1px solid #334155' : '1px solid #eee', paddingBottom: '10px', color: colors.textoBlanco }}>Filtrar por</h2>
          
          {categorias.length > 0 && (
            <div style={{ marginBottom: '20px', marginTop: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', color: colors.textoGris }}>Categoría:</label>
              <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', color: colors.textoGris }}>Ordenar precios:</label>
            <select value={ordenPrecio} onChange={(e) => setOrdenPrecio(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}>
              <option value="">Por relevancia (Defecto)</option>
              <option value="asc">De Menor a Mayor</option>
              <option value="desc">De Mayor a Menor</option>
            </select>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', color: colors.textoGris }}>Rango de Precio (Gs.):</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" placeholder="Mín" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none' }} />
              <input type="number" placeholder="Máx" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: colors.textoGris }}>
              <input type="checkbox" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: colors.colorAcento }} />
              Mostrar solo disponibles
            </label>
          </div>

          <button onClick={limpiarFiltrosLaterales} style={{ width: '100%', padding: '12px', backgroundColor: colors.colorRojo, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Limpiar Filtros</button>
        </aside>

        <main style={{ flex: 1, width: '100%' }}>
          <div style={{ marginBottom: '20px', fontSize: '15px', color: colors.textoGris, backgroundColor: colors.bgCards, padding: '10px 15px', borderRadius: '8px', border: colors.borderCard, display: 'inline-block', width: esMovil ? '100%' : 'auto', boxSizing: 'border-box', textAlign: 'center' }}>
            <b>{totalProductos} producto(s) encontrado(s)</b>
          </div>

          {productosOrdenados.length === 0 ? (
            <div style={{ backgroundColor: colors.bgCards, padding: '60px', textAlign: 'center', borderRadius: '12px', border: colors.borderCard }}>
              <h3 style={{ color: colors.textoGris }}>No encontramos coincidencias</h3>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                {productosVisibles.map((p) => (
                  <div key={p.id} style={{ backgroundColor: colors.bgCards, borderRadius: '12px', overflow: 'hidden', boxShadow: colors.shadow, display: 'flex', flexDirection: 'column', border: colors.borderCard, transition: 'transform 0.2s' }}>
                    <div style={{ height: '220px', padding: '15px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={p.image_url} alt={p.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: colors.textoBlanco, lineHeight: '1.4', fontWeight: '600' }}>{p.title}</h3>
                      <p style={{ fontSize: '13px', color: colors.textoGris, margin: '0 0 15px 0', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>{p.description}</p>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.colorPrecio, marginBottom: '12px' }}>Gs. {p.price.toLocaleString('es-PY')}</div>
                      <div style={{ fontSize: '12px', color: p.stock > 0 ? (darkMode ? '#34d399' : '#155724') : (darkMode ? '#f87171' : '#721c24'), backgroundColor: p.stock > 0 ? (darkMode ? 'rgba(52, 211, 153, 0.1)' : '#d4edda') : (darkMode ? 'rgba(248, 113, 113, 0.1)' : '#f8d7da'), padding: '6px 12px', borderRadius: '20px', display: 'inline-block', width: 'fit-content', marginBottom: '15px' }}>
                        {p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}
                      </div>
                      <button onClick={() => navigate(`/producto/${p.id}`)} disabled={p.stock === 0} style={{ width: '100%', padding: '12px', backgroundColor: p.stock > 0 ? colors.colorAcento : (darkMode ? '#475569' : '#bdc3c7'), color: p.stock > 0 ? (darkMode ? '#0f172a' : '#fff') : '#94a3b8', border: 'none', borderRadius: '8px', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' }}>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '30px', padding: '10px 0', flexWrap: 'wrap' }}>
                  <button onClick={() => setPaginaActual(p => Math.max(p - 1, 1))} disabled={paginaActual === 1} style={{ padding: '10px 14px', border: '1px solid', borderColor: colors.borderInputs, borderRadius: '6px', backgroundColor: colors.bgCards, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', color: colors.textoGris }}>«</button>
                  {Array.from({ length: totalPaginas }, (_, index) => {
                    const numeroPagina = index + 1;
                    const esActiva = numeroPagina === paginaActual;
                    return (
                      <button key={numeroPagina} onClick={() => setPaginaActual(numeroPagina)} style={{ padding: '10px 14px', border: '1px solid', borderColor: esActiva ? colors.colorAcento : colors.borderInputs, borderRadius: '6px', backgroundColor: esActiva ? colors.colorAcento : colors.bgCards, color: esActiva ? (darkMode ? '#0f172a' : '#fff') : colors.textoBlanco, fontWeight: 'bold', cursor: 'pointer' }}>{numeroPagina}</button>
                    );
                  })}
                  <button onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))} disabled={paginaActual === totalPaginas} style={{ padding: '10px 14px', border: '1px solid', borderColor: colors.borderInputs, borderRadius: '6px', backgroundColor: colors.bgCards, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', color: colors.textoGris }}>»</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {mostrarCarrito && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 2000 }}>
          <div style={{ width: esMovil ? '100%' : '450px', backgroundColor: colors.bgCards, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s forwards' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${colors.borderInputs}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgInputs }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: colors.textoBlanco, display: 'flex', alignItems: 'center', gap: '10px' }}>🛒 Tu Carrito ({carrito.length})</h2>
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
                  {carrito.map(item => {
                    const currentId = item.idUnicoInterno || item.id;
                    return (
                    <div key={currentId} style={{ display: 'flex', gap: '15px', backgroundColor: colors.bgInputs, padding: '15px', borderRadius: '12px', border: `1px solid ${colors.borderInputs}` }}>
                      <img src={item.image_url} alt={item.title} style={{ width: '60px', height: '60px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '8px' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: colors.textoBlanco, lineHeight: '1.3' }}>
                          {item.title} {item.color_name && <span style={{color: colors.textoGris, fontWeight: 'normal'}}> - {item.color_name}</span>}
                        </h4>
                        
                        {item.modalidadElegida === 'financiado' ? (
                          <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>
                            {item.cuotasElegidas} cuotas de Gs. {item.valorCuotaCalculado?.toLocaleString('es-PY')}
                          </span>
                        ) : (
                          <span style={{ color: colors.colorPrecio, fontWeight: 'bold', fontSize: '14px' }}>
                            Gs. {Number(item.price).toLocaleString('es-PY')} (Contado)
                          </span>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.bgPrincipal, borderRadius: '6px', padding: '4px 8px', border: `1px solid ${colors.borderInputs}` }}>
                            <button onClick={() => modificarCantidad(currentId, -1)} style={{ background: 'none', border: 'none', color: colors.textoBlanco, cursor: 'pointer', fontSize: '16px' }}>-</button>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                            <button onClick={() => modificarCantidad(currentId, 1)} style={{ background: 'none', border: 'none', color: colors.textoBlanco, cursor: 'pointer', fontSize: '16px' }}>+</button>
                          </div>
                          <button onClick={() => eliminarDelCarrito(currentId)} style={{ background: 'none', border: 'none', color: colors.colorRojo, cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Eliminar</button>
                        </div>
                      </div>
                    </div>
                  )})}
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