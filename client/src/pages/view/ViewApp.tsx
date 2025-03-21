import React from "react";

import Header from "./Header";
import ViewProject from "./ViewProject";
import Footer from "./Footer";

const ViewApp: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <ViewProject />
      <Footer />
    </div>
  );
};

export default ViewApp;
