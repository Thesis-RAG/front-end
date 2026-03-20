import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to="/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Chat
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
