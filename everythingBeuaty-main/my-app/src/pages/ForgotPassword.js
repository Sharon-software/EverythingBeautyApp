import React from 'react'
import { useState } from "react";
import axios from "axios";
import LoadingButton from './Loading';


const ForgotPassword = () => {
const [email, setEmail] = useState("");

const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        await axios.post("http://127.0.0.1:8000/api/v1/forgot-password/", { email });
        alert("Password reset link sent to your email.");
    } catch (err) {
        alert("Failed to send reset link. Please try again.");
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