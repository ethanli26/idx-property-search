import { BrowserRouter, Routes, Route } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";

function App() {
  return (
    //the future flags opt in to v7 behaviour now and silence its upgrade warnings
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
