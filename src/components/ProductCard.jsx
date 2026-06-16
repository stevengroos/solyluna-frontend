import React from 'react';

export default function ProductCard({ product, whatsappNumber }) {
  const handleWhatsAppClick = () => {
    const message = `Hola, estoy interesado en comprar el producto: *${product.title}* que cuesta $${product.price}. ¿Tienen disponibilidad?`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="product-card">
      <img src={`http://localhost:8000${product.image_url}`} alt={product.title} />
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <div className="price-stock">
        <span className="price">${product.price}</span>
        <span className="stock">Stock: {product.stock}</span>
      </div>
      
      {product.stock > 0 ? (
        <button onClick={handleWhatsAppClick} className="btn-whatsapp">
          Comprar por WhatsApp
        </button>
      ) : (
        <button disabled className="btn-soldout">Agotado</button>
      )}
    </div>
  );
}