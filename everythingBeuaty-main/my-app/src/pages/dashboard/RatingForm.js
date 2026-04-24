import { useState } from "react";
import axios from "axios";
import axiosInstance from "../../Axiosinstance";

const RatingForm = ({ bookingId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    try {
      await axiosInstance.post(`/bookings/${bookingId}/rate/`, { rating, review });
      
      setSubmitted(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to submit rating. Please try again.");
    }
  };

  if (submitted) return <p>Thanks for your rating! ⭐ {rating}</p>;

  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "400px",
        maxWidth: "90%",
        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
      }}
    >
      <h4 style={{ textAlign: "center" }}>Rate this service:</h4>

      {/* Star Rating Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "5px",
          fontSize: "30px",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              color:
                star <= (hover || rating) ? "#FFD700" : "#D3D3D3", // gold if active, grey if not
              transition: "color 0.2s ease",
            }}
          >
            ★
          </span>
        ))}
      </div>

      <textarea
        placeholder="Optional review"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          height: "80px",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          border: "none",
          borderRadius: "5px",
          backgroundColor: "#6a1b9a",
          color: "white",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Submit Rating
      </button>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
    </div>
  );
};

export default RatingForm;
