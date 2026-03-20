import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  Users,
  Building2,
  UserCheck,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  projects: string[];
  status: "active" | "inactive";
  lastActive: string;
}

const mockUsersData: UserRecord[] = [
  {
    id: "user-1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@company.com",
    role: "Employee",
    department: "Engineering",
    projects: ["Engineering Team", "Project Alpha"],
    status: "active",
    lastActive: "2024-01-15T10:30:00Z",
  },
  {
    id: "user-2",
    name: "Trần Thị Bình",
    email: "binh.tran@company.com",
    role: "Department Manager",
    department: "Engineering",
    projects: ["Engineering Team", "Managers"],
    status: "active",
    lastActive: "2024-01-15T09:15:00Z",
  },
  {
    id: "user-3",
    name: "Lê Văn Cường",
    email: "cuong.le@company.com",
    role: "Director",
    department: "Knowledge Management",
    projects: ["KM Team", "Content Reviewers"],
    status: "active",
    lastActive: "2024-01-15T08:45:00Z",
  },
  {
    id: "user-4",
    name: "Phạm Thị Dung",
    email: "dung.pham@company.com",
    role: "Administrator Auditor",
    department: "IT Administration",
    projects: ["Admins", "IT Team"],
    status: "active",
    lastActive: "2024-01-15T11:00:00Z",
  },
  {
    id: "user-5",
    name: "Hoàng Văn Em",
    email: "em.hoang@company.com",
    role: "Employee",
    department: "Sales",
    projects: ["Sales Team"],
    status: "inactive",
    lastActive: "2024-01-10T14:00:00Z",
  },
];

export default function UsersPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Users & Access"
        description="Users and Access management"
        breadcrumbs={[{ label: "Users & Access" }]}
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="users" className="h-full flex flex-col">
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building2 className="h-4 w-4" />
                Departments
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="flex-1 p-6 mt-0">
            <UsersTab />
          </TabsContent>

          <TabsContent value="roles" className="flex-1 p-6 mt-0">
            <RolesTab />
          </TabsContent>

          <TabsContent value="departments" className="flex-1 p-6 mt-0">
            <DepartmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users] = useState<UserRecord[]>(mockUsersData);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.department}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.projects.slice(0, 2).map((project) => (
                      <Badge
                        key={project}
                        variant="secondary"
                        className="text-xs"
                      >
                        {project}
                      </Badge>
                    ))}
                    {user.projects.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{user.projects.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {user.status === "active" ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-status-approved" />
                        <span className="text-sm">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Inactive
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(user.lastActive)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit User</DropdownMenuItem>
                      <DropdownMenuItem>Manage Projects</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === "active" ? (
                        <DropdownMenuItem className="text-destructive">
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RolesTab() {
  const roles = [
    {
      name: "Administrator Auditor",
      description: "Full system access including user management and settings",
      usersCount: 2,
      permissions: ["All permissions"],
    },
    {
      name: "Director",
      description: "Manage documents, approve content, and view audit logs",
      usersCount: 5,
      permissions: [
        "Document management",
        "Approvals",
        "Audit logs",
        "Settings",
      ],
    },
    {
      name: "Department Manager",
      description: "View and manage department documents",
      usersCount: 12,
      permissions: ["Chat", "Search", "Department documents"],
    },
    {
      name: "Employee",
      description: "Basic access to chat and search",
      usersCount: 150,
      permissions: ["Chat", "Search", "View approved documents"],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {roles.map((role) => (
        <Card key={role.name}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{role.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
              <Badge variant="secondary">{role.usersCount} users</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Permissions
            </p>
            <div className="flex flex-wrap gap-1">
              {role.permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DepartmentsTab() {
  const departments = [
    { name: "Engineering", usersCount: 45, documentsCount: 128 },
    { name: "HR", usersCount: 12, documentsCount: 89 },
    { name: "Sales", usersCount: 35, documentsCount: 67 },
    { name: "Finance", usersCount: 18, documentsCount: 54 },
    { name: "IT Administration", usersCount: 8, documentsCount: 43 },
    { name: "Knowledge Management", usersCount: 5, documentsCount: 156 },
  ];

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Users</TableHead>
            <TableHead className="text-center">Documents</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dept) => (
            <TableRow key={dept.name}>
              <TableCell className="font-medium">{dept.name}</TableCell>
              <TableCell className="text-center">{dept.usersCount}</TableCell>
              <TableCell className="text-center">
                {dept.documentsCount}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
