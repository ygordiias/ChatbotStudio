import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="glassmorphism rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <img 
                src="https://customer-assets.emergentagent.com/job_6a1d4806-8932-4f80-b5f2-32162d8861f2/artifacts/p3cmz4m7_empresa%20%27Tecno%20Dias%27.jpg"
                alt="Tecno Dias"
                className="w-32 h-32 mx-auto rounded-xl mb-4"
              />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">
              <span className="text-white">TECNO</span>
              <span className="text-cyan-400"> DIAS</span>
            </h1>
            <p className="text-slate-300 text-sm">Sistema de Gerenciamento de Orçamentos</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 text-center text-sm text-slate-300">
            <p>Usuário padrão: tecnodias25@outlook.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}