import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]); 
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Buscador superior
  const [filtroTexto, setFiltroTexto] = useState('');
  
  // Filtros laterales
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  
  // --- NUEVO: Estado para ordenar por precio ---
  const [ordenPrecio, setOrdenPrecio] = useState(''); // '': por defecto, 'asc': menor a mayor, 'desc': mayor a menor

  // Paginación (12 productos por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 12; 

  const { darkMode, colors } = useContext(ThemeContext);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [resProd, resCat] = await Promise.all([
          axios.get(`${API_URL}/api/products`),
          axios.get(`${API_URL}/api/categories`)
        ]);
        setProducts(resProd.data);
        setCategorias(resCat.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar los datos del catálogo.');
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, []);

  // Volver a la página 1 al cambiar cualquier filtro u orden
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTexto, precioMin, precioMax, soloConStock, categoriaSeleccionada, ordenPrecio]);

  // 1. LÓGICA DE FILTRADO
  const productosFiltrados = products.filter((p) => {
    const texto = filtroTexto.toLowerCase();
    const coincideTexto = p.title.toLowerCase().includes(texto);
    const coincideMin = precioMin === '' || p.price >= parseFloat(precioMin);
    const coincideMax = precioMax === '' || p.price <= parseFloat(precioMax);
    const coincideStock = !soloConStock || p.stock > 0;
    const coincideCategoria = categoriaSeleccionada === '' || p.category_id === parseInt(categoriaSeleccionada);

    return coincideTexto && coincideMin && coincideMax && coincideStock && coincideCategoria;
  });

  // 2. LÓGICA DE ORDENAMIENTO (NUEVO)
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    if (ordenPrecio === 'asc') return a.price - b.price; // Menor a mayor
    if (ordenPrecio === 'desc') return b.price - a.price; // Mayor a menor
    return 0; // Orden por defecto (como viene de la BD)
  });

  // 3. LÓGICA DE PAGINACIÓN (Aplicada a los productos ya ordenados)
  const totalProductos = productosOrdenados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  
  const indiceUltimoProducto = paginaActual * productosPorPagina;
  const indicePrimerProducto = indiceUltimoProducto - productosPorPagina;
  const productosVisibles = productosOrdenados.slice(indicePrimerProducto, indiceUltimoProducto);

  const limpiarFiltrosLaterales = () => {
    setPrecioMin('');
    setPrecioMax('');
    setSoloConStock(false);
    setCategoriaSeleccionada(''); 
    setOrdenPrecio(''); // <-- Limpiamos el ordenamiento también
  };

  if (cargando) return <div style={{ padding: '50px', textAlign: 'center', color: colors.textoBlanco, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>Cargando catálogo...</div>;
  if (error) return <div style={{ padding: '50px', textAlign: 'center', color: colors.colorRojo, backgroundColor: colors.bgPrincipal, minHeight: '100vh' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrincipal, color: colors.textoBlanco, fontFamily: 'system-ui, sans-serif', transition: 'background-color 0.3s, color 0.3s' }}>
      
      <Header filtroTexto={filtroTexto} setFiltroTexto={setFiltroTexto} />

      <div style={{ display: 'flex', gap: '30px', padding: '30px 40px' }}>
        
        {/* Barra Lateral Adaptativa */}
        <aside style={{ 
          flex: '0 0 280px', 
          backgroundColor: colors.bgCards, 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: colors.shadow, 
          height: 'fit-content',
          position: 'sticky',
          top: '100px',
          border: colors.borderCard,
          transition: 'background-color 0.3s'
        }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, borderBottom: darkMode ? '1px solid #334155' : '1px solid #eee', paddingBottom: '10px', color: colors.textoBlanco }}>Filtrar por</h2>
          
          {/* CATEGORÍAS ESCALABLES (Dropdown) */}
          {categorias.length > 0 && (
            <div style={{ marginBottom: '20px', marginTop: '15px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', color: colors.textoGris }}>Categoría:</label>
              <select 
                value={categoriaSeleccionada}
                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ORDENAR POR PRECIO (NUEVO) */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', color: colors.textoGris }}>Ordenar precios:</label>
            <select 
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: colors.borderInputs, backgroundColor: colors.bgInputs, color: colors.textoBlanco, boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
            >
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

          <button onClick={limpiarFiltrosLaterales} style={{ width: '100%', padding: '12px', backgroundColor: colors.colorRojo, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Limpiar Filtros
          </button>
        </aside>

        {/* Bloque de Productos */}
        <main style={{ flex: 1 }}>
          <div style={{ marginBottom: '20px', fontSize: '15px', color: colors.textoGris, backgroundColor: colors.bgCards, padding: '10px 15px', borderRadius: '8px', border: colors.borderCard, display: 'inline-block' }}>
            <b>{totalProductos} producto(s) encontrado(s)</b>
          </div>

          {productosOrdenados.length === 0 ? (
            <div style={{ backgroundColor: colors.bgCards, padding: '60px', textAlign: 'center', borderRadius: '12px', border: colors.borderCard }}>
              <h3 style={{ color: colors.textoGris }}>No encontramos coincidencias</h3>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '25px' }}>
                {productosVisibles.map((p) => (
                  <div key={p.id} style={{ backgroundColor: colors.bgCards, borderRadius: '12px', overflow: 'hidden', boxShadow: colors.shadow, display: 'flex', flexDirection: 'column', border: colors.borderCard, transition: 'transform 0.2s' }}>
                    <div style={{ height: '220px', padding: '15px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={p.image_url} alt={p.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: colors.textoBlanco, lineHeight: '1.4', fontWeight: '600' }}>{p.title}</h3>
                      <p style={{ fontSize: '13px', color: colors.textoGris, margin: '0 0 15px 0', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                        {p.description}
                      </p>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.colorPrecio, marginBottom: '12px' }}>
                        Gs. {p.price.toLocaleString('es-PY')}
                      </div>
                      <div style={{ fontSize: '12px', color: p.stock > 0 ? (darkMode ? '#34d399' : '#155724') : (darkMode ? '#f87171' : '#721c24'), backgroundColor: p.stock > 0 ? (darkMode ? 'rgba(52, 211, 153, 0.1)' : '#d4edda') : (darkMode ? 'rgba(248, 113, 113, 0.1)' : '#f8d7da'), padding: '6px 12px', borderRadius: '20px', display: 'inline-block', width: 'fit-content', marginBottom: '15px' }}>
                        {p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}
                      </div>
                     <button 
  onClick={() => navigate(`/producto/${p.id}`)} // <-- CONECTADO AQUÍ
  disabled={p.stock === 0} style={{ width: '100%', padding: '12px', backgroundColor: p.stock > 0 ? colors.colorAcento : (darkMode ? '#475569' : '#bdc3c7'), color: p.stock > 0 ? (darkMode ? '#0f172a' : '#fff') : '#94a3b8', border: 'none', borderRadius: '8px', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' }}>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', padding: '20px 0' }}>
                  <button onClick={() => setPaginaActual(p => Math.max(p - 1, 1))} disabled={paginaActual === 1} style={{ padding: '10px 15px', border: '1px solid', borderColor: colors.borderInputs, borderRadius: '6px', backgroundColor: colors.bgCards, cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', color: colors.textoGris }}>«</button>
                  {Array.from({ length: totalPaginas }, (_, index) => {
                    const numeroPagina = index + 1;
                    const esActiva = numeroPagina === paginaActual;
                    return (
                      <button key={numeroPagina} onClick={() => setPaginaActual(numeroPagina)} style={{ padding: '10px 16px', border: '1px solid', borderColor: esActiva ? colors.colorAcento : colors.borderInputs, borderRadius: '6px', backgroundColor: esActiva ? colors.colorAcento : colors.bgCards, color: esActiva ? (darkMode ? '#0f172a' : '#fff') : colors.textoBlanco, fontWeight: 'bold', cursor: 'pointer' }}>
                        {numeroPagina}
                      </button>
                    );
                  })}
                  <button onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))} disabled={paginaActual === totalPaginas} style={{ padding: '10px 15px', border: '1px solid', borderColor: colors.borderInputs, borderRadius: '6px', backgroundColor: colors.bgCards, cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', color: colors.textoGris }}>»</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}