import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import {
  Mail,
  Crown,
  Shield,
  ArrowRight,
  CheckCircle,
  User,
  Lock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from '@/lib/utils';
import { useBanner } from "@/components/BannerContext";

const Auth = ({ onLoginSuccess }: { onLoginSuccess?: (balance: number) => void }) => {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  // Add state for show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const { showBanner } = useBanner();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Signup handler
  const handleSignup = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to send OTP.");
      } else {
        setStep("otp");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP verification handler (after signup)
  const handleVerifyOTP = async () => {
    setError(null);
    if (!email || !otp) {
      setError("Please enter your email and OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to verify OTP.");
      } else {
        // Store user data and JWT token
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        localStorage.setItem("balance", data.user.balance);
        if (onLoginSuccess) onLoginSuccess(data.user.balance);
        showBanner("Please refresh the site to check your current balance.", 2000);
        // Redirect to home page
        navigate("/");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Login failed.");
      } else {
        // Store user data and JWT token
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        localStorage.setItem("balance", data.user.balance);
        if (onLoginSuccess) onLoginSuccess(data.user.balance);
        showBanner("Please refresh the site & check balance.", 3000);
        // Redirect to home page
        navigate("/");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
     
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <Card className="glass-effect border-border/50">
            <CardHeader className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold rounded-lg flex items-center justify-center mx-auto mb-4 animate-glow">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">
                {step === "otp"
                  ? "Verify Your Account"
                  : isLogin
                    ? "Welcome Back"
                    : "Join Royal Bet"}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {step === "otp"
                  ? `Enter the OTP sent to your email`
                  : isLogin
                    ? "Sign in to your premium gaming account"
                    : "Create your account and start playing"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="mb-4 text-red-600 text-center text-sm font-medium">
                  {error}
                </div>
              )}
              {step === "credentials" ? (
                <div className="space-y-6">
                  <Tabs
                    value={isLogin ? "login" : "signup"}
                    onValueChange={(value) => {
                      setIsLogin(value === "login");
                      setError(null);
                      setStep("credentials");
                    }}
                  >
                    <TabsList className="flex w-full rounded-xl p-0 min-w-0">
                      <TabsTrigger value="login" className="flex-1 text-base sm:text-lg py-2 sm:py-3 px-0 sm:px-0">Login</TabsTrigger>
                      <TabsTrigger value="signup" className="flex-1 text-base sm:text-lg py-2 sm:py-3 px-0 sm:px-0">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login" className="space-y-4 mt-6">
                      <AuthForm
                        isLogin={true}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        loading={loading}
                        onSubmit={handleLogin}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                      />
                      <div className="text-right mt-2">
                        <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot Password?</Link>
                      </div>
                    </TabsContent>
                    <TabsContent value="signup" className="space-y-4 mt-6">
                      <AuthForm
                        isLogin={false}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        loading={loading}
                        onSubmit={handleSignup}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <OTPVerification
                  otp={otp}
                  setOtp={setOtp}
                  loading={loading}
                  onVerify={handleVerifyOTP}
                  onBack={() => setStep("credentials")}
                />
              )}
            </CardContent>
          </Card>
          {step === "credentials" && (
            <div className="mt-6 text-center space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  SSL Encrypted
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Verified Platform
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-2">
                By continuing, you agree to our Terms of Service and Privacy
                Policy. Must be 18+ to play. Gamble responsibly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AuthFormProps {
  isLogin: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  onSubmit: () => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

const AuthForm = ({
  isLogin,
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  showPassword,
  setShowPassword,
}: AuthFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (isLogin ? "Logging in..." : "Signing up...") : isLogin ? "Login" : "Sign Up"}
      </Button>
    </form>
  );
};

interface OTPVerificationProps {
  otp: string;
  setOtp: (otp: string) => void;
  loading: boolean;
  onVerify: () => void;
  onBack: () => void;
}

const OTPVerification = ({
  otp,
  setOtp,
  loading,
  onVerify,
  onBack,
}: OTPVerificationProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-gold" />
        </div>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit code to your email. Enter it below to verify your account.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="otp">Enter OTP</Label>
        <Input
          id="otp"
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="text-center text-lg tracking-wider bg-secondary/30 h-12"
          maxLength={6}
          disabled={loading}
        />
      </div>
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12" disabled={loading}>
          Back
        </Button>
        <Button
          onClick={onVerify}
          className="flex-1 bg-gold hover:bg-gold/90 text-black font-semibold h-12"
          disabled={otp.length !== 6 || loading}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {loading ? "Verifying..." : "Verify"}
        </Button>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Didn't receive the code?
        </p>
        <Button variant="link" className="text-gold p-0 text-sm" disabled={loading}>
          Resend OTP
        </Button>
      </div>
    </div>
  );
};

export default Auth;
