import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import RequirePublic from "./components/RequirePublic";
import HomePage from "./pages/app/HomePage";
import SignInPage from "./pages/auth/SignInPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/home" replace />} />
      <Route element={<RequirePublic />}>
        <Route path="/auth/sign-in" element={<SignInPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/app/home" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  );
}
