import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

// Icons - keep your existing imports
import { BiLogOut, BiLogIn } from "react-icons/bi";
import { TbUsers, TbReportAnalytics } from "react-icons/tb";
import { LuFile } from "react-icons/lu";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { FiUser, FiHome, FiDollarSign, FiTrendingUp, FiSettings } from "react-icons/fi";
import { BsCurrencyRupee } from "react-icons/bs";
import { MdOutlineDashboard } from "react-icons/md";

import logo from "../../Assets/logo/newth_logo.png";
import "./Navbar.css";

const Navbar = ({
  children,
  onNavigation,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [toggle, setToggle] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /* Sync collapsed state */
  useEffect(() => {
    setToggle(isCollapsed);
  }, [isCollapsed]);

  const handleToggle = (state) => {
    setToggle(state);
    if (onToggleCollapse) onToggleCollapse(state);
  };

  // AUTO-COLLAPSE on route change
  useEffect(() => {
    // Collapse sidebar when route changes
    handleToggle(true);
  }, [location.pathname]); // This runs whenever the pathname changes

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogin = () => navigate("/login");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Financial Dashboard";
      case "/members":
        return "Members Management";
      case "/fixrates":
        return "Fixed Rates Management";
      case "/maintenance":
        return "Maintenance Management";
      case "/expense":
        return "Expense Management";
      default:
        return "";
    }
  };

  const menuData = [
    { icon: <MdOutlineDashboard />, title: "Dashboard", path: "/" },  
    { icon: <FiDollarSign />, title: "Maintenance", path: "/maintenance" },
    { icon: <TbUsers />, title: "Members", path: "/members" },
    { icon: <FiTrendingUp />, title: "Expense", path: "/expense" },  
    { icon: <BsCurrencyRupee />, title: "Fixed Rates", path: "/fixrates" },
    // { icon: <FiSettings />, title: "Settings", path: "/settings" }, 
  ];

  // Handle menu item click
  const handleMenuItemClick = (path, e) => {
    // Collapse sidebar first
    handleToggle(true);
    
    // Then navigate if onNavigation prop exists
    if (onNavigation) {
      e.preventDefault();
      onNavigation(path);
    }
  };

  return (
    <>
      {/* SIDEBAR */}
      <div id="sidebar" className={toggle ? "hide" : ""}>
        <div className="logo">
          <div className="logoBox">
            {toggle ? (
              <GiHamburgerMenu
                className="menuIconHidden"
                onClick={() => handleToggle(false)}
              />
            ) : (
              <>
                <img src={logo} alt="Logo" className="sidebar-logo" />
                <RxCross1
                  className="menuIconHidden"
                  onClick={() => handleToggle(true)}
                />
              </>
            )}
          </div>
        </div>

        <ul className="side-menu top">
          {menuData.map(({ icon, title, path }, i) => (
            <li key={i}>
              <NavLink
                to={path}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={(e) => handleMenuItemClick(path, e)}
              >
                <span className="menu-icon">{icon}</span>
                <span className="menu-title">{title}</span>
              </NavLink>
            </li>
          ))}

          {isLoggedIn && (
            <li className="logout-menu-item">
              <button className="sidebar-logout-btn" onClick={handleLogout}>
                <BiLogOut />
                <span>Logout</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* CONTENT */}
      <div id="content">
        <nav>
          <div className="nav-main">
            <GiHamburgerMenu
              className="menuIcon"
              onClick={() => handleToggle(!toggle)}
            />

            {getPageTitle() && (
              <div className="page-title">{getPageTitle()}</div>
            )}
          </div>

          <div>
            {!isLoggedIn ? (
              <button className="icon-button" onClick={handleLogin}>
                <BiLogIn />
              </button>
            ) : (
              <div className="profile">
                <div className="profile-icon">
                  <FiUser />
                </div>
                <button className="icon-button" onClick={handleLogout}>
                  <BiLogOut />
                </button>
              </div>
            )}
          </div>
        </nav>

        {children}
      </div>
    </>
  );
};

export default Navbar;