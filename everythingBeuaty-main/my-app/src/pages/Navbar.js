import React, { useState, useEffect, useRef } from 'react'
import {  FaHouseChimney } from "react-icons/fa6";
import { NavLink, useNavigate } from 'react-router-dom';
import '../index.css';
import { PiHairDryerFill } from "react-icons/pi";
import { MdDashboardCustomize } from "react-icons/md";
import { IoSettings } from "react-icons/io5";


const Navbar = () => {

  const styles={color: "orange"};
  const navigate=useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);

 
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        navRef.current &&
        !navRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isOpen])


  const handleLinkClick = () => {
    setIsOpen(false)
  }


  return (
    <section>
      <h1>
        EVERYTHING BEAUTY
     </h1>

     <div id="menu">
    <div
      ref={btnRef}
      className={`menu-btn ${isOpen ? "open" : ""}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <span></span>
      <span></span>
      <span></span>
    </div>

   
     <div ref={navRef} className={`navigation ${isOpen ? "show" : ""}`}>

      <ul>
        <li>
        <NavLink to="/" onClick={handleLinkClick} >
          
            <span className="icon"><FaHouseChimney /></span>
            <span className="text">Home</span>
        </NavLink>
         </li>
         
         <li>
        <NavLink to="/dashboard" onClick={handleLinkClick}>
            <span className="icon"><MdDashboardCustomize /></span>
            <span className="text">Dashboard</span>
        </NavLink>
        </li>
         
         <li>
        <NavLink to="/bookings" onClick={handleLinkClick}>
          
            <span className="icon"><PiHairDryerFill /></span>
            <span className="text">Featured Saloons</span>
        </NavLink>
        </li>
       
        <li>
        <NavLink to="/about" onClick={handleLinkClick}>
            <span className="icon"><IoSettings /></span>
            <span className="text">Settings</span>
        </NavLink>
        </li>
      </ul>
 
      </div>
      </div>
 
  </section>
  );
  }

export default Navbar;