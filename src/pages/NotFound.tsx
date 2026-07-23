/** NotFound: 404 fallback page rendered when no route matches the current path. */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  // Log the missing route to the console to help diagnose broken links.
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <h1 className="text-5xl font-semibold tracking-tight">404</h1>
          <p className="mt-3 text-lg text-muted-foreground">Oops! Page not found</p>
          <Button asChild className="mt-6">
            <Link to="/login">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
