import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Crown, TrendingUp, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import Banner from "@/components/Banner";
import React, { useState, useEffect } from "react";

const Dashboard = () => {
  // Remove all showBanner and localStorage logic from Dashboard.tsx

  return (
    <div className="min-h-screen bg-background">
      {/* Remove all showBanner and localStorage logic from Dashboard.tsx */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-effect border-border/50 text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <User className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">User Dashboard</CardTitle>
            <Badge className="mx-auto bg-primary/20 text-primary border-primary/30">
              <Construction className="w-4 h-4 mr-1" />
              Coming Soon
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your personalized dashboard will feature:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>📊 Account Overview</li>
              <li>🎮 Gaming Statistics</li>
              <li>🏆 Achievement Badges</li>
              <li>🎁 Active Bonuses</li>
              <li>⚙️ Account Settings</li>
            </ul>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              asChild
            >
              <Link to="/">
                <TrendingUp className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
