import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Leaf } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) nav("/dashboard");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen bg-sand-100 grid place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="brand-back">
          <div className="w-9 h-9 rounded-full bg-sage-400 grid place-items-center">
            <Leaf weight="duotone" size={20} className="text-sand-50" />
          </div>
          <span className="font-heading text-xl font-medium text-ink-900">Mindful</span>
        </Link>
        <div className="bento-card p-8">
          <h1 className="font-heading text-2xl font-medium text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-600 mt-1">Soft landing. Take your time.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-ink-600">Email</Label>
              <Input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="h-11 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-ink-600">Password</Label>
              <Input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="h-11 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
            </div>
            {error && <div data-testid="login-error" className="text-sm text-crisis bg-crisis/5 px-3 py-2 rounded-lg">{error}</div>}
            <Button type="submit" disabled={loading} data-testid="login-submit-button"
              className="w-full h-11 rounded-xl bg-ink-900 text-sand-50 hover:bg-ink-900/90">
              {loading ? "Settling in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-ink-600 mt-6 text-center">
            New here?{" "}
            <Link to="/register" className="text-sage-700 font-medium" data-testid="register-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
