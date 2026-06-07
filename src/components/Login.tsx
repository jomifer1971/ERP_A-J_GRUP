/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { Usuario } from '../types';
import Logo from './Logo';

interface LoginProps {
  onLogin: (user: Usuario) => void;
}

// Fallback simulated users 
const MOCK_USERS: Usuario[] = [
  { id: 'u-1', nombre: 'Javier Domínguez', email: 'ceo@ajgrup.com', rol: 'ceo', validado: true, especialidades: ['electricista', 'fontanero'], telefono: '+34 601 234 567' },
  { id: 'u-2', nombre: 'Admin Master', email: 'admin@ajgrup.com', rol: 'admin', validado: true, especialidades: ['electricista'], telefono: '+34 602 345 678' },
  { id: 'u-3', nombre: 'Carlos Jefe', email: 'jefe@ajgrup.com', rol: 'jefe_equipo', validado: true, especialidades: ['paleta', 'fontanero'], telefono: '+34 603 456 789' },
  { id: 'u-4', nombre: 'Juan Operario', email: 'juan@ajgrup.com', rol: 'operario', validado: true, especialidades: ['paleta'], jefeId: 'u-3', telefono: '+34 604 567 890' },
  { id: 'u-5', nombre: 'Nuevo Empleado', email: 'nuevo@ajgrup.com', rol: 'operario', validado: false, especialidades: ['pintor'], telefono: '+34 605 678 901' },
  { id: 'u-jomi', nombre: 'José Miguel Domínguez', email: 'jomifer1971@gmail.com', rol: 'ceo', validado: true, especialidades: ['paleta', 'pintor', 'electricista', 'fontanero'], telefono: '+34 699 987 654' },
];
export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Recovery States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // In a real app we would use Supabase Auth: await supabase.auth.signInWithPassword({ email, password })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, indica tu email y contraseña.');
      return;
    }

    setLoading(true);

    // Simulate network request
    setTimeout(() => {
      setLoading(false);
      
      let systemUsers = MOCK_USERS;
      const saved = localStorage.getItem('aj_users_v2');
      if (saved) {
        try {
          systemUsers = JSON.parse(saved);
        } catch {}
      } else {
        localStorage.setItem('aj_users_v2', JSON.stringify(MOCK_USERS));
      }

      let user = systemUsers.find(u => u.email === email.trim().toLowerCase() && password === '123456');
      if (!user && password === '123456') {
        const newUser: Usuario = {
          id: `u-${Date.now()}`,
          nombre: email.trim().split('@')[0],
          email: email.trim().toLowerCase(),
          rol: 'ceo',
          validado: true
        };
        systemUsers.push(newUser);
        localStorage.setItem('aj_users_v2', JSON.stringify(systemUsers));
        user = newUser;
      }
      
      if (user) {
        if (!user.validado) {
          setError('Tu cuenta aún está pendiente de validación por parte del administrador.');
        } else {
          onLogin(user);
        }
      } else {
        setError('Credenciales incorrectas (Usa: rol@ajgrup.com / 123456)');
      }
    }, 800);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess(false);

    if (!recoveryEmail) {
      setRecoveryError('Por favor, escribe tu dirección de correo electrónico.');
      return;
    }

    if (!recoveryEmail.endsWith('@ajgrup.com') && !recoveryEmail.endsWith('@aygrupbcn.com')) {
      setRecoveryError('Por favor, indica una dirección de correo corporativo válida.');
      return;
    }

    setRecoveryLoading(true);

    // Simulate sending email
    setTimeout(() => {
      setRecoveryLoading(false);
      setRecoverySuccess(true);
    }, 1000);
  };

  const autofill = (emailToFill: string) => {
    setEmail(emailToFill);
    setPassword('123456');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* Header decoration on a light background to preserve original logo branding colors */}
        <div className="bg-[#f8fafc] border-b border-gray-100 px-8 pt-10 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b92a3]/5 rounded-full translate-x-12 -translate-y-12 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#07474e]/5 rounded-full -translate-x-8 translate-y-8"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo scaled up for magnificent visibility with original branding colors */}
            <Logo className="h-20 md:h-24 w-auto transform hover:scale-105 transition-transform duration-300" showText={true} />
            <p className="text-[#07474e]/60 text-[10px] tracking-widest font-mono font-bold uppercase mt-4">MANAGEMENT PORTAL</p>
          </div>
        </div>

        {/* Dynamic Inner Panel Section */}
        <div className="px-8 py-8 bg-white relative z-20">
          {!showForgotPassword ? (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                Iniciar Sesión
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">Email corporativo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all text-sm font-medium"
                      placeholder="ejemplo@ajgrup.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setRecoveryEmail(email);
                        setRecoverySuccess(false);
                        setRecoveryError('');
                      }}
                      className="text-xs font-bold text-[#07474e] hover:text-[#3b92a3] hover:underline focus:outline-none"
                    >
                      ¿Contraseña olvidada?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 flex items-start gap-2 rounded-xl text-xs font-medium border border-red-100 mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full bg-[#07474e] hover:bg-[#0b4e56] active:scale-[0.98] transition-all text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm font-sans"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Acceder al Portal</span>
                    </>
                  )}
                </button>
              </form>

              {/* Development fast-access keys */}
              <div className="mt-8 border-t border-dashed border-gray-200 pt-6">
                <p className="text-[10px] text-gray-400 font-mono text-center mb-3">ACCESOS RÁPIDOS SIMULADOS (DEV)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => autofill('ceo@ajgrup.com')} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200 uppercase">CEO</button>
                  <button type="button" onClick={() => autofill('admin@ajgrup.com')} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200 uppercase">Admin</button>
                  <button type="button" onClick={() => autofill('jefe@ajgrup.com')} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200 uppercase">Jefe Equipo</button>
                  <button type="button" onClick={() => autofill('juan@ajgrup.com')} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-200 uppercase">Operario</button>
                  <button type="button" onClick={() => autofill('nuevo@ajgrup.com')} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 uppercase border border-red-200">No Válido</button>
                </div>
              </div>
            </>
          ) : (
            // Forgotten Password Flow Rendering Section
            <div className="flex flex-col gap-4 animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Recuperar Contraseña
              </h2>
              <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                Introduce tu correo corporativo. Te enviaremos un enlace de recuperación para restablecer tu acceso inmediatamente.
              </p>

              {recoverySuccess ? (
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl flex flex-col gap-3 my-2">
                  <div className="text-xs text-teal-850 font-medium leading-relaxed">
                    <span className="font-bold text-teal-900 block mb-1">¡Correo enviado con éxito!</span>
                    Hemos enviado instrucciones para restablecer tu contraseña a <strong className="font-semibold block mt-0.5">{recoveryEmail}</strong>. Por favor, revisa tu bandeja de entrada o carpeta de spam.
                  </div>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setRecoverySuccess(false);
                    }}
                    className="mt-2 text-center text-xs font-bold text-[#07474e] hover:underline"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-mono">Email corporativo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={e => setRecoveryEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#07474e]/20 focus:border-[#07474e] transition-all text-sm font-medium"
                        placeholder="ejemplo@ajgrup.com"
                      />
                    </div>
                  </div>

                  {recoveryError && (
                    <div className="bg-red-50 text-red-600 p-3 flex items-start gap-2 rounded-xl text-xs font-medium border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{recoveryError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="w-full bg-[#07474e] hover:bg-[#0b4e56] active:scale-[0.98] transition-all text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm font-sans text-sm"
                    >
                      {recoveryLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span>Enviar Enlace de Recuperación</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full py-2 bg-transparent text-gray-500 hover:text-gray-800 text-xs font-mono font-bold transition-all text-center"
                    >
                      &lt; Volver al Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
