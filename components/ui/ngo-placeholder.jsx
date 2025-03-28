import React from "react";

const NGOPlaceholder = ({ className = "", ...props }) => {
  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 ${className}`}
      {...props}
    >
      <div className="text-emerald-600 text-center p-4">
        <svg
          className="w-12 h-12 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="text-sm font-medium">NGO</span>
      </div>
    </div>
  );
};

export default NGOPlaceholder;
