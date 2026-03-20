import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

const roles: { value: UserRole; label: string; description: string }[] = [
  {
    value: "employee",
    label: "Employee",
    description: "Basic access to chat and search",
  },
  {
    value: "department_manager",
    label: "Department Manager",
    description: "View and manage department documents",
  },
  {
    value: "director",
    label: "Director",
    description: "Manage documents, approve content, and view audit logs",
  },
  {
    value: "admin_auditor",
    label: "Administrator Auditor",
    description: "Full system access including user management",
  },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleLogin = () => {
    login(selectedRole);
    navigate("/chat");
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">KnowledgeHub</CardTitle>
          <CardDescription>
            Enterprise Knowledge Management + RAG Assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Select role to demo:
            </p>
            {roles.map((role) => (
              <label
                key={role.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={() => setSelectedRole(role.value)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{role.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <Button onClick={handleLogin} className="w-full gap-2">
            <LogIn className="h-4 w-4" />
            Continue as {roles.find((r) => r.value === selectedRole)?.label}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            This is a demo. In production, SSO/OIDC authentication would be
            used.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
