import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

export default function AdminPanel() {
  const { colors, darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  // --- CACHÉ: Inicializar estado desde la memoria ---
  const [productos, setProductos] = useState(() => {
    const cached = sessionStorage.getItem('solyluna_productos');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [categorias, setCategorias] = useState(() => {
    const cached = sessionStorage.getItem('solyluna_categorias');
    return cached ? JSON.parse(cached) : [];
  });

  const [tabActiva, setTabActiva] = useState('productos');
  
  // No mostramos pantalla de carga si ya hay caché
  const [cargando, setCargando] = useState(() => {
    return !sessionStorage.getItem('solyluna_productos');
  });
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estados Categorías
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [categoriaExpandida, setCategoriaExpandida] = useState(null);
  const [busquedaProductoCat, setBusquedaProductoCat] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

// Estado Formulario Nuevo Producto
  const [formProducto, setFormProducto] = useState({
    title: '', description: '', price: '', stock: '', image: null, category_id: '', has_physical_stock: true, gallery_images: [] // <-- NUEVO CAMPO PARA GALERÍA
  });

  // Modal de Edición
  const [productoEditando, setProductoEditando] = useState(null);

  // Estados Tabla Productos
  const [filtroTablaProductos, setFiltroTablaProductos] = useState('');
  const [paginaActualProd, setPaginaActualProd] = useState(1);
  const [stockBorrador, setStockBorrador] = useState({}); 
  const [nuevaVariante, setNuevaVariante] = useState({ color_name: '', stock: 0, image: null });

  const productosPorPagina = 20;
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);

  useEffect(() => {
    const manejarResize = () => setEsMovil(window.innerWidth < 768);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  // --- SEGURIDAD: VERIFICACIÓN DEL TOKEN ---
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/login');
      return;
    }

    // Leemos la fecha de expiración del JWT internamente
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      // Si la fecha actual supera a la expiración (en milisegundos)
      if (decodedPayload.exp * 1000 < Date.now()) {
        cerrarSesion();
        return;
      }
    } catch (e) {
      // Si el token tiene formato inválido
    }

    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const cargarDatos = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      
      setProductos(resProd.data);
      setCategorias(resCat.data);
      
      // Actualizamos el caché
      sessionStorage.setItem('solyluna_productos', JSON.stringify(resProd.data));
      sessionStorage.setItem('solyluna_categorias', JSON.stringify(resCat.data));
      
    } catch (err) {
      console.error(err);
      if (productos.length === 0) mostrarMensaje('Error al conectar con el servidor.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 5000);
  };

  // --- MANEJADOR GLOBAL DE ERRORES API (Anti-Tokens Vencidos) ---
  const manejarErrorApi = (err, mensajeDefecto) => {
    if (err.response?.status === 401) {
      mostrarMensaje('Sesión expirada. Redirigiendo...', 'error');
      setTimeout(() => cerrarSesion(), 2000);
    } else {
      mostrarMensaje(err.response?.data?.detail || mensajeDefecto, 'error');
    }
  };

  // --- DETECTOR DE PESO DE IMÁGENES ---
  const verificarPesoImagen = (file) => {
    if (file && file.size > 500 * 1024) {
      mostrarMensaje('⚠️ La imagen pesa más de 500KB. Te sugerimos comprimirla (ej. en TinyPNG) para que la tienda cargue más rápido.', 'error');
    }
    return file;
  };

  // --- LOGICA STOCK ---
  const manejarCambioStockBorrador = (id, nuevoValor) => {
    if (nuevoValor < 0) return;
    setStockBorrador(prev => ({ ...prev, [id]: parseInt(nuevoValor) }));
  };


  // --- NUEVA FUNCIÓN: Eliminar Producto ---
  const manejarEliminarProducto = async (id, titulo) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${titulo}"?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Producto eliminado correctamente', tipo: 'exito' });
      // Actualizar vista y actualizar caché
      const copia = productos.filter(p => p.id !== id);
      setProductos(copia);
      sessionStorage.setItem('solyluna_productos', JSON.stringify(copia));
    } catch (err) {
      console.error(err);
      setMensaje({ texto: 'Error al intentar eliminar el producto', tipo: 'error' });
    }
  };

  // --- NUEVA FUNCIÓN: Editar Categoría ---
  const manejarEditarCategoria = async (id, nombreActual) => {
    const nuevoNombre = window.prompt("Modificar nombre de la categoría:", nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre.trim() === nombreActual) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API_URL}/api/categories/${id}`, { name: nuevoNombre.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Categoría actualizada correctamente', tipo: 'exito' });
      
      // Actualizar interfaz y caché
      const copia = categorias.map(c => c.id === id ? { ...c, name: nuevoNombre.trim() } : c);
      setCategorias(copia);
      sessionStorage.setItem('solyluna_categorias', JSON.stringify(copia));
    } catch (err) {
      console.error(err);
      setMensaje({ texto: err.response?.data?.detail || 'Error al renombrar categoría', tipo: 'error' });
    }
  };

  // --- NUEVA FUNCIÓN: Eliminar Categoría ---
  const manejarEliminarCategoria = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${nombre}"?\nLos productos de esta categoría NO se borrarán, pero se quedarán sin categoría asignada.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Categoría eliminada correctamente', tipo: 'exito' });
      
      // Actualizar interfaz (Categorías)
      const copiaCat = categorias.filter(c => c.id !== id);
      setCategorias(copiaCat);
      sessionStorage.setItem('solyluna_categorias', JSON.stringify(copiaCat));

      // Actualizar interfaz (Productos afectados pasan a tener category_id = null)
      const copiaProd = productos.map(p => p.category_id === id ? { ...p, category_id: null } : p);
      setProductos(copiaProd);
      sessionStorage.setItem('solyluna_productos', JSON.stringify(copiaProd));
    } catch (err) {
      console.error(err);
      setMensaje({ texto: 'Error al eliminar la categoría', tipo: 'error' });
    }
  };

  const confirmarStockBD = async (id) => {
    const nuevoStock = stockBorrador[id];
    if (nuevoStock === undefined) return;
    const token = localStorage.getItem('adminToken');
    try {
      setCargando(true);
      await axios.put(`${API_URL}/api/products/${id}/stock`, 
        { stock: nuevoStock },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductos(productos.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));
      const nuevoBorrador = { ...stockBorrador };
      delete nuevoBorrador[id];
      setStockBorrador(nuevoBorrador);
      mostrarMensaje('Inventario actualizado.', 'success');
      cargarDatos(); // Refrescar caché
    } catch (err) {
      manejarErrorApi(err, 'Error al actualizar stock.');
    } finally {
      setCargando(false);
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
      setCargando(true);
      const response = await axios.post(`${API_URL}/api/categories`, 
        { name: nuevaCategoria },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategorias([...categorias, response.data]);
      setNuevaCategoria('');
      mostrarMensaje('Categoría creada 🎉', 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al crear categoría.');
    } finally {
      setCargando(false);
    }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.image) {
      mostrarMensaje('Por favor, selecciona una foto principal para el producto.', 'error');
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
      // 1. Crear el producto principal primero
      const res = await axios.post(`${API_URL}/api/products`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      const nuevoProductoId = res.data.id;

      // 2. Si hay fotos en la galería, subirlas una por una al nuevo producto
      if (formProducto.gallery_images && formProducto.gallery_images.length > 0) {
        for (let img of formProducto.gallery_images) {
          const galleryFormData = new FormData();
          galleryFormData.append('image', img);
          await axios.post(`${API_URL}/api/products/${nuevoProductoId}/gallery`, galleryFormData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      mostrarMensaje('¡Producto y fotos publicados exitosamente!', 'success');
      setFormProducto({ title: '', description: '', price: '', stock: '', image: null, category_id: '', has_physical_stock: true, gallery_images: [] });
      cargarDatos(); 
      setTabActiva('productos'); 
    } catch (err) {
      manejarErrorApi(err, 'Error al registrar producto o sus fotos.');
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
      manejarErrorApi(err, 'Error al editar producto.');
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA DE GALERÍA (EDICIÓN) ---
  const subirFotoGaleria = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    verificarPesoImagen(file);

    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('image', file);

    try {
      setCargando(true);
      const res = await axios.post(`${API_URL}/api/products/${productoEditando.id}/gallery`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      const productoActualizado = { ...productoEditando, gallery: [...(productoEditando.gallery || []), res.data] };
      setProductoEditando(productoActualizado);
      mostrarMensaje('Foto agregada a la galería', 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al subir foto a la galería.');
    } finally {
      setCargando(false);
    }
  };

  const eliminarFotoGaleria = async (idImagen) => {
    if(!window.confirm("¿Eliminar esta foto de la galería?")) return;
    const token = localStorage.getItem('adminToken');
    try {
      setCargando(true);
      await axios.delete(`${API_URL}/api/products/gallery/${idImagen}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const productoActualizado = { 
        ...productoEditando, 
        gallery: productoEditando.gallery.filter(g => g.id !== idImagen) 
      };
      setProductoEditando(productoActualizado);
      mostrarMensaje('Foto eliminada', 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al eliminar foto.');
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA DE VARIANTES (COLORES) ---
  const guardarVariante = async (e) => {
    e.preventDefault();
    if (!nuevaVariante.color_name) return;
    
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('color_name', nuevaVariante.color_name);
    formData.append('stock', nuevaVariante.stock);
    if (nuevaVariante.image) {
      formData.append('image', nuevaVariante.image);
    }

    try {
      setCargando(true);
      const res = await axios.post(`${API_URL}/api/products/${productoEditando.id}/variants`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      const productoActualizado = { ...productoEditando, variants: [...(productoEditando.variants || []), res.data] };
      setProductoEditando(productoActualizado);
      
      setNuevaVariante({ color_name: '', stock: 0, image: null });
      mostrarMensaje('Color agregado con éxito', 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al guardar el color.');
    } finally {
      setCargando(false);
    }
  };

  const eliminarVariante = async (idVariante) => {
    const token = localStorage.getItem('adminToken');
    try {
      setCargando(true);
      await axios.delete(`${API_URL}/api/products/variants/${idVariante}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const productoActualizado = { 
        ...productoEditando, 
        variants: productoEditando.variants.filter(v => v.id !== idVariante) 
      };
      setProductoEditando(productoActualizado);
      mostrarMensaje('Color eliminado', 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al eliminar color.');
    } finally {
      setCargando(false);
    }
  };

  // --- LOGICA CATEGORIAS MÚLTIPLES ---
  const agregarProductosMultiples = async (categoriaId) => {
    if (productosSeleccionados.length === 0) return;
    const token = localStorage.getItem('adminToken');
    try {
      setCargando(true);
      await Promise.all(productosSeleccionados.map(prodId => axios.put(`${API_URL}/api/products/${prodId}/category`, { category_id: categoriaId }, { headers: { Authorization: `Bearer ${token}` } })));
      setProductos(productos.map(p => productosSeleccionados.includes(p.id) ? { ...p, category_id: categoriaId } : p));
      setProductosSeleccionados([]); setBusquedaProductoCat('');
      mostrarMensaje(`Asignado con éxito`, 'success');
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al asignar productos.');
    } finally {
      setCargando(false);
    }
  };

  const quitarProductoDeCategoria = async (productoId) => {
    const token = localStorage.getItem('adminToken');
    try {
      setCargando(true);
      await axios.put(`${API_URL}/api/products/${productoId}/category`, { category_id: null }, { headers: { Authorization: `Bearer ${token}` } });
      setProductos(productos.map(p => p.id === parseInt(productoId) ? { ...p, category_id: null } : p));
      cargarDatos();
    } catch (err) {
      manejarErrorApi(err, 'Error al desvincular producto.');
    } finally {
      setCargando(false);
    }
  };

  const productosTablaFiltrados = productos.filter(p => p.title.toLowerCase().includes(filtroTablaProductos.toLowerCase()));
  const totalPaginasProd = Math.ceil(productosTablaFiltrados.length / productosPorPagina);
  const idxUltimoProd = paginaActualProd * productosPorPagina;
  const idxPrimerProd = idxUltimoProd - productosPorPagina;
  const productosTablaVisibles = productosTablaFiltrados.slice(idxPrimerProd, idxUltimoProd);

  useEffect(() => { setPaginaActualProd(1); }, [filtroTablaProductos]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* --- ESTILOS DEL LOADER PREMIUM --- */}
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

      {/* --- CAPA DE CARGA GLOBAL --- */}
      {cargando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="spinner-elegante"></div>
          <p style={{ marginTop: '20px', color: '#fff', fontSize: '15px', fontWeight: '500', letterSpacing: '1px' }}>Sincronizando con el servidor...</p>
        </div>
      )}

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

        {/* Menú de pestañas */}
        <div style={{ 
          display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: `1px solid ${colors.borderInputs}`, paddingBottom: '15px',
          overflowX: esMovil ? 'auto' : 'visible', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch'
        }}>
          <button onClick={() => setTabActiva('productos')} style={{ flexShrink: 0, background: tabActiva === 'productos' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'productos' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'productos' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Inventario ({productos.length})</button>
          <button onClick={() => setTabActiva('categorias')} style={{ flexShrink: 0, background: tabActiva === 'categorias' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'categorias' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'categorias' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Categorías ({categorias.length})</button>
          <button onClick={() => setTabActiva('nuevo-producto')} style={{ flexShrink: 0, background: tabActiva === 'nuevo-producto' ? colors.colorAcento : colors.bgCards, color: tabActiva === 'nuevo-producto' ? '#fff' : colors.textoGris, border: `1px solid ${tabActiva === 'nuevo-producto' ? colors.colorAcento : colors.borderInputs}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Publicar Producto</button>
        </div>

        {/* PESTAÑA PRODUCTOS */}
        {tabActiva === 'productos' && (
          <div style={{ backgroundColor: colors.bgCards, borderRadius: '16px', border: colors.borderCard, padding: esMovil ? '20px' : '30px', boxShadow: colors.shadow }}>
            <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: esMovil ? '15px' : '0px', justifyContent: 'space-between', alignItems: esMovil ? 'flex-start' : 'center', marginBottom: '20px' }}>
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

                          <button 
                            onClick={() => manejarEliminarProducto(p.id, p.title)} 
                            style={{ padding: '6px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                          >
                            Eliminar
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
          <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : 'minmax(300px, 400px) 1fr', gap: '25px', alignItems: 'start' }}>
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
                        
                        {/* --- CONTENEDOR DE ACCIONES CORREGIDO (Usa 'c' en vez de 'cat') --- */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); manejarEditarCategoria(c.id, c.name); }}
                            style={{ padding: '4px 8px', backgroundColor: 'transparent', color: colors.textoGris, border: 'none', cursor: 'pointer', fontSize: '12px' }}
                            title="Renombrar Categoría"
                          >
                            ✏️
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); manejarEliminarCategoria(c.id, c.name); }}
                            style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                            title="Eliminar Categoría"
                          >
                            🗑️
                          </button>

                          <span style={{ fontSize: '12px', color: colors.textoGris, backgroundColor: colors.bgInputs, padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>{productosDeEstaCat.length} artículos</span>
                        </div>
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
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Fotografía Principal (Portada) *</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        required 
                        onChange={e => {
                          const file = verificarPesoImagen(e.target.files[0]);
                          setFormProducto({...formProducto, image: file});
                        }} 
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: `1px dashed ${colors.colorAcento}`, backgroundColor: 'rgba(56, 189, 248, 0.05)', color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '13px', cursor: 'pointer', marginBottom: '15px' }}
                      />
                      
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris, fontWeight: '500' }}>Fotos Adicionales (Galería) - Opcional</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple // <-- ESTO PERMITE SELECCIONAR VARIAS
                        onChange={e => {
                          // Convertir el FileList a un Array real
                          const archivos = Array.from(e.target.files);
                          archivos.forEach(verificarPesoImagen); // Verificamos peso de todas
                          setFormProducto({...formProducto, gallery_images: archivos});
                        }} 
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
                      />
                      {formProducto.gallery_images.length > 0 && (
                        <p style={{ fontSize: '11px', color: '#10b981', marginTop: '5px' }}>✓ {formProducto.gallery_images.length} foto(s) extra seleccionada(s)</p>
                      )}
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
            
            <div style={{ padding: '20px 25px', borderBottom: `1px solid ${colors.borderInputs}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgInputs }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: colors.textoBlanco, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Editar: {productoEditando.title}</h2>
              <button onClick={() => setProductoEditando(null)} style={{ background: 'none', border: 'none', color: colors.textoGris, fontSize: '24px', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

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

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.textoGris }}>Descripción</label>
                  <textarea rows="3" value={productoEditando.description} onChange={e => setProductoEditando({...productoEditando, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgInputs, color: colors.textoBlanco, outline: 'none', resize: 'vertical' }}></textarea>
                </div>

                <div style={{ backgroundColor: colors.bgInputs, padding: '15px', borderRadius: '8px', border: `1px dashed ${colors.borderInputs}`, display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: '15px', alignItems: esMovil ? 'flex-start' : 'center' }}>
                  <img src={productoEditando.image_url} alt="Actual" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'contain', backgroundColor: '#fff', alignSelf: esMovil ? 'center' : 'auto' }} />
                  <div style={{ flex: 1, width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: colors.textoGris }}>Cambiar Foto (Opcional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => {
                        const file = verificarPesoImagen(e.target.files[0]);
                        setProductoEditando({...productoEditando, nueva_imagen: file});
                      }} 
                      style={{ fontSize: '12px', color: colors.textoGris, width: '100%' }}
                    />
                  </div>
                </div>
              </form>
              {/* ================= GESTIÓN DE GALERÍA (FOTOS EXTRA) ================= */}
              <div style={{ marginTop: '30px', borderTop: `1px solid ${colors.borderInputs}`, paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '15px', color: colors.colorAcento, margin: 0 }}>Galería de Fotos Adicionales</h3>
                  
                  {/* Botón camuflado para subir nueva foto rápida */}
                  <label style={{ backgroundColor: colors.bgInputs, border: `1px solid ${colors.borderInputs}`, color: colors.textoBlanco, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Subir Foto
                    <input type="file" accept="image/*" onChange={subirFotoGaleria} style={{ display: 'none' }} />
                  </label>
                </div>

                {productoEditando.gallery && productoEditando.gallery.length > 0 ? (
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {productoEditando.gallery.map(img => (
                      <div key={img.id} style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={img.image_url} alt="Galeria" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#fff', border: `1px solid ${colors.borderInputs}` }} />
                        <button onClick={() => eliminarFotoGaleria(img.id)} style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: colors.colorRojo, color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: colors.textoGris, margin: 0, fontStyle: 'italic' }}>No hay fotos adicionales en la galería.</p>
                )}
              </div>
              {/* ================= GESTIÓN DE COLORES / VARIANTES ================= */}
              <div style={{ marginTop: '30px', borderTop: `1px solid ${colors.borderInputs}`, paddingTop: '20px' }}>
                <h3 style={{ fontSize: '15px', color: colors.colorAcento, marginBottom: '15px' }}>Opciones de Colores / Variantes</h3>
                
                {productoEditando.variants && productoEditando.variants.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                    {productoEditando.variants.map(v => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgPrincipal, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${colors.borderInputs}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {v.image_url ? (
                            <img src={v.image_url} alt={v.color_name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#fff' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: colors.bgInputs, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: colors.textoGris }}>Sin foto</div>
                          )}
                          <div>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: colors.textoBlanco }}>{v.color_name}</span>
                            <span style={{ fontSize: '12px', color: v.stock > 0 ? '#10b981' : '#f87171' }}>Stock: {v.stock}</span>
                          </div>
                        </div>
                        <button onClick={() => eliminarVariante(v.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: colors.textoGris, marginBottom: '20px', fontStyle: 'italic' }}>Este producto es simple (no tiene colores adicionales configurados).</p>
                )}

                <form onSubmit={guardarVariante} style={{ backgroundColor: colors.bgInputs, padding: '15px', borderRadius: '8px', border: `1px dashed ${colors.borderInputs}` }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textoBlanco }}>+ Agregar un nuevo color</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: esMovil ? '1fr' : '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" placeholder="Nombre del color (Ej: Negro/Rojo)" required value={nuevaVariante.color_name} onChange={e => setNuevaVariante({...nuevaVariante, color_name: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, outline: 'none', fontSize: '13px' }} />
                    <input type="number" placeholder="Stock" required min="0" value={nuevaVariante.stock} onChange={e => setNuevaVariante({...nuevaVariante, stock: parseInt(e.target.value)})} style={{ padding: '10px', borderRadius: '6px', border: `1px solid ${colors.borderInputs}`, backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, outline: 'none', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: esMovil ? 'column' : 'row', gap: '10px', alignItems: esMovil ? 'stretch' : 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: colors.textoGris, display: 'block', marginBottom: '4px' }}>Foto exclusiva para este color (Opcional):</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => {
                          const file = verificarPesoImagen(e.target.files[0]);
                          setNuevaVariante({...nuevaVariante, image: file});
                        }} 
                        style={{ fontSize: '12px', color: colors.textoGris, width: '100%' }} 
                      />
                    </div>
                    <button type="submit" style={{ backgroundColor: colors.colorAcento, color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Añadir Color</button>
                  </div>
                </form>
              </div>
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