import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet as WalletIcon,
  Crown,
  CreditCard,
  Construction,
} from "lucide-react";
import { Link } from "react-router-dom";

const Wallet = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-sm sm:max-w-md w-full glass-effect border-border/50 text-center">
          <CardHeader>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-casino-blue/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-float">
              <WalletIcon className="w-6 h-6 sm:w-8 sm:h-8 text-casino-blue" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Wallet & Payments</CardTitle>
            <Badge className="mx-auto bg-casino-blue/20 text-casino-blue border-casino-blue/30 text-xs sm:text-sm">
              <Construction className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Coming Soon
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm sm:text-base">
              Your secure wallet system is being prepared with:
            </p>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-2">
              <li>💳 Instant UPI Deposits</li>
              <li>🏦 Bank Transfer Support</li>
              <li>📱 Quick Withdrawals</li>
              <li>💰 Points Management</li>
              <li>📊 Transaction History</li>
            </ul>
            <Button
              className="w-full bg-casino-blue hover:bg-casino-blue/90 text-white py-3"
              asChild
            >
              <Link to="/">
                <CreditCard className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
