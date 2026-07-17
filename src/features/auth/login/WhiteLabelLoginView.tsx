import Alert from "@/components/Alert";
import Loading from "@/components/Loading";
import { BRAND } from "@/lib/branding";
import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { useLoginViewModel } from "./useLoginViewModel";

const toRgba = (hex: string, alpha: number): string => {
  const safeHex = (hex || "").replace("#", "").trim();
  const fullHex = safeHex.length === 3
    ? safeHex.split("").map((c) => `${c}${c}`).join("")
    : safeHex;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(79,70,229,${alpha})`;
  }

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function WhiteLabelLoginView() {
  const { formValues, isLoading, auth, handleChange, handleLogin, handleKeyDown, navigate } = useLoginViewModel();
  const [showPassword, setShowPassword] = useState(false);
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ACCESS_TOKEN");

  const colors = useMemo(() => {
    const primary = BRAND.primaryColor || "#4F46E5";
    const secondary = BRAND.secondaryColor || "#312E81";
    return {
      primary,
      secondary,
      primarySoft: toRgba(primary, 0.18),
      primarySoftBorder: toRgba(primary, 0.35),
      bgGlow: `radial-gradient(circle at 20% 20%, ${toRgba(primary, 0.28)} 0%, transparent 35%), radial-gradient(circle at 85% 15%, ${toRgba(secondary, 0.24)} 0%, transparent 40%), radial-gradient(circle at 80% 85%, ${toRgba(primary, 0.18)} 0%, transparent 35%)`,
    };
  }, []);

  if (isLoading && hasToken) return <Loading />;
  if (auth && !isLoading) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed top-5 right-5 z-50">
        <Alert />
      </div>

      <div className="absolute inset-0 opacity-90" style={{ background: colors.bgGlow }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />

      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_90px_rgba(0,0,0,0.45)] overflow-hidden grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-10 border-r border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden">
              {BRAND.logoWhite || BRAND.logo ? (
                <img
                  src={BRAND.logoWhite || BRAND.logo}
                  alt={BRAND.name}
                  className="h-9 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Icon icon="solar:shop-2-bold-duotone" className="text-white text-2xl" />
              )}
            </div>
            <div>
              <p className="text-white/80 text-xs tracking-[0.18em] uppercase">Panel Empresarial</p>
              <h2 className="text-white text-2xl font-semibold tracking-tight">{BRAND.name}</h2>
            </div>
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight text-white">
              Impulsa tu operación con control total
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-md">
              Facturación, inventario y gestión comercial en una sola experiencia de trabajo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            <span className="w-10 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
            <span className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12 bg-white">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: colors.secondary }}>
              Acceso seguro
            </p>
            <h3 className="text-3xl font-semibold text-slate-900 mt-2">Bienvenido a {BRAND.name}</h3>
            <p className="text-slate-500 mt-2 text-sm">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onKeyDown={handleKeyDown} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
              <input
                autoComplete="off"
                type="email"
                name="email"
                value={formValues.email}
                onChange={handleChange}
                placeholder="correo@empresa.com"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                style={{ boxShadow: `0 0 0 0 ${colors.primarySoft}` }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.primarySoftBorder;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.primarySoft}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  autoComplete="off"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formValues.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                  style={{ boxShadow: `0 0 0 0 ${colors.primarySoft}` }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.primarySoftBorder;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.primarySoft}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 my-auto h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 transition-colors grid place-items-center"
                >
                  <Icon icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} className="text-xl" />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/recuperar-contrasena")}
                className="text-sm font-medium transition-colors"
                style={{ color: colors.secondary }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.99] shadow-lg"
              style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, boxShadow: `0 14px 28px ${toRgba(colors.primary, 0.28)}` }}
            >
              Iniciar sesión
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/tienda/login")}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Ir a mi tienda virtual
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
