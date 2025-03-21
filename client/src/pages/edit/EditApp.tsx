import React from "react";
import Header from "./Header";
import Main from "./Main";
import Footer from "./Footer";

const EditApp: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <Main />
      <Footer />
    </div>
  );
};

export default EditApp;
