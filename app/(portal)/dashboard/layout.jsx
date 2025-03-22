import React from "react";

const layout = ({ children }) => {
  return (
    <div>
      <div>
        <h1>Dashboard</h1>
      </div>
      {children}
    </div>
  );
};

export default layout;
