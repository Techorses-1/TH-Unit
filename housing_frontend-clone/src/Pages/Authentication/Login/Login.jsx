import { useFormik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.scss";
import logo from "../../../Assets/logo/th_logo.png";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },

    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string().required("Password is required"),
    }),

    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/login`,
          values
        );

        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        toast.success("Login successful! Redirecting...", {
          position: "top-center",
          autoClose: 2000,
        });

        setTimeout(() => navigate("/"), 2000);
      } catch (error) {
        const data = error.response?.data;

        // FIELD LEVEL ERROR
        if (data?.field) {
          formik.setFieldError(data.field, data.message);
        } else {
          toast.error(data?.message || "Login failed", {
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
    <div className="login-container">
      <ToastContainer />

      <div className="login-wrapper">
        {/* LEFT */}
        <div className="login-left">
          <div className="left-inner">
            <img src={logo} alt="Logo" className="left-logo" />
            <h1 className="welcome-title">Welcome Back!</h1>
            <div className="divider" />
            <p className="welcome-desc">
              Login to manage your housing society maintenance system smoothly
              and securely.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="form-bg" />

          <div className="glass-card">
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Enter your credentials below</p>

            <form onSubmit={formik.handleSubmit} className="login-form">
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
                {isSubmitting ? "Logging in..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
