import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { FaSpinner } from 'react-icons/fa'; 
import LoadingButton from './Loading';

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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const data = { first_name: firstname, last_name: lastname, email, password };

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/v1/signup/', data);
      setSuccess(true);
      alert("A verification code has been sent you email address");
      setStep('verify');
    } catch (err) {
      const responseData = err.response?.data || {};
      
      if (responseData.message && responseData.message.includes("unverified")) {
        // Email exists but not verified
        setErrors({ email: responseData.message });
        setStep('verify');
      } else if (responseData.message) {
        setErrors({ email: responseData.message });
      } else {
        setErrors(responseData);
      }

      console.error("Registration error:", responseData);
    } finally {
      setLoading(false);
    }
  };


  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      alert("Email or verification code missing");
      return;
    }

    setLoading(true);
    setErrors({});
    const payload = { email, code };
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/v1/verify/', payload, {
        headers: { 'X-CSRFToken': csrfToken }
      });

      alert("Account verified! You can now login.");
      navigate('/login');
    } catch (err) {
      const responseData = err.response?.data || {};
      setErrors({ code: responseData.message || "Verification failed" });
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

          {success && (
            <div className="alert alert-success">
              Registration Successful! Check your email for verification code.
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? <FaSpinner className="spin" /> : "Register Account"}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify}>
          <input type="text" placeholder="Enter Verification Code" value={code} onChange={(e) => setCode(e.target.value)} />
          {error.code && <small className="text-danger">{error.code}</small>}
          <LoadingButton type="submit" value="Verify Account" disabled={loading} />
        </form>
      )}
    </div>
  );
};

export default Register;
