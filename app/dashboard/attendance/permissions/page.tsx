"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge, Button, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface Permission {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  employee: { name: string; pin: string; department: string | null };
}

interface Employee {
  id: string;
  name: string;
  pin: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    permissionId: string;
    permissionName: string;
    action: "APPROVED" | "REJECTED";
  }>({ open: false, permissionId: "", permissionName: "", action: "APPROVED" });
  const [actionNotes, setActionNotes] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    type: "IZIN",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const fetchPermissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);

      const res = await fetch(`/api/permissions?${params.toString()}`);
      const data = await res.json();
      setPermissions(data);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal mengajukan izin");
        return;
      }

      setShowAddModal(false);
      setFormData({
        employeeId: "",
        type: "IZIN",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
      fetchPermissions();
    } catch (error) {
      alert("Gagal mengajukan izin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string, notes?: string) => {
    try {
      const res = await fetch(`/api/permissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", notes: notes || null }),
      });

      if (!res.ok) {
        alert("Gagal menyetujui izin");
        return;
      }

      fetchPermissions();
    } catch (error) {
      alert("Gagal menyetujui izin");
    }
  };

  const handleReject = async (id: string, notes?: string) => {
    try {
      const res = await fetch(`/api/permissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", notes: notes || null }),
      });

      if (!res.ok) {
        alert("Gagal menolak izin");
        return;
      }

      fetchPermissions();
    } catch (error) {
      alert("Gagal menolak izin");
    }
  };

  const openConfirmDialog = (id: string, name: string, action: "APPROVED" | "REJECTED") => {
    setActionNotes("");
    setConfirmDialog({ open: true, permissionId: id, permissionName: name, action });
  };

  const handleConfirmAction = async () => {
    const { permissionId, action } = confirmDialog;
    if (action === "APPROVED") {
      await handleApprove(permissionId, actionNotes);
    } else {
      await handleReject(permissionId, actionNotes);
    }
    setConfirmDialog({ open: false, permissionId: "", permissionName: "", action: "APPROVED" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" size="sm">Disetujui</Badge>;
      case "REJECTED":
        return <Badge variant="error" size="sm">Ditolak</Badge>;
      default:
        return <Badge variant="warning" size="sm">Menunggu</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "SICK":
        return <Badge variant="error" size="sm">Sakit</Badge>;
      case "CUTI":
        return <Badge variant="info" size="sm">CUTI</Badge>;
      default:
        return <Badge variant="default" size="sm">Izin</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Stats
  const pendingCount = permissions.filter((p) => p.status === "PENDING").length;
  const approvedCount = permissions.filter((p) => p.status === "APPROVED").length;
  const rejectedCount = permissions.filter((p) => p.status === "REJECTED").length;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Absensi", href: "/dashboard/attendance" },
          { label: "Izin" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Kelola Izin
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Ajukan dan kelola izin karyawan (Sakit, CUTI, Izin)
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajukan Izin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Menunggu</p>
                <p className="mt-1 text-2xl font-semibold text-amber-400">{pendingCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Disetujui</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">{approvedCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Ditolak</p>
                <p className="mt-1 text-2xl font-semibold text-error">{rejectedCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.36m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass-high">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Semua Status</option>
                <option value="PENDING">Menunggu</option>
                <option value="APPROVED">Disetujui</option>
                <option value="REJECTED">Ditolak</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-11 rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Semua Tipe</option>
                <option value="SICK">Sakit</option>
                <option value="CUTI">CUTI</option>
                <option value="IZIN">Izin</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card variant="glass-high">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Karyawan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Tipe</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Alasan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Catatan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-on-surface-variant">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-on-surface">{perm.employee.name}</p>
                          <p className="text-xs text-on-surface-variant">{perm.employee.department || "-"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(perm.type)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-on-surface">
                          {formatDate(perm.startDate)}
                          {perm.startDate !== perm.endDate && (
                            <span> - {formatDate(perm.endDate)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface-variant line-clamp-1">
                          {perm.reason || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface-variant line-clamp-1">
                          {perm.notes || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(perm.status)}</td>
                      <td className="px-6 py-4">
                        {perm.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openConfirmDialog(perm.id, perm.employee.name, "APPROVED")}
                              className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                              title="Setujui"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openConfirmDialog(perm.id, perm.employee.name, "REJECTED")}
                              className="rounded-lg p-2 text-error transition-colors hover:bg-error/10"
                              title="Tolak"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.36m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {permissions.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant">Belum ada data izin</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <h3 className="text-lg font-semibold text-on-surface">Ajukan Izin Baru</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Isi form untuk mengajukan izin</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">Karyawan *</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.pin})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">Tipe Izin *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="IZIN">Izin</option>
                  <option value="SICK">Sakit</option>
                  <option value="CUTI">CUTI</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tanggal Mulai *"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <Input
                  label="Tanggal Selesai *"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">Alasan</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 py-3 text-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Jelaskan alasan izin..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={submitting || !formData.employeeId}
              >
                {submitting ? "Mengirim..." : "Ajukan"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <h3 className="text-lg font-semibold text-on-surface">
              {confirmDialog.action === "APPROVED" ? "Setujui Izin" : "Tolak Izin"}
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {confirmDialog.action === "APPROVED"
                ? `Menyetujui izin untuk ${confirmDialog.permissionName}?`
                : `Menolak izin untuk ${confirmDialog.permissionName}?`}
            </p>
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-on-surface">Catatan Admin (opsional)</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 py-3 text-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Tambahkan catatan untuk keputusan ini..."
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog({ open: false, permissionId: "", permissionName: "", action: "APPROVED" })}
              >
                Batal
              </Button>
              <Button
                variant={confirmDialog.action === "APPROVED" ? "primary" : "secondary"}
                onClick={handleConfirmAction}
              >
                {confirmDialog.action === "APPROVED" ? "Setujui" : "Tolak"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
