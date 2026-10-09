import React from 'react'
import { useState } from "react";
import axios from "axios";
import LoadingButton from './Loading';
import { baseUrl } from '../Axiosinstance';
import { useToast } from '../ToastContext';


const ForgotPassword = () => {
const [email, setEmail] = useState("");
const showToast = useToast();

const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        await axios.post(`${baseUrl}/forgot-password/`, { email });
        showToast("Password reset link sent to your email.", "success");
    } catch (err) {
        showToast("Failed to send reset link. Please try again.", "error");
    }   
};

  return (
    <div className='forgot'>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>    
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)} required
          />

        <br />
        <LoadingButton type="submit" variant="contained">
                  Send Reset Link
             </LoadingButton>
      </form>
    </div>
    
  );
}

export default ForgotPassword