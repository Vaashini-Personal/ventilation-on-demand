import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated, isConfigured, login } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated()) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (login(username, password)) {
      setError("");
      navigate(from, { replace: true });
    } else {
      setError(
        isConfigured()
          ? "Invalid username or password."
          : "Demo login is not configured. Set VITE_DEMO_USERNAME and VITE_DEMO_PASSWORD."
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm bg-card/80 border-border/50">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Sign in</CardTitle>
          <CardDescription className="text-xs">Ventilation on Demand: demo access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
