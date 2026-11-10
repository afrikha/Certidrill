import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "./create-user-form";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("users")}</h1>
      <Card>
        <h2 className="mb-4 font-semibold">{t("createUser")}</h2>
        <CreateUserForm />
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{tc("email")}</th>
              <th scope="col" className="px-4 py-2">{tc("name")}</th>
              <th scope="col" className="px-4 py-2">{t("role")}</th>
              <th scope="col" className="px-4 py-2">{tc("language")}</th>
              <th scope="col" className="px-4 py-2">{t("createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2 uppercase">{u.locale}</td>
                <td className="px-4 py-2">{format.dateTime(u.createdAt, { dateStyle: "medium" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
