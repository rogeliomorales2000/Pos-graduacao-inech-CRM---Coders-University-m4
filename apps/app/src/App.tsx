import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import RequirePublic from "./components/RequirePublic";
import HomePage from "./pages/app/HomePage";
import ConfirmAccountPage from "./pages/auth/ConfirmAccountPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/home" replace />} />
      <Route element={<RequirePublic />}>
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route path="/auth/confirm-account" element={<ConfirmAccountPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/app/home" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  );
}
