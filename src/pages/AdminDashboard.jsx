import React, { useState } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    // Para enviar archivos, obligatoriamente usamos FormDatass
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('image', image); // Aquí va el archivo físico

    try {
      // Importante: No ponemos el header 'Content-Type' manualmente, 
      // Axios y el navegador lo configuran automáticamente con el "boundary" correcto.
      const response = await axios.post('http://localhost:8000/api/products', formData);
      
      setMensaje('¡Producto creado con éxito!');
      // Limpiamos el formulario
      setTitle('');
      setDescription('');
      setPrice('');
      setStock('');
      setImage(null);
      e.target.reset(); // Limpia el input de tipo archivo
      
    } catch (error) {
      console.error(error);
      setMensaje('Error al crear el producto. Revisa la consola.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Panel de Administración</h2>
      <p>Sube un nuevo producto al catálogo</p>

      {mensaje && <div style={{ padding: '10px', backgroundColor: '#e2e3e5', marginBottom: '15px' }}>{mensaje}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label>Título del Producto:</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>

        <div>
          <label>Descripción:</label>
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '8px', minHeight: '80px' }} />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label>Precio ($):</label>
            <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Stock disponible:</label>
            <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>

        <div>
          <label>Imagen del Producto:</label>
          <input type="file" accept="image/*" required onChange={(e) => setImage(e.target.files[0])} style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" disabled={cargando} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: cargando ? 'not-allowed' : 'pointer' }}>
          {cargando ? 'Subiendo a Supabase...' : 'Guardar Producto'}
        </button>
      </form>
    </div>
  );
}