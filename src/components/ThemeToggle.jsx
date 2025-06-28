// ThemeToggle.jsx - Light/Dark Mode Toggle (Enhanced)
import React, { useEffect, useState } from "react";
import "./styles.css";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="theme-toggle">
      <label className="toggle-label">
        <input type="checkbox" checked={darkMode} onChange={toggleTheme} />
        <span className="slider"></span>
        {darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </label>
    </div>
  );
}
