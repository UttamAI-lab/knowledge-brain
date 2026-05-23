"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "@/lib/auth";
import {
  Users, Shield, Briefcase, User,
  Loader2, AlertCircle, RefreshCw,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getApi() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Role Badge ───────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    manager:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    employee:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const icons: Record<string, any> = {
    admin: Shield,
    manager: Briefcase,
    employee: User,
  };
  const Icon = icons[role] ?? User;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role] ?? styles.employee}`}
    >
      <Icon size={11} />
      {role}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Avatar ───────────────────────────────────────────────
function Avatar({ name, role }: { name: string; role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
    manager: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    employee: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
        colors[role] ?? colors.employee
      }`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getApi().get("/admin/users");
      setUsers(data.users);
    } catch (err: any) {
      setError(
        `Error: ${err.response?.status} — ${err.response?.data?.detail ?? "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter করো
  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Role counts
  const counts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    manager: users.filter((u) => u.role === "manager").length,
    employee: users.filter((u) => u.role === "employee").length,
  };

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="mt-1 text-gray-400">
            সব registered users দেখো ও manage করো
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(["all", "admin", "manager", "employee"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filterRole === role
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 border hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {role === "all" ? (
              <Users size={14} />
            ) : role === "admin" ? (
              <Shield size={14} />
            ) : role === "manager" ? (
              <Briefcase size={14} />
            ) : (
              <User size={14} />
            )}
            <span className="capitalize">{role}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                filterRole === role
                  ? "bg-blue-400 text-white"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {counts[role]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম বা email দিয়ে খোঁজো..."
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Loading users...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 dark:bg-gray-900 dark:border-gray-700">
          <Users size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">কোনো user পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  User
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Role
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* User info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} role={user.role} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge active={user.is_active} />
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-3 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs text-gray-400">
              মোট {filtered.length} জন user
              {search && ` (filtered from ${users.length})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}