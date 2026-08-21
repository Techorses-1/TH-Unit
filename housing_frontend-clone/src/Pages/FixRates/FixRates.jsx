import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  FaCogs,
  FaWater,
  FaRupeeSign,
  FaHome,
  FaBuilding,
  FaSave,
  FaEdit,
  FaTrash,
  FaInfoCircle,
  FaCheckCircle,
  FaHistory,
  FaExclamationTriangle,
    FaShoppingBag,  // For Shop icon
  FaTimesCircle
} from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./FixRates.scss";

const FixRates = () => {
  const [maintenance, setMaintenance] = useState(null);
  const [water, setWater] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [ownerRate, setOwnerRate] = useState("");
  const [rentRate, setRentRate] = useState("");
  const [unitRate, setUnitRate] = useState("");

  const [shopRate, setShopRate] = useState("");
  const [closeRate, setCloseRate] = useState("");

  /* ================= FETCH RATES ================= */
  const fetchRates = async () => {
    try {
      setIsLoading(true);
      const [maintenanceRes, waterRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/maintenance-rate/get`),
        fetch(`${import.meta.env.VITE_API_URL}/water-rate/get`)
      ]);

      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : null;
      const waterData = waterRes.ok ? await waterRes.json() : null;

      setMaintenance(maintenanceData);
      setWater(waterData);

      // Set initial values if data exists
      if (maintenanceData) {
        setOwnerRate(maintenanceData.ownerRate || "");
        setRentRate(maintenanceData.rentRate || "");
        setShopRate(maintenanceData.shopRate || "");  // ADD THIS
        setCloseRate(maintenanceData.closeRate || "");  // ADD THIS
      }
      if (waterData) {
        setUnitRate(waterData.unitRate || "");
      }
    } catch (error) {
      toast.error("Failed to fetch rates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  /* ================= MAINTENANCE RATE FUNCTIONS ================= */
  const handleMaintenanceSubmit = async () => {
    // Validate all fields are filled
    if (!ownerRate || !rentRate || !shopRate || !closeRate) {
      toast.error("Please fill in all maintenance rate fields");
      return;
    }

    const url = maintenance
      ? `${import.meta.env.VITE_API_URL}/maintenance-rate/update/${maintenance._id}`
      : `${import.meta.env.VITE_API_URL}/maintenance-rate/create`;

    const method = maintenance ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerRate: parseFloat(ownerRate),
          rentRate: parseFloat(rentRate),
          shopRate: parseFloat(shopRate),  // ADD THIS
          closeRate: parseFloat(closeRate)  // ADD THIS
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save maintenance rate");
      }

      toast.success(maintenance ? "Maintenance rate updated!" : "Maintenance rate added!");
      fetchRates();
    } catch (error) {
      toast.error(error.message || "Failed to save maintenance rate");
    }
  };

  const handleDeleteMaintenance = async () => {
    if (!window.confirm("Are you sure you want to delete the maintenance rate?")) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/maintenance-rate/delete/${maintenance._id}`,
        { method: "DELETE" }
      );
      setMaintenance(null);
      setOwnerRate("");
      setRentRate("");
      toast.success("Maintenance rate deleted!");
    } catch {
      toast.error("Failed to delete maintenance rate");
    }
  };

  /* ================= WATER RATE FUNCTIONS ================= */
  const handleWaterSubmit = async () => {
    if (!unitRate) {
      toast.error("Please enter water unit rate");
      return;
    }

    const url = water
      ? `${import.meta.env.VITE_API_URL}/water-rate/update/${water._id}`
      : `${import.meta.env.VITE_API_URL}/water-rate/create`;

    const method = water ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitRate: parseFloat(unitRate) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save water rate");
      }

      toast.success(water ? "Water rate updated!" : "Water rate added!");
      fetchRates();
    } catch (error) {
      toast.error(error.message || "Failed to save water rate");
    }
  };

  const handleDeleteWater = async () => {
    if (!window.confirm("Are you sure you want to delete the water rate?")) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/water-rate/delete/${water._id}`,
        { method: "DELETE" }
      );
      setWater(null);
      setUnitRate("");
      toast.success("Water rate deleted!");
    } catch {
      toast.error("Failed to delete water rate");
    }
  };

  /* ================= RENDER LOADING ================= */
  if (isLoading) {
    return (
      <Navbar>
        <div className="fixrates-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading rates...</p>
          </div>
        </div>
      </Navbar>
    );
  }

  return (
    <Navbar>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="fixrates-container">

        {/* PAGE HEADER */}
        <div className="fixrates-header">
          <h1>
            <FaCogs /> Fixed Rates Management
          </h1>
          <p className="subtitle">
            Set and manage maintenance and water rates for your society
          </p>
        </div>

        <div className="rates-container">
          {/* MAINTENANCE RATES CARD - FIRST/TOP */}
          <div className="rate-card">
            <div className="card-header">
              <h2 className="card-title">
                <FaBuilding /> Maintenance Rates
              </h2>
              {maintenance && (
                <span className="status-badge active">
                  <FaCheckCircle /> Active
                </span>
              )}
            </div>

            <div className="rate-inputs">
              {/* Owner Rate Input */}
              <div className="input-group">
                <label>
                  <FaHome /> Owner Rate <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <FaRupeeSign className="input-icon" />
                  <input
                    type="number"
                    placeholder="Enter rate for owners"
                    value={ownerRate}
                    onChange={e => setOwnerRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="input-suffix">₹/month</span>
                </div>
                {maintenance?.ownerRate && (
                  <div className="current-value">
                    <FaHistory /> Current: ₹{maintenance.ownerRate}
                  </div>
                )}
              </div>

              {/* Rent Rate Input */}
              <div className="input-group">
                <label>
                  <FaBuilding /> Rent Rate <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <FaRupeeSign className="input-icon" />
                  <input
                    type="number"
                    placeholder="Enter rate for tenants"
                    value={rentRate}
                    onChange={e => setRentRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="input-suffix">₹/month</span>
                </div>
                {maintenance?.rentRate && (
                  <div className="current-value">
                    <FaHistory /> Current: ₹{maintenance.rentRate}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label>
                  <FaBuilding /> Shop Rate <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <FaRupeeSign className="input-icon" />
                  <input
                    type="number"
                    placeholder="Enter rate for shops"
                    value={shopRate}
                    onChange={e => setShopRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="input-suffix">₹/month</span>
                </div>
                {maintenance?.shopRate && (
                  <div className="current-value">
                    <FaHistory /> Current: ₹{maintenance.shopRate}
                  </div>
                )}
              </div>

              {/* Close Rate Input */}
              <div className="input-group">
                <label>
                  <FaBuilding /> Close Rate <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <FaRupeeSign className="input-icon" />
                  <input
                    type="number"
                    placeholder="Enter rate for closed members"
                    value={closeRate}
                    onChange={e => setCloseRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="input-suffix">₹/month</span>
                </div>
                {maintenance?.closeRate && (
                  <div className="current-value">
                    <FaHistory /> Current: ₹{maintenance.closeRate}
                  </div>
                )}
              </div>


            </div>

            {/* Action Buttons */}
            <div className="card-actions">
              <button
                onClick={handleMaintenanceSubmit}
                className={maintenance ? "update-btn" : "save-btn"}
                disabled={!ownerRate || !rentRate}
              >
                {maintenance ? <><FaEdit /> Update</> : <><FaSave /> Add Rate</>}
              </button>

              {maintenance && (
                <button
                  onClick={handleDeleteMaintenance}
                  className="delete-btn"
                >
                  <FaTrash /> Delete
                </button>
              )}
            </div>

            {/* Current Rates Display */}
            {/* Current Rates Display */}
            {maintenance && (
              <div className="current-rates">
                <h4>
                  <FaCheckCircle /> Current Maintenance Rates
                </h4>
                <div className="rates-grid">
                  <div className="rate-item">
                    <span className="rate-label">Owner Rate:</span>
                    <span className="rate-value">{maintenance.ownerRate}</span>
                  </div>
                  <div className="rate-item">
                    <span className="rate-label">Rent Rate:</span>
                    <span className="rate-value">{maintenance.rentRate}</span>
                  </div>
                  {/* Add Shop and Close rate display */}
                  <div className="rate-item">
                    <span className="rate-label">Shop Rate:</span>
                    <span className="rate-value">{maintenance.shopRate}</span>
                  </div>
                  <div className="rate-item">
                    <span className="rate-label">Close Rate:</span>
                    <span className="rate-value">{maintenance.closeRate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="card-info">
              <p>
                <FaInfoCircle />
                Maintenance rates are applied monthly to all members based on their type (Owner/Rent/Shop/Close).
              </p>
            </div>
          </div>

          {/* WATER RATES CARD - SECOND/BOTTOM */}
          <div className="rate-card">
            <div className="card-header">
              <h2 className="card-title">
                <FaWater /> Water Rates
              </h2>
              {water && (
                <span className="status-badge active">
                  <FaCheckCircle /> Active
                </span>
              )}
            </div>

            <div className="rate-inputs">
              {/* Unit Rate Input */}
              <div className="input-group">
                <label>
                  <FaWater /> Unit Rate <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <FaRupeeSign className="input-icon" />
                  <input
                    type="number"
                    placeholder="Enter rate per unit"
                    value={unitRate}
                    onChange={e => setUnitRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <span className="input-suffix">₹/unit</span>
                </div>
                {water?.unitRate && (
                  <div className="current-value">
                    <FaHistory /> Current: ₹{water.unitRate} per unit
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions">
              <button
                onClick={handleWaterSubmit}
                className={water ? "update-btn" : "save-btn"}
                disabled={!unitRate}
              >
                {water ? <><FaEdit /> Update</> : <><FaSave /> Add Rate</>}
              </button>

              {water && (
                <button
                  onClick={handleDeleteWater}
                  className="delete-btn"
                >
                  <FaTrash /> Delete
                </button>
              )}
            </div>

            {/* Current Rates Display */}
            {water && (
              <div className="current-rates">
                <h4>
                  <FaCheckCircle /> Current Water Rate
                </h4>
                <div className="rates-grid">
                  <div className="rate-item">
                    <span className="rate-label">Per Unit Rate:</span>
                    <span className="rate-value">{water.unitRate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="card-info">
              <p>
                <FaInfoCircle />
                Water rates are calculated based on units consumed by each member.
              </p>
            </div>
          </div>
        </div>

      </div>
    </Navbar>
  );
};

export default FixRates;