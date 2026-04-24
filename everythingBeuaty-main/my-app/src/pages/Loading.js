import React, { useState } from "react";

const LoadingButton = ({ onClick, children, className, ...props }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    if (loading) return; 
    setLoading(true);
    try {
      await onClick?.(e); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || props.disabled}
      className={className}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export default LoadingButton;
