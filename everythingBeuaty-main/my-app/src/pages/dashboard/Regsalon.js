import React, { useState,useEffect,useCallback} from 'react';
import { useNavigate } from "react-router-dom";
import axiosInstance from '../../Axiosinstance';
import axios from 'axios';
import LoadingButton from '../Loading';

const Regsalon = () => {
  const [salonName, setSalonName] = useState("");
  const [Location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [Gallery, setGallery] = useState([]);
  const [services, setServices] = useState([{ service_name: "", price: "" }]);
  const [error, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false);

  
  const handleServiceChange = (index, field, value) => {
    const newServices = [...services];
    newServices[index][field] = value;
    setServices(newServices);
  };

  const addService = () => {
    setServices([...services, { service_name: "", price: "" }]);
  };

  const removeService = (index) => {
    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
     setErrors({});

      const invalidPrices = services.filter(
    (s) => s.price && /[^0-9.]/.test(s.price)
   );
    if (invalidPrices.length > 0) {
      setErrors({ price: "Prices must be numeric vulaues." });
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.error("No token found. Please login first.");
      return;
    }

    const formData = new FormData();
    formData.append("salon_name", salonName);
    formData.append("location", Location);
    formData.append("startT", startTime);
    formData.append("endT", endTime);
    
    const filteredServices = services.filter(s => s.service_name && s.price);
    formData.append("services", JSON.stringify(filteredServices));


    for (let i = 0; i < Gallery.length; i++) {
      formData.append("gallery_upload", Gallery[i]);
    }
  


    try {
      const response = await axiosInstance.post(
        "http://127.0.0.1:8000/api/v1/salons/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            // Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Salon registered", response.data);
      setErrors({});
      setSuccess(true);
      alert("Salon registered successfully!");
      navigate('/Dashboard');
    } catch (err) {
      console.error("Registration error", err.response?.data);
      setErrors(err.response?.data || {});
    }
  };

  //wait for 400ms after typying before fetching suggestions 
   const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

 const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    } 
  setLoading(true);
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: 7, // show up to 7 suggestions
          countrycodes: "za", // 🇿🇦 restrict to South Africa
        },
      });
      setSuggestions(res.data || []);
      setErrors("");
    } catch (err) {
      setErrors("Failed to fetch location suggestions");
    } finally {
      setLoading(false);
    }
  };

  // Debounced version so it doesn’t call API on every keystroke
  const debouncedFetch = useCallback(debounce(fetchSuggestions, 400), []);

  const handleChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    debouncedFetch(value);
  };

  const handleSelect = (suggestion) => {
    setLocation(suggestion.display_name);
    setSuggestions([]); // hide dropdown
  };

  return (
    <div className='salonReg'>
      <form onSubmit={handleSubmit}>
        <h3>Enter your Salon details below</h3>

        <label>
          Salon Name
          <input
            type="text"
            placeholder="Enter salon Name"
            value={salonName}
            onChange={(e) => setSalonName(e.target.value)}
            required
          /><br/>
        </label>
        {error.salon_name && <div style={{ color: "red" }}>{error.salon_name}</div>}

        <label>
          Location
          <input
            type="text"
            placeholder="Enter your location"
            value={Location}
            onChange={handleChange}
            required
          />
        </label>
         {loading && (
        <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.25rem" }}>
          Searching...
        </div>
      )}
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            width: "100%",
            marginTop: "0.25rem",
            listStyle: "none",
            padding: 0,
            zIndex: 10,
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: "0.6rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseDown={(e) => e.preventDefault()} // prevents blur on click
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}

        
         {error.location && <div style={{ color: "red" }}>{error.location}</div>}
        <br />
 
        <label>
          Working hours start from: 
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          /> 
          To 
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)
            }
          />
        </label><br/>


        <label>Add pictures to your Gallery:</label>
        <input
          type="file"
          multiple
          onChange={(e) => setGallery(e.target.files)}
        /><br/>

        <h4 style={{
          color: "#080808ff",
          fontSize: "2rem",
          fontWeight:"unset",
        }}>
           Add your Services & Prices</h4>

        {services.map((service, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder="Service Name"
              value={service.service_name}
              onChange={(e) => handleServiceChange(index, "service_name", e.target.value)}
            />
             
           
            <input
              type="text"
              placeholder="Price"
              value={service.price}
              onChange={(e) => handleServiceChange(index, "price", e.target.value)}
            />
             
            {error.price && <div style={{ color: "red" }}>{error.price}</div>}
            <button style={{
              
              marginBottom:"1rem",
            }} 
            type="button" onClick={() => removeService(index)}>Remove Service</button>
          </div>
        ))}
        <button type="button" onClick={addService}>Add Service</button><br/><br/>
        

        <LoadingButton type="submit">Submit</LoadingButton>

        {success && (
          <div className="alert alert-success">
            <span style={{ color: "darkgreen",
                          fontWeight: "bold"
                         }}>Registration Successful!
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default Regsalon;
