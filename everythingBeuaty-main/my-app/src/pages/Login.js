import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "../AuthContext";
import LoadingButton from "./Loading";

const Login = () => {

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
  return(
   <>
    <div className="Login">
   <div className="InputText">
        
        <label>Sign in or create new Account </label><br />

        
        
        <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter Email Address" value={email}onChange={(e)=> setEmail(e.target.value)} /><br />
       
        <input type="text" placeholder="Enter Password"value={password}onChange={(e)=> setPassword(e.target.value)} /><br />
        
        {error && <div className="text-danger"> {error} </div>}

          <LoadingButton type="submit" /> <br />
        </form>
        

        <div className="signup">
          <label onClick={() => navigate("/Register")}>create new account</label>
        </div>
      </div>
    </div>
      </>
    )
}
export default Login;
