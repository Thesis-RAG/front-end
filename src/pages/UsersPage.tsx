/** UsersPage: tabbed management for users and org-unit structure. */
import { useState } from "react";
import { Users, Network } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddUserButton } from "@/components/users/AddUserButton";
import { UsersTab } from "@/components/users/UsersTab";
import { OrgTab } from "@/components/users/OrgTab";

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [userRefresh, setUserRefresh] = useState(0);
  const [orgRefresh, setOrgRefresh] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Người dùng & Tổ chức"
        description="Quản lý người dùng, cơ cấu tổ chức và phân quyền"
        actions={
          activeTab === "users" ? (
            <AddUserButton onCreated={() => setUserRefresh((n) => n + 1)} />
          ) : null
        }
      />
      <div className="flex-1 overflow-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="users" className="gap-2 text-[12.5px]">
                <Users className="h-4 w-4" /> Người dùng
              </TabsTrigger>
              <TabsTrigger value="org" className="gap-2 text-[12.5px]">
                <Network className="h-4 w-4" /> Tổ chức
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="users" className="flex-1 p-6 mt-0">
            <UsersTab
              refreshTrigger={userRefresh}
              onOrgChange={() => setOrgRefresh((n) => n + 1)}
            />
          </TabsContent>
          <TabsContent value="org" className="flex-1 p-6 mt-0">
            <OrgTab refreshTrigger={orgRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
