import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../Axiosinstance";
import LoadingButton from "../Loading";

const BookService = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [dateTime, setDateTime] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSalon = location.state?.salon || null;
  const token = localStorage.getItem("accessToken");

  const handleConfirm = async () => {
    if (!dateTime) 
      return alert("Please select a date and time!");
    if (!selectedServiceId) 
      return alert("Please select a service!");

    const selected = new Date(dateTime);
    const now = new Date();
    if (selected < now) return alert("Cannot choose a past date/time!");

    // Check salon working hours
    if (selectedSalon) {
      const [startHour, startMin] = selectedSalon.startT.split(":").map(Number);
      const [endHour, endMin] = selectedSalon.endT.split(":").map(Number);
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      const selectedTotal = selected.getHours() * 60 + selected.getMinutes();
      if (selectedTotal < startTotal || selectedTotal > endTotal) {
        return alert(`Choose a time between ${selectedSalon.startT} - ${selectedSalon.endT}`);
      }
    }

    try {
      await axiosInstance.post(
        "/bookings/",
        {
          salon_id: selectedSalon.id,
          service_id: selectedServiceId,
          date_time: new Date(dateTime).toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const serviceObj = selectedSalon.services_list.find(s => s.id === parseInt(selectedServiceId));
      alert(`Booking confirmed for ${serviceObj.service_name} at ${selectedSalon.salon_name} on ${selected.toLocaleString()} you will receive an email once the salon confirms your booking.`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      alert("Failed to save booking.");
    }
  };

  return (
    <div className="Background">
      <div className="bookservice">
        <h2>Book at {selectedSalon?.salon_name}</h2>
        <p>Location: {selectedSalon?.location}</p>
        <p>Working hours: {selectedSalon?.startT} - {selectedSalon?.endT}</p>

        <label>
          Choose Date & Time
          <button onClick={() => setShowPicker(!showPicker)}>Select</button>
        </label>
        {showPicker && (
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} min={new Date().toISOString().slice(0,16)} />
        )}

        <div className="ServiceChoose">

          <label>
            Choose Service
            {selectedSalon && (

              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                <option value="">Choose service</option>
                {selectedSalon.services_list?.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.service_name} - R{service.price}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        {selectedServiceId && (
          <p>
            You want your <strong>{selectedSalon.services_list.find(s => s.id === parseInt(selectedServiceId))?.service_name}</strong> at <strong>{selectedSalon.salon_name}</strong> on <strong>{new Date(dateTime).toLocaleString()}</strong>
          </p>
        )}

        <div className="Confirm">
          <LoadingButton onClick={handleConfirm}>Confirm Booking</LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default BookService;
