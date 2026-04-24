
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../Axiosinstance";



const DeclineModal = () => {
  const { bookingId } = useParams(); 
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const DECLINE_REASONS = [
  
  "Stylist unavailable", 
  "Overbooked schedule",
   "Incomplete booking details",
  "Double booking conflict",
  "Other (please specify)"

];

  const handleDecline = async () => {
    const finalReason =
      selectedReason === "Other (please specify)" ? customReason : selectedReason;

    if (!finalReason.trim()) {
      alert("Please select or enter a reason.");
      return;
    }

    try {
      await axiosInstance.post(`/bookings/${bookingId}/decline/`, {
        decline_reason: finalReason
      });
      alert("Booking declined successfully!");
      navigate("/dashboard"); // back to dashboard
    } catch (err) {
      console.error(err);
      alert("Failed to decline booking. Please try again.");
    }
  };

  return (
    <div className="DeclineModal">
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        
        <p className="mb-2">Select a reason for declining this booking:</p>

         
        <div className="space-y-2 mb-4">
          {DECLINE_REASONS.map((reason) => (
            <label key={reason} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="accent-purple-500"
              />
              <span>{reason}</span>
            </label>
          ))}
        </div>

        {selectedReason === "Other (please specify)" && (
          <textarea
            rows={3}
            className="w-full border rounded-lg p-2 mb-4"
            placeholder="Enter your reason"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
      

        <div className="flex justify-between">
        <div className="decline">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg border"
          >
            Cancel
          </button>

          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !selectedReason ||
              (selectedReason === "Other (please specify)" && !customReason.trim())
            }
          >
            Decline Booking
          </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DeclineModal;
