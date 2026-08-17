import { BrowserRouter, Routes, Route } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import ErrorBoundary from "./components/ErrorBoundary";

//the future flags opt in to v7 behaviour now and silence its upgrade warnings
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

function App() {
  return (
    // the boundary sits outside the router, so a failure in routing itself is
    // still caught rather than blanking the page
    <ErrorBoundary>
      <BrowserRouter future={ROUTER_FUTURE}>
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
