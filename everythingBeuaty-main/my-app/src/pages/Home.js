import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import image2 from '../image/image2.jpeg';
import shaz from '../image/shaz.jpeg';
import nails from '../image/nails.jpeg';
import image5 from '../image/image5.jpeg';
import brush from '../image/brush.jpg';
import axios from 'axios';
import { AuthProvider } from '../AuthContext';
import LoadingButton from './Loading';



const Navbar = () => {
  const styles = { color: "orange" };
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const {login} =useContext(AuthProvider);

  const handleSubmit = async (e) => { 
    e.preventDefault();

    const userData = {
      username: email, 
      password: password 
    };
    

    try{
      const response = await axios.post("http://127.0.0.1:8000/api/v1/token/", userData);
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
     console.log("Login successful");
      login(response.data.access);
      navigate('/Dashboard');
    }catch(error){
       console.error("Invalid Credentials");
       setError("Invalid Credentials");
    }
  }

  return (
    <>
      <div className="container">
        <span style={{ '--i': '2' }}>
          <img src={image2} alt="2" />
        </span>

        <span style={{ '--i': '3' }}>
          <img src={brush} alt="3" />
        </span>

        <span style={{ '--i': '4' }}>
          <img src={nails} alt="4" />
        </span>

        <span style={{ '--i': '5' }}>
          <img src={shaz} alt="5" />
        </span>

        <span style={{ '--i': '6' }}>
          <img src={image5} alt="6" />
        </span>
      </div>

      <div className="login">
        <p>
          Book or get booked.<br />
          The best <span style={styles}> BEAUTY </span> service is a booking away
        </p>
      </div>

      <div className="InputText">
        <label>Already have an account?<br /></label>
        <label>Sign in below </label><br />

        
        
        <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter Email Address" value={email}onChange={(e)=> setEmail(e.target.value)} /><br />
       
        <input type="text" placeholder="Enter Password"value={password}onChange={(e)=> setPassword(e.target.value)} /><br />
        
        {error && <div className="text-danger"> {error} </div>}

        <LoadingButton type="submit" variant="contained">
                  Login
             </LoadingButton>
             <br />

        </form>

        <div className="forgotPassword">
          <label onClick={() => navigate("/forgot-password")}> Forgot Password</label>
        </div>
        

        <div className="signup">
          <label onClick={() => navigate("/Register")}>create new account</label>
        </div>
      </div>

      
    </>
  )
}

export default Navbar;
