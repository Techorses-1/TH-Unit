import { useFormik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { FiEye, FiEyeOff, FiUser, FiMail, FiPhone, FiLock } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Register.scss";
import "react-toastify/dist/ReactToastify.css";

import logo from "../../../Assets/logo/th_logo.png";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },

    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be 50 characters or less")
        .required("Name is required"),

      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),

      phone: Yup.string()
        .matches(/^[0-9]{10}$/, "Phone number must be 10 digits")
        .required("Phone number is required"),

      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
    }),

    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/register`,
          values
        );

        toast.success("Registration successful! Redirecting to login...", {
          position: "top-center",
          autoClose: 3000,
        });

        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        const data = error.response?.data;

        // FIELD LEVEL ERROR (name/email)
        if (data?.field) {
          formik.setFieldError(data.field, data.message);
        } else {
          toast.error(data?.message || "Registration failed", {
            position: "top-center",
            autoClose: 3000,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="register-container">
      <ToastContainer />

      <div className="register-wrapper">
        {/* LEFT */}
        <div className="register-left">
          <div className="form-bg" />

          <div className="glass-card">
            <h2 className="register-title">Create Account</h2>
            <p className="register-subtitle">Join us today!</p>

            <form onSubmit={formik.handleSubmit} className="register-form">
              {/* NAME */}
              <div className="form-group">
                <label className="form-label">
                  <FiUser className="input-icon" />
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.name}
                  className={`form-input ${
                    formik.touched.name && formik.errors.name ? "error" : ""
                  }`}
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="error-message">{formik.errors.name}</div>
                )}
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label className="form-label">
                  <FiMail className="input-icon" />
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className={`form-input ${
                    formik.touched.email && formik.errors.email ? "error" : ""
                  }`}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className="error-message">{formik.errors.email}</div>
                )}
              </div>

              {/* PHONE */}
              <div className="form-group">
                <label className="form-label">
                  <FiPhone className="input-icon" />
                  Phone Number
                </label>
                <input
                  name="phone"
                  type="tel"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.phone}
                  className={`form-input ${
                    formik.touched.phone && formik.errors.phone ? "error" : ""
                  }`}
                />
                {formik.touched.phone && formik.errors.phone && (
                  <div className="error-message">{formik.errors.phone}</div>
                )}
              </div>

              {/* PASSWORD */}
              <div className="form-group">
                <label className="form-label">
                  <FiLock className="input-icon" />
                  Password
                </label>
                <div className="password-input-container">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                    className={`form-input ${
                      formik.touched.password && formik.errors.password
                        ? "error"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && (
                  <div className="error-message">
                    {formik.errors.password}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registering..." : "Register"}
              </button>
            </form>

            <div className="switch-auth">
              Already have an account?
              <button
                className="switch-button"
                onClick={() => navigate("/login")}
              >
                Login here
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="register-right">
          <div className="right-inner">
            <img src={logo} alt="Logo" className="left-logo" />
            <h1 className="welcome-title">Welcome!</h1>
            <div className="divider" />
            <p className="welcome-desc">
              Manage housing society maintenance with ease and transparency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
