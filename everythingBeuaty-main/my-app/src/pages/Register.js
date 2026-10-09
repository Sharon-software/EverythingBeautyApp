import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { FaSpinner } from 'react-icons/fa'; 
import LoadingButton from './Loading';
import { baseUrl } from '../Axiosinstance';
import { useToast } from '../ToastContext';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const Register = () => {
  const [step, setStep] = useState('register'); 
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");  
  const [code, setCode] = useState("");
  const [error, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const showToast = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setStatusMessage("Sending verification code...");
    const data = { first_name: firstname, last_name: lastname, email, password };

    try {
      await axios.post(`${baseUrl}/signup/`, data, { timeout: 90000 });
      setStatusMessage("");
      setStep('verify');
    } catch (err) {
      const responseData = err.response?.data || {};

      if (responseData.message && responseData.message.includes("unverified")) {
        setErrors({ email: responseData.message });
        setStatusMessage("");
        setStep('verify');
      } else {
        const message = responseData.message || (
          err.code === "ECONNABORTED"
            ? "Registration timed out. Please try again."
            : err.response
              ? "Registration failed. Please try again."
              : "Unable to reach the server. Check your connection and try again."
        );
        setErrors({ email: message });
        setStatusMessage("");
      }

      console.error("Registration error:", responseData);
    } finally {
      setLoading(false);
    }
  };


  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      showToast("Email or verification code missing", "error");
      return;
    }

    setLoading(true);
    setErrors({});
    const payload = { email, code };
    const csrfToken = getCookie('csrftoken');

    try {
      await axios.post(`${baseUrl}/verify/`, payload, {
        headers: { 'X-CSRFToken': csrfToken },
        timeout: 15000,
      });

      showToast("Account verified! You can now login.", "success");
      navigate('/login');
    } catch (err) {
      const responseData = err.response?.data || {};
      const message = responseData.message || (
        err.code === "ECONNABORTED"
          ? "Verification timed out. Please try again."
          : "Unable to verify your account. Please try again."
      );
      setErrors({ code: message });
      console.error("Verification error:", responseData);
    } finally {
      setLoading(false);
    }
  };

 
  return (
    <div className="register">
      {step === 'register' && (
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Enter FirstName" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
          <input type="text" placeholder="Enter LastName" value={lastname} onChange={(e) => setLastname(e.target.value)} />
          <input type="text" placeholder="Enter Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error.email && <small className="text-danger">{error.email}</small>}
          <input type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error.password && <small className="text-danger">{error.password}</small>}

          <button className="auth-action-button" type="submit" disabled={loading} aria-label={loading ? "Sending verification code" : "Register Account"}>
            {loading ? <FaSpinner className="spin" /> : "Register Account"}
          </button>
          {statusMessage && <small role="status">{statusMessage}</small>}
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify}>
          <div role="status" style={{ color: "darkgreen", marginBottom: "1rem" }}>
            Verification code sent to {email}. Check your inbox and spam folder.
          </div>
          {error.email && <small className="text-danger">{error.email}</small>}
          <input type="text" placeholder="Enter Verification Code" value={code} onChange={(e) => setCode(e.target.value)} />
          {error.code && <small className="text-danger">{error.code}</small>}
          <LoadingButton type="submit" className="auth-action-button" disabled={loading}>Verify Account</LoadingButton>
        </form>
      )}
    </div>
  );
};

export default Register;
