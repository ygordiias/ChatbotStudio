import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Orcamentos from './pages/Orcamentos';
import OrcamentoForm from './pages/orcamento/OrcamentoForm';
import OrcamentoDetail from './pages/orcamento/OrcamentoDetail';
import '@/App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div id="app-root">
            <Toaster 
              position="top-right" 
              richColors
              closeButton
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/items" element={<Items />} />
                        <Route path="/orcamentos" element={<Orcamentos />} />
                        <Route path="/orcamentos/new" element={<OrcamentoForm />} />
                        <Route path="/orcamentos/:id" element={<OrcamentoDetail />} />
                        <Route path="/orcamentos/:id/edit" element={<OrcamentoForm />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;