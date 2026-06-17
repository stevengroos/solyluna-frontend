import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

export default function AdminPanel() {
  const { colors, darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [tabActiva, setTabActiva] = useState('productos');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estados Categorías
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [categoriaExpandida, setCategoriaExpandida] = useState(null);
  const [busquedaProductoCat, setBusquedaProductoCat] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  // Estado Formulario Nuevo Producto
  const [formProducto, setFormProducto] = useState({
  title: '', description: '', price: '', stock: '', image: null, category_id: '', has_physical_stock: true // <-- NUEVO
  });

  // Modal de Edición
  const [productoEditando, setProductoEditando] = useState(null);

  // Estados Tabla Productos
  const [filtroTablaProductos, setFiltroTablaProductos] = useState('');
  const [paginaActualProd, setPaginaActualProd] = useState(1);
  const [stockBorrador, setStockBorrador] = useState({}); 

  const productosPorPagina = 20;

  // --- NUEVO: Detector de pantalla móvil para el panel administrativo ---
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);

  useEffect(() => {
    const manejarResize = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/login');
      return;
    }
    cargarDatos();
  }, [navigate]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resProd, resCat] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      setProductos(resProd.data);
      setCategorias(resCat.data);
    } catch (err) {
      console.error(err);
      mostrarMensaje('Error al conectar con el servidor.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  // --- LOGICA STOCK ---
  const manejarCambioStockBorrador = (id, nuevoValor) => {
    if (nuevoValor < 0) return;
    setStockBorrador(prev => ({ ...prev, [id]: parseInt(nuevoValor) }));
  };

  const confirmarStockBD = async (id) => {
    const nuevoStock = stockBorrador[id];
    if (nuevoStock === undefined) return;
    const token = localStorage.getItem('adminToken');
    try {
      await axios.put(`${API_URL}/api/products/${id}/stock`, 
        { stock: nuevoStock },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductos(productos.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));
      const nuevoBorrador = { ...stockBorrador };
      delete nuevoBorrador[id];
      setStockBorrador(nuevoBorrador);
      mostrarMensaje('Inventario actualizado.', 'success');
    } catch (err) {
      mostrarMensaje('Error al actualizar stock.', 'error');
    }
  };

  const cancelarStockBorrador = (id) => {
    const nuevoBorrador = { ...stockBorrador };
    delete nuevoBorrador[id];
    setStockBorrador(nuevoBorrador);
  };

  // --- LOGICA CREACIÓN ---
  const guardarCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    const token = localStorage.getItem('adminToken');
    try {
      const response = await axios.post(`${API_URL}/api/categories`, 
        { name: nuevaCategoria },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategorias([...categorias, response.data]);
      setNuevaCategoria('');
      mostrarMensaje('Categoría creada 🎉', 'success');
    } catch (err) {
      mostrarMensaje('Error al crear categoría.', 'error');
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.image) {
      mostrarMensaje('Por favor, selecciona una foto para el producto.', 'error');
      return;
    }
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('title', formProducto.title);
    formData.append('description', formProducto.description);
    formData.append('price', formProducto.price);
    formData.append('stock', formProducto.stock);
    formData.append('image', formProducto.image);
    formData.append('has_physical_stock', formProducto.has_physical_stock);
    if (formProducto.category_id) formData.append('category_id', formProducto.category_id);

    try {
      setCargando(true);
      await axios.post(`${API_URL}/api/products`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      mostrarMensaje('¡Producto publicado exitosamente!', 'success');
      setFormProducto({ title: '', description: '', price: '', stock: '', image: null, category_id: '' });
      cargarDatos(); 
      setTabActiva('productos'); 
    } catch (err) {
      mostrarMensaje(err.response?.data?.detail || 'Error al registrar producto.', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- GUARDAR EDICIÓN DEL PRODUCTO ---
  const guardarEdicionProducto = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    
    formData.append('title', productoEditando.title);
    formData.append('description', productoEditando.description || '');
    formData.append('price', productoEditando.price);
    formData.append('has_physical_stock', productoEditando.has_physical_stock ?? true);
    if (productoEditando.category_id) formData.append('category_id', productoEditando.category_id);
    
    if (productoEditando.nueva_imagen) {
      formData.append('image', productoEditando.nueva_imagen);
    }

    try {
      setCargando(true);
      await axios.put(`${API_URL}/api/products/${productoEditando.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      mostrarMensaje('¡Cambios guardados con éxito!', 'success');
      setProductoEditando(null); 
      cargarDatos(); 
    } catch (err) {
      mostrarMensaje(err.response?.data?.detail || 'Error al editar producto.', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- LOGICA CATEGORIAS MÚLTIPLES ---
  const agregarProductosMultiples = async (categoriaId) => {
    if (productosSeleccionados.length === 0) return;
    const token = localStorage.getItem('adminToken');
    try {
      await Promise.all(productosSeleccionados.map(prodId => axios.put(`${API_URL}/api/products/${prodId}/category`, { category_id: categoriaId }, { headers: { Authorization: `Bearer ${token}` } })));
      setProductos(productos.map(p => productosSeleccionados.includes(p.id) ? { ...p, category_id: categoriaId } : p));
      setProductosSeleccionados([]); setBusquedaProductoCat('');
      mostrarMensaje(`Asignado con éxito`, 'success');
    } catch (err) {
      mostrarMensaje('Error al asignar.', 'error');
    }
  };

  const quitarProductoDeCategoria = async (productoId) => {
    const token = localStorage.getItem('adminToken');
    try {
      await axios.put(`${API_URL}/api/products/${productoId}/category`, { category_id: null }, { headers: { Authorization: `Bearer ${token}` } });
      setProductos(productos.map(p => p.id === parseInt(productoId) ? { ...p, category_id: null } : p));
    } catch (err) {
      mostrarMensaje('Error al desvincular.', 'error');
    }
  };

  const productosTablaFiltrados = productos.filter(p => p.title.toLowerCase().includes(filtroTablaProductos.toLowerCase()));
  const totalPaginasProd = Math.ceil(productosTablaFiltrados.length / productosPorPagina);
  const idxUltimoProd = paginaActualProd * productosPorPagina;
  const idxPrimerProd = idxUltimoProd - productosPorPagina;
  const productosTablaVisibles = productosTablaFiltrados.slice(idxPrimerProd, idxUltimoProd);

  useEffect(() => { setPaginaActualProd(1); }, [filtroTablaProductos]);

  if (cargando) return <div style={{ padding: '50px', textAlign: 'center', color: colors.textoBlanco, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>Procesando...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header Responsivo */}
      <div style={{ 
        backgroundColor: colors.bgCards, 
        padding: esMovil ? '15px 20px' : '15px 40px', 
        display: 'flex', 
        flexDirection: esMovil ? 'column' : 'row',
        gap: esMovil ? '12px' : '0px',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: colors.shadow, 
        borderBottom: darkMode ? '1px solid #334155' : '1px solid #e2e8f0', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: colors.colorAcento, fontWeight: '800' }}>SOL&LUNA <span style={{ color: colors.textoGris, fontWeight: '400', fontSize: '16px' }}>/ Workspace</span></h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', width: esMovil ? '100%' : 'auto', justifyContent: esMovil ? 'space-between' : 'flex-end' }}>
          <Link to="/" style={{ color: colors.textoGris, textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}>Ir a la Tienda ↗</Link>
          <button onClick={cerrarSesion} style={{ backgroundColor: 'transparent', color: colors.colorRojo, border: `1px solid ${colors.colorRojo}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar Sesión</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: esMovil ? '0 15px' : '0 20px' }}>
        
        {mensaje.texto && (
          <div style={{ backgroundColor: mensaje.tipo === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: '1px solid', borderColor: mensaje.tipo === 'success' ? '#34d399' : '#ef4444', color: mensaje.tipo === 'success' ? '#34d399' : '#f87171', padding: '15px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mensaje.tipo === 'success' ? '✅' : '⚠️'} {mensaje.texto}
          </div>
        )}

        {/* Menú de pestañas deslizable horizontalmente en teléfonos */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px', 
          borderBottom: `1px solid ${colors.borderInputs}`, 
          paddingBottom: '15px',
          overflowX: esMovil ? 'auto' : 'visible',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch'
        }}>
          <button onClick={() => setTabActiva('productos')} style={{ flexShrink: 0, background: tabActiva === 'productos' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'productos' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'productos' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Inventario ({productos.length})</button>
          <button onClick={() => setTabActiva('categorias')} style={{ flexShrink: 0, background: tabActiva === 'categorias' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'categorias' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'categorias' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Categorías ({categorias.length})</button>
          <button onClick={() => setTabActiva('nuevo-producto')} style={{ flexShrink: 0, background: tabActiva === 'nuevo-producto' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'nuevo-producto' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'nuevo-producto' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Publicar Producto</button>
        </div>

        {/* PESTAÑA PRODUCTOS */}
        {tabActiva === 'productos' && (
          <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', border: colors.borderCard, padding: esMovil ? '20px' : '30px', boxShadow: colors.shadow }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: esMovil ? 'column' : 'row',
              gap: esMovil ? '15px' : '0px',
              justifyContent: 'space-between', 
              alignItems: esMovil ? 'flex-start' : 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Gestión General</h3>
              <div style={{ position: 'relative', width: esMovil ? '100%' : '350px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px' }}>🔍</span>
                <input type="text" placeholder="Buscar productos..." value={filtroTablaProductos} onChange={e => setFiltroTablaProductos(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}/>
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.bgInputs, color: colors.textoGris }}>
                    <th style={{ padding: '15px' }}>Imagen</th><th style={{ padding: '15px' }}>Producto</th><th style={{ padding: '15px' }}>Precio Base</th><th style={{ padding: '15px', width: '150px' }}>Existencias</th><th style={{ padding: '15px' }}>Categoría</th><th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosTablaVisibles.map((p) => {
                    const catAsociada = categorias.find(c => c.id === p.category_id);
                    const stockActualVisible = stockBorrador[p.id] !== undefined ? stockBorrador[p.id] : p.stock;
                    const hayCambiosPendientes = stockBorrador[p.id] !== undefined && stockBorrador[p.id] !== p.stock;

                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${colors.borderInputs}` }}>
                        <td style={{ padding: '15px' }}><img src={p.image_url} alt="" style={{ width: '45px', height: '45px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '6px' }} /></td>
                        <td style={{ padding: '15px', fontWeight: '500' }}>{p.title}</td>
                        <td style={{ padding: '15px', color: colors.colorPrecio, fontWeight: 'bold' }}>Gs. {p.price.toLocaleString('es-PY')}</td>
                        
                        {/* Stock */}
                        <td style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button onClick={() => manejarCambioStockBorrador(p.id, stockActualVisible - 1)} style={{ padding: '4px 8px', backgroundColor: colors.bgInputs, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, borderRadius: '4px', cursor: 'pointer' }}>-</button>
                              <input type="number" value={stockActualVisible} onChange={(e) => manejarCambioStockBorrador(p.id, e.target.value)} style={{ width: '50px', textAlign: 'center', padding: '4px', backgroundColor: hayCambiosPendientes ? (darkMode ? '#334155' : '#fff3cd') : colors.bgPrincipal, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, borderRadius: '4px', outline: 'none' }} />
                              <button onClick={() => manejarCambioStockBorrador(p.id, stockActualVisible + 1)} style={{ padding: '4px 8px', backgroundColor: colors.bgInputs, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, borderRadius: '4px', cursor: 'pointer' }}>+</button>
                            </div>
                            {hayCambiosPendientes && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => confirmarStockBD(p.id)} style={{ flex: 1, padding: '4px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>💾</button>
                                <button onClick={() => cancelarStockBorrador(p.id)} style={{ padding: '4px', backgroundColor: colors.colorRojo, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td style={{ padding: '15px' }}><span style={{ backgroundColor: catAsociada ? colors.bgInputs : 'transparent', border: catAsociada ? `1px solid ${colors.borderInputs}` : 'none', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', color: catAsociada ? colors.textoBlanco : colors.textoGris }}>{catAsociada ? catAsociada.name : 'Sin asignar'}</span></td>
                        
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <button onClick={() => setProductoEditando(p)} style={{ backgroundColor: 'transparent', border: `1px solid ${colors.colorAcento}`, color: colors.colorAcento, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            {totalPaginasProd > 1 && (
              <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: esMovil ? '12px' : '0px', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '14px', color: colors.textoGris }}>
                <span>Mostrando {idxPrimerProd + 1} - {Math.min(idxUltimoProd, productosTablaFiltrados.length)} de {productosTablaFiltrados.length}</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => setPaginaActualProd(p => Math.max(p - 1, 1))} disabled={paginaActualProd === 1} style={{ padding: '8px 12px', border: `1px solid ${colors.borderInputs}`, borderRadius: '6px', backgroundColor: colors.bgInputs, cursor: 'pointer', color: colors.textoGris }}>Anterior</button>
                  <button onClick={() => setPaginaActualProd(p => Math.min(p + 1, totalPaginasProd))} disabled={paginaActualProd === totalPaginasProd} style={{ padding: '8px 12px', border: `1px solid ${colors.borderInputs}`, borderRadius: '6px', backgroundColor: colors.bgInputs, cursor: 'pointer', color: colors.textoGris }}>Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA CATEGORÍAS RESPONSIVA */}
        {tabActiva === 'categorias' && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: esMovil ? '1fr' : 'minmax(300px, 400px) 1fr', 
            gap: '25px', 
            alignItems: 'start' 
          }}>
            <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', padding: '30px', border: colors.borderCard, boxShadow: colors.shadow, position: esMovil ? 'static' : 'sticky', top: '100px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Nueva Categoría</h3>
              <p style={{ fontSize: '13px', color: colors.textoGris, marginBottom: '20px' }}>Organiza tu catálogo creando secciones específicas.</p>
              
              <form onSubmit={guardarCategoria}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Nombre de la categoría</label>
                  <input type="text" required placeholder="Ej: Electrónica, Accesorios..." value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}/>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: colors.colorAcento, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>Crear y Guardar</button>
              </form>
            </div>

            <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', padding: esMovil ? '20px' : '30px', border: colors.borderCard, boxShadow: colors.shadow }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Estructura del Catálogo</h3>
              <p style={{ fontSize: '13px', color: colors.textoGris, marginBottom: '25px' }}>Haz clic en una categoría para administrar los productos que contiene.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {categorias.map(c => {
                  const productosDeEstaCat = productos.filter(p => p.category_id === c.id);
                  const estaExpandida = categoriaExpandida === c.id;
                  const resultadosBusqueda = productos.filter(p => p.category_id !== c.id && !productosSeleccionados.includes(p.id) && p.title.toLowerCase().includes(busquedaProductoCat.toLowerCase())).slice(0, 7);

                  return (
                    <div key={c.id} style={{ border: `1px solid ${estaExpandida ? colors.colorAcento : colors.borderInputs}`, borderRadius: '10px', overflow: 'hidden' }}>
                      <div onClick={() => {setCategoriaExpandida(estaExpandida ? null : c.id); setProductosSeleccionados([]); setBusquedaProductoCat('');}} style={{ padding: '18px 20px', backgroundColor: estaExpandida ? (darkMode ? 'rgba(56, 189, 248, 0.05)' : '#f0f9ff') : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontWeight: '600', color: estaExpandida ? colors.colorAcento : colors.textoBlanco, fontSize: '15px' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: colors.textoGris, backgroundColor: colors.bgInputs, padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>{productosDeEstaCat.length} artículos</span>
                      </div>

                      {estaExpandida && (
                        <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${colors.borderInputs}` }}>
                          <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textoGris, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contenido Actual</h4>
                            {productosDeEstaCat.length === 0 ? (
                              <div style={{ padding: '15px', backgroundColor: colors.bgCards, borderRadius: '8px', border: `1px dashed ${colors.borderInputs}`, color: colors.textoGris, fontSize: '13px', textAlign: 'center' }}>Carpeta vacía.</div>
                            ) : (
                              <div style={{ border: `1px solid ${colors.borderInputs}`, borderRadius: '8px', overflow: 'hidden' }}>
                                {productosDeEstaCat.map((p, idx) => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: colors.bgCards, borderBottom: idx !== productosDeEstaCat.length - 1 ? `1px solid ${colors.borderInputs}` : 'none', fontSize: '13px' }}>
                                    <span style={{ marginRight: '10px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                    <button onClick={() => quitarProductoDeCategoria(p.id)} style={{ background: 'none', border: 'none', color: colors.colorRojo, cursor: 'pointer', fontSize: '12px', padding: '4px 8px', flexShrink: 0 }}>Quitar</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textoGris, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vincular Productos</h4>
                            {productosSeleccionados.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                                {productosSeleccionados.map(id => {
                                  const prod = productos.find(x => x.id === id);
                                  return (
                                    <div key={id} style={{ backgroundColor: colors.colorAcento, color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod?.title}</span>
                                      <span style={{ cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.2)', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} onClick={() => setProductosSeleccionados(productosSeleccionados.filter(x => x !== id))}>✕</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: '10px' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input type="text" placeholder="🔍 Buscar para añadir..." value={busquedaProductoCat} onChange={(e) => setBusquedaProductoCat(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgCards, color: colors.textoBlanco, outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
                                {busquedaProductoCat && (
                                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: colors.bgPrincipal, border: `1px solid ${colors.borderInputs}`, borderRadius: '8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                                    {resultadosBusqueda.length === 0 ? (
                                      <div style={{ padding: '15px', fontSize: '13px', color: colors.textoGris, textAlign: 'center' }}>Sin resultados...</div>
                                    ) : (
                                      resultadosBusqueda.map(p => (
                                        <div key={p.id} onClick={() => {setProductosSeleccionados([...productosSeleccionados, p.id]); setBusquedaProductoCat('');}} style={{ padding: '12px 15px', cursor: 'pointer', fontSize: '13px', borderBottom: `1px solid ${colors.borderInputs}` }}>
                                          <span style={{ color: colors.colorAcento, marginRight: '8px' }}>+</span> {p.title}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => agregarProductosMultiples(c.id)} disabled={productosSeleccionados.length === 0} style={{ padding: '12px 20px', backgroundColor: productosSeleccionados.length > 0 ? '#10b981' : colors.borderInputs, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: productosSeleccionados.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px' }}>Guardar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA NUEVO PRODUCTO RESPONSIVA */}
        {tabActiva === 'nuevo-producto' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', padding: esMovil ? '25px 20px' : '40px', border: colors.borderCard, boxShadow: colors.shadow, width: '100%', maxWidth: '800px' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>Publicar un Artículo</h3>
                <p style={{ fontSize: '14px', color: colors.textoGris, margin: 0 }}>Completa la ficha técnica para que el producto aparezca en la tienda.</p>
              </div>

              <form onSubmit={guardarProducto}>
                <div style={{ marginBottom: '25px', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '12px', border: `1px solid ${colors.borderInputs}` }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: colors.colorAcento, textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Información Principal</h4>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Título / Nombre del producto *</label>
                    <input type="text" required value={formProducto.title} onChange={e => setFormProducto({...formProducto, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Descripción comercial</label>
                    <textarea rows="4" value={formProducto.description} onChange={e => setFormProducto({...formProducto, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontSize: '14px', fontFamily: 'inherit' }}></textarea>
                  </div>
                </div>

                <div style={{ marginBottom: '25px', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '12px', border: `1px solid ${colors.borderInputs}` }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: colors.colorAcento, textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Inventario y Costos</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Precio de Venta (Gs.) *</label>
                      <input type="number" required value={formProducto.price} onChange={e => setFormProducto({...formProducto, price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Unidades Disponibles *</label>
                      <input type="number" required value={formProducto.stock} onChange={e => setFormProducto({...formProducto, stock: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div style={{ marginTop: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: colors.textoGris, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={formProducto.has_physical_stock} 
                          // Ojo: en el modal de edición usá productoEditando.has_physical_stock
                          onChange={e => setFormProducto({...formProducto, has_physical_stock: e.target.checked})} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>¿Este producto está en exhibición en el local físico?</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '35px', backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: '25px', borderRadius: '12px', border: `1px solid ${colors.borderInputs}` }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: colors.colorAcento, textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Visual y Clasificación</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Categoría Principal</label>
                      <select value={formProducto.category_id} onChange={e => setFormProducto({...formProducto, category_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="">-- Sin categoría asignada --</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Fotografía Principal *</label>
                      <input type="file" accept="image/*" required onChange={e => setFormProducto({...formProducto, image: e.target.files[0]})} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: `1px dashed ${colors.colorAcento}`, backgroundColor: 'rgba(56, 189, 248, 0.05)', color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '13px', cursor: 'pointer' }}/>
                    </div>
                  </div>
                </div>

                <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: colors.colorAcento, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Publicar en la Tienda</button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ================= MODAL FLOTANTE DE EDICIÓN RESPONSIVO ================= */}
      {productoEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: esMovil ? '10px' : '20px' }}>
          <div style={{ backgroundColor: colors.bgCards, width: '100%', maxWidth: '600px', borderRadius: '16px', border: colors.borderCard, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '20px 25px', borderBottom: `1px solid ${colors.borderInputs}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgInputs }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: colors.textoBlanco, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Editar: {productoEditando.title}</h2>
              <button onClick={() => setProductoEditando(null)} style={{ background: 'none', border: 'none', color: colors.textoGris, fontSize: '24px', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            {/* Cuerpo del Modal */}
            <div style={{ padding: esMovil ? '15px' : '25px', overflowY: 'auto', flex: 1 }}>
              <form id="editForm" onSubmit={guardarEdicionProducto}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris }}>Título</label>
                  <input type="text" required value={productoEditando.title} onChange={e => setProductoEditando({...productoEditando, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris }}>Precio (Gs.)</label>
                    <input type="number" required value={productoEditando.price} onChange={e => setProductoEditando({...productoEditando, price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris }}>Categoría</label>
                    <select value={productoEditando.category_id || ''} onChange={e => setProductoEditando({...productoEditando, category_id: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none' }}>
                      <option value="">-- Sin categoría --</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* --- NUEVO CHECKBOX DE EXHIBICIÓN FÍSICA --- */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: colors.textoGris, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={productoEditando.has_physical_stock ?? true} 
                      onChange={e => setProductoEditando({...productoEditando, has_physical_stock: e.target.checked})} 
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: colors.colorAcento }}
                    />
                    <span>¿Este producto está en exhibición en el local físico?</span>
                  </label>
                </div>
                {/* ------------------------------------------- */}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris }}>Descripción</label>
                  <textarea rows="3" value={productoEditando.description} onChange={e => setProductoEditando({...productoEditando, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none', resize: 'vertical' }}></textarea>
                </div>

                <div style={{ backgroundColor: colors.bgInputs, padding: '15px', borderRadius: '8px', border: `1px dashed ${colors.borderInputs}`, display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: '15px', alignItems: esMovil ? 'flex-start' : 'center' }}>
                  <img src={productoEditando.image_url} alt="Actual" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#fff', alignSelf: esMovil ? 'center' : 'auto' }} />
                  <div style={{ flex: 1, width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: colors.textoGris }}>Cambiar Foto (Opcional)</label>
                    <input type="file" accept="image/*" onChange={e => setProductoEditando({...productoEditando, nueva_imagen: e.target.files[0]})} style={{ fontSize: '12px', color: colors.textoGris, width: '100%' }}/>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer del Modal */}
            <div style={{ padding: '20px 25px', borderTop: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setProductoEditando(null)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: colors.textoBlanco, border: `1px solid ${colors.borderInputs}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button form="editForm" type="submit" style={{ padding: '10px 20px', backgroundColor: colors.colorAcento, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}