import React from "react";
import { BrowserRouter } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { AppRoutes } from "./routes";
import "./styles/globals.css";

const FrontendApp: React.FC = () => {
    return (
        <BrowserRouter>
            <MainLayout>
                <AppRoutes />
            </MainLayout>
        </BrowserRouter>
    );
};

export default FrontendApp;
