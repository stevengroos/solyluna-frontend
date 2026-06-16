import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const colors = {
    bgPrincipal: darkMode ? '#0f172a' : '#f4f4f9',
    bgCards: darkMode ? '#1e293b' : '#ffffff',
    bgInputs: darkMode ? '#334155' : '#ffffff',
    borderInputs: darkMode ? '#475569' : '#cccccc',
    textoBlanco: darkMode ? '#f8fafc' : '#2c3e50',
    textoGris: darkMode ? '#94a3b8' : '#7f8c8d',
    colorAcento: darkMode ? '#38bdf8' : '#3498db',
    colorPrecio: darkMode ? '#34d399' : '#27ae60',
    colorRojo: darkMode ? '#ef4444' : '#e74c3c',
    borderCard: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    shadow: darkMode ? '0 10px 15px -3px rgba(0,0,0,0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)'
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};