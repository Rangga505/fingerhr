"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, Button, Badge, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface Employee {
  id: string;
  pin: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
  lastAttendance: string | null;
  createdAt: string;
}

interface Device {
  id: string;
  name: string;
  model: string;
  ipAddress: string;
  isActive: boolean;
}

type SyncStep = "sending" | "registering" | "done" | "error";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "requesting" | "waiting" | "done" | "error">("idle");
  const [syncEmployeeCount, setSyncEmployeeCount] = useState(0);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; employee: Employee | null; mode: "website" | "device" | null }>({
    show: false,
    employee: null,
    mode: null,
  });

  // Loading popup state
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingStep, setLoadingStep] = useState<SyncStep>("sending");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingError, setLoadingError] = useState("");

  // Face photo state
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    pin: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Device type detection for face support
  const supportsFace = (model: string) => {
    const m = model.toUpperCase();
    return m.includes("VIVO") || m.includes("VIDA") || m.includes("DS") || m.includes("DT");
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchDevices();
  }, [fetchEmployees, fetchDevices]);

  // Face photo handling
  const handleFacePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 100KB)
    if (file.size > 100 * 1024) {
      alert("Ukuran foto wajah maksimal 100KB!");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFacePhoto(base64);
      setFacePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeFacePhoto = () => {
    setFacePhoto(null);
    setFacePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Sync from device
  const handleSyncFromDevice = async () => {
    setShowSyncModal(true);
    setSyncStatus("requesting");
    setSyncEmployeeCount(0);
    setSyncLog(["Mengirim perintah GetAllPin ke mesin..."]);

    try {
      const res = await fetch("/api/employees/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-from-device" }),
      });

      const data = await res.json();

      if (!data.success) {
        setSyncStatus("error");
        setSyncLog((prev) => [...prev, `Error: ${data.error}`]);
        return;
      }

      setSyncStatus("waiting");
      setSyncLog((prev) => [...prev, "Perintah terkirim! Menunggu response dari mesin via webhook..."]);

      const startTime = Date.now();
      const timeout = 45000;
      const stableDuration = 8000;
      let lastCount = 0;
      let firstSeenAt = 0;

      const pollInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeout) {
          clearInterval(pollInterval);
          setSyncStatus("done");
          setSyncLog((prev) => [...prev, "Timeout - sync selesai"]);
          fetchEmployees();
          return;
        }

        try {
          const pollRes = await fetch("/api/employees");
          const pollData = await pollRes.json();
          const currentCount = pollData.employees?.length || 0;

          if (currentCount > lastCount) {
            const newCount = currentCount - lastCount;
            setSyncEmployeeCount(currentCount);
            setSyncLog((prev) => [
              ...prev,
              `✓ ${newCount} karyawan baru ditemukan (${currentCount} total)`,
            ]);
            lastCount = currentCount;
            if (firstSeenAt === 0) firstSeenAt = Date.now();
            fetchEmployees();
          }

          if (firstSeenAt > 0 && (Date.now() - firstSeenAt) > stableDuration && currentCount > 0) {
            clearInterval(pollInterval);
            setSyncStatus("done");
            setSyncLog((prev) => [
              ...prev,
              `Sync selesai! ${currentCount} karyawan berhasil disinkronisasi.`,
            ]);
            fetchEmployees();
          }
        } catch {
          // Ignore poll errors
        }
      }, 2000);

      fetchEmployees();
    } catch (error) {
      setSyncStatus("error");
      setSyncLog((prev) => [...prev, "Gagal mengirim perintah ke mesin"]);
    }
  };

  // Add employee with face photo
  const handleAddEmployee = async () => {
    if (!form.pin || !form.name) {
      alert("PIN dan Nama wajib diisi");
      return;
    }

    setFormLoading(true);
    setShowLoadingPopup(true);
    setLoadingStep("sending");
    setLoadingMessage("Mengirim data ke mesin absensi...");
    setLoadingError("");

    try {
      // Step 1: Send to device
      const syncRes = await fetch("/api/employees/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-to-device",
          pin: form.pin,
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          department: form.department || null,
          position: form.position || null,
          face: facePhoto || null,
        }),
      });

      const syncData = await syncRes.json();

      if (!syncData.success) {
        setLoadingStep("error");
        setLoadingError(`Gagal mengirim ke mesin: ${syncData.error}`);
        return;
      }

      // Step 2: If face photo, register face
      if (facePhoto && devices.some((d) => supportsFace(d.model))) {
        setLoadingStep("registering");
        setLoadingMessage("Mendaftarkan foto wajah ke mesin...");

        // The face is already sent in the add-to-device action
        // Just wait a moment for the device to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Step 3: Save to database (if not already added by sync)
      const existingRes = await fetch(`/api/employees?search=${form.pin}`);
      const existingData = await existingRes.json();
      const exists = existingData.employees?.some((e: Employee) => e.pin === form.pin);

      if (!exists) {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: form.pin,
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            department: form.department || null,
            position: form.position || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setLoadingStep("error");
          setLoadingError(`Gagal menyimpan ke database: ${err.error}`);
          return;
        }
      }

      // Success
      setLoadingStep("done");
      setLoadingMessage(`Berhasil menambahkan ${form.name}`);
      fetchEmployees();
    } catch (error) {
      setLoadingStep("error");
      setLoadingError("Gagal menambahkan karyawan");
    } finally {
      setFormLoading(false);
    }
  };

  // Close loading popup and reset form
  const handleCloseLoadingPopup = () => {
    setShowLoadingPopup(false);
    if (loadingStep === "done") {
      setShowAddModal(false);
      setForm({ pin: "", name: "", email: "", phone: "", department: "", position: "" });
      removeFacePhoto();
    }
  };

  // Delete employee
  const handleDelete = async (employee: Employee, deleteFromDevice: boolean) => {
    try {
      if (deleteFromDevice) {
        const syncRes = await fetch("/api/employees/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-from-device", pin: employee.pin }),
        });

        const syncData = await syncRes.json();
        if (!syncData.success) {
          alert(`Gagal hapus dari mesin: ${syncData.error}`);
          return;
        }
      }

      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Gagal hapus dari database: ${err.error}`);
        return;
      }

      setDeleteModal({ show: false, employee: null, mode: null });
      fetchEmployees();
      alert(`Berhasil menghapus ${employee.name}`);
    } catch (error) {
      alert("Gagal menghapus karyawan");
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirm = window.confirm(`Hapus ${selectedIds.length} karyawan dari website saja?`);
    if (!confirm) return;

    try {
      for (const id of selectedIds) {
        await fetch(`/api/employees/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      fetchEmployees();
    } catch (error) {
      alert("Gagal bulk delete");
    }
  };

  // Toggle select
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((e) => e.id));
    }
  };

  const hasFaceDevice = devices.some((d) => supportsFace(d.model));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Karyawan" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
            Manajemen Karyawan
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kelola data karyawan dan sinkronisasi dengan mesin absensi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleSyncFromDevice}
            disabled={syncing}
          >
            {syncing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            Sync dari Mesin
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Karyawan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Total Karyawan</p>
                <p className="mt-1 text-2xl font-semibold text-on-surface">{employees.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Aktif</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  {employees.filter((e) => e.isActive).length}
                </p>
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
                <p className="text-xs font-medium text-on-surface-variant">Tidak Aktif</p>
                <p className="mt-1 text-2xl font-semibold text-slate-400">
                  {employees.filter((e) => !e.isActive).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Cari nama, PIN, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            }
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">
              {selectedIds.length} dipilih
            </span>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Hapus dari Website
            </Button>
          </div>
        )}
      </div>

      {/* Employee Table */}
      <Card variant="glass">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === employees.length && employees.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant">PIN</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant">Absensi Terakhir</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-on-surface-variant">
                    Belum ada karyawan
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => toggleSelect(emp.id)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-primary">{emp.pin}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{emp.name}</p>
                        {emp.email && (
                          <p className="text-xs text-on-surface-variant">{emp.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{emp.department || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.isActive ? "success" : "default"}>
                        {emp.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">
                      {emp.lastAttendance
                        ? new Date(emp.lastAttendance).toLocaleDateString("id-ID")
                        : "Belum ada"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeleteModal({ show: true, employee: emp, mode: "website" })}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface"
                          title="Hapus dari website"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteModal({ show: true, employee: emp, mode: "device" })}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400"
                          title="Hapus dari website + mesin"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass max-w-lg w-full rounded-[2rem] p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-on-surface">Tambah Karyawan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="PIN *"
                placeholder="PIN dari mesin absensi"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
              />
              <Input
                label="Nama *"
                placeholder="Nama karyawan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Email"
                placeholder="Email (opsional)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Telepon"
                placeholder="Telepon (opsional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Departemen"
                  placeholder="Departemen"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
                <Input
                  label="Posisi"
                  placeholder="Posisi"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>

              {/* Face Photo Section */}
              {hasFaceDevice && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="text-sm font-medium text-on-surface">Foto Wajah (VIVO/VIDA/DS/DT)</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3">
                    Maksimal 100KB, wajah harus terlihat jelas dan close-up
                  </p>

                  {facePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={facePreview}
                          alt="Face preview"
                          className="h-24 w-24 rounded-xl object-cover border border-white/[0.1]"
                        />
                        <button
                          type="button"
                          onClick={removeFacePhoto}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-on-surface">Foto wajah siap</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Foto akan didaftarkan ke mesin absensi
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] p-6 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <svg className="h-8 w-8 text-on-surface-variant mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <p className="text-sm text-on-surface-variant">Klik untuk upload foto wajah</p>
                      <p className="text-xs text-on-surface-variant mt-1">JPG, PNG, maks 100KB</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFacePhotoChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)} className="flex-1">
                Batal
              </Button>
              <Button variant="primary" size="md" onClick={handleAddEmployee} disabled={formLoading} className="flex-1">
                {formLoading ? "Menambahkan..." : "Tambah & Sync ke Mesin"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Popup */}
      {showLoadingPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="glass max-w-sm w-full rounded-[2rem] p-6">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              {loadingStep === "sending" && (
                <div className="relative h-16 w-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              )}

              {loadingStep === "registering" && (
                <div className="relative h-16 w-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </div>
                </div>
              )}

              {loadingStep === "done" && (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                  <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {loadingStep === "error" && (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
                  <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}

              {/* Message */}
              <h4 className="text-lg font-semibold text-on-surface mb-2">
                {loadingStep === "sending" && "Mengirim ke Mesin"}
                {loadingStep === "registering" && "Mendaftarkan Wajah"}
                {loadingStep === "done" && "Berhasil!"}
                {loadingStep === "error" && "Gagal"}
              </h4>

              <p className="text-sm text-on-surface-variant mb-4">
                {loadingMessage}
              </p>

              {loadingError && (
                <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4">
                  <p className="text-sm text-red-400">{loadingError}</p>
                </div>
              )}

              {/* Progress Steps */}
              {(loadingStep === "sending" || loadingStep === "registering") && (
                <div className="w-full space-y-2 mt-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${loadingStep === "sending" ? "bg-primary animate-pulse" : "bg-emerald-500"}`}>
                      {loadingStep === "sending" ? (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      ) : (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant">Mengirim data karyawan</span>
                  </div>
                  {hasFaceDevice && (
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${loadingStep === "registering" ? "bg-primary animate-pulse" : "bg-white/10"}`}>
                        {loadingStep === "registering" ? (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-white/30" />
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant">Mendaftarkan foto wajah</span>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              {(loadingStep === "done" || loadingStep === "error") && (
                <Button variant="primary" size="md" onClick={handleCloseLoadingPopup} className="w-full mt-2">
                  {loadingStep === "done" ? "Selesai" : "Tutup"}
                </Button>
              )}

              {(loadingStep === "sending" || loadingStep === "registering") && (
                <p className="text-xs text-on-surface-variant mt-4">
                  Jangan tutup halaman ini...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && deleteModal.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteModal({ show: false, employee: null, mode: null })}>
          <div className="glass max-w-md w-full rounded-[2rem] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-on-surface mb-4">Hapus Karyawan</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Pilih cara menghapus <strong>{deleteModal.employee.name}</strong>:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleDelete(deleteModal.employee!, false)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="text-sm font-medium text-on-surface">Hapus dari Website saja</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Data tetap ada di mesin absensi
                </p>
              </button>

              <button
                onClick={() => handleDelete(deleteModal.employee!, true)}
                className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left transition-all hover:border-red-500/40 hover:bg-red-500/10"
              >
                <p className="text-sm font-medium text-red-400">Hapus dari Website + Mesin</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Data dihapus dari website dan mesin absensi
                </p>
              </button>
            </div>

            <button
              onClick={() => setDeleteModal({ show: false, employee: null, mode: null })}
              className="mt-4 w-full rounded-xl bg-white/[0.05] px-4 py-2 text-sm font-medium text-on-surface hover:bg-white/[0.08]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Sync Progress Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass max-w-md w-full rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-on-surface">Sinkronisasi dari Mesin</h3>
              {syncStatus === "done" && (
                <button onClick={() => setShowSyncModal(false)} className="text-on-surface-variant hover:text-on-surface">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 mb-6">
              {syncStatus === "requesting" && (
                <>
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div>
                    <p className="text-sm font-medium text-on-surface">Mengirim perintah...</p>
                    <p className="text-xs text-on-surface-variant">Menghubungi mesin absensi</p>
                  </div>
                </>
              )}
              {syncStatus === "waiting" && (
                <>
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">Menunggu response dari mesin...</p>
                    <p className="text-xs text-on-surface-variant">Data akan muncul via webhook</p>
                  </div>
                </>
              )}
              {syncStatus === "done" && (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Sync selesai!</p>
                    <p className="text-xs text-on-surface-variant">{syncEmployeeCount} karyawan ditemukan</p>
                  </div>
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-400">Gagal</p>
                    <p className="text-xs text-on-surface-variant">Terjadi kesalahan</p>
                  </div>
                </>
              )}
            </div>

            {/* Log */}
            <div className="max-h-48 overflow-y-auto rounded-xl bg-black/30 p-3 space-y-1">
              {syncLog.map((log, i) => (
                <p key={i} className="text-xs font-mono text-on-surface-variant">
                  <span className="text-primary/60">›</span> {log}
                </p>
              ))}
            </div>

            {/* Action Button */}
            <div className="mt-6">
              {syncStatus === "done" || syncStatus === "error" ? (
                <Button variant="primary" size="md" onClick={() => setShowSyncModal(false)} className="w-full">
                  Tutup
                </Button>
              ) : (
                <p className="text-center text-xs text-on-surface-variant">
                  Jangan tutup halaman ini sampai sync selesai
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
