import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<Layout />} errorElement={<h1>Página no encontrada</h1>}>
            <Route index element={<Home />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/Register" element={<Register />} />
            <Route path="/PatientDashboard" element={<PatientDashboard />} />
            <Route path="/DoctorDashboard" element={<DoctorDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    )
);
