// Header.jsx - Perfectly Centered Top Logo (No Overlap)
import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <div className="header">
      <img 
        src="logo.png" 
        alt="WoCo Logo" 
        className="header-logo" 
        onClick={() => navigate("/")} 
      />
    </div>
  );
}

