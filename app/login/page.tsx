"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Hesap oluşturuldu. E-postana gelen doğrulama bağlantısına tıkladıktan sonra giriş yapabilirsin.");
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white font-black text-xl mb-4">
            SG
          </div>
          <h1 className="text-xl font-bold text-white">S.GENCER DERS TAKİP</h1>
          <p className="text-sm text-muted mt-1">Ders programını ve gelirini tek yerden yönet</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signin" ? "bg-accent text-white" : "bg-[#152238] text-muted"}`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signup" ? "bg-accent text-white" : "bg-[#152238] text-muted"}`}
            >
              Hesap Oluştur
            </button>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">E-posta</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sen@ornek.com"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Bekleyin…" : mode === "signin" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-6">
          Bu, verilerinize yalnızca sizin erişebileceğiniz özel bir uygulamadır.
        </p>
      </div>
    </div>
  );
}
