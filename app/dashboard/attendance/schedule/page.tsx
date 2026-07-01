"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Badge, Button, Input } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout";

interface Schedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  overtimeStart: string | null;
  overtimeRate: number;
  graceMinutes: number;
  isActive: boolean;
  _count: { employees: number };
}

interface Employee {
  id: string;
  name: string;
  pin: string;
}

interface Assignment {
  id: string;
  employeeId: string;
  scheduleId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  employee: { name: string; pin: string };
  schedule: Schedule;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    startTime: "08:30",
    endTime: "16:30",
    breakStart: "",
    breakEnd: "",
    overtimeStart: "",
    overtimeRate: 1.5,
    graceMinutes: 15,
  });

  const [assignData, setAssignData] = useState({
    employeeId: "",
    scheduleId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/attendance/schedule");
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
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

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/attendance/assign");
      const data = await res.json();
      setAssignments(data);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
    fetchAssignments();
  }, []);

  const handleAddSchedule = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menambahkan jadwal");
        return;
      }

      setShowAddModal(false);
      setFormData({ name: "", startTime: "08:30", endTime: "16:30", breakStart: "", breakEnd: "", overtimeStart: "", overtimeRate: 1.5, graceMinutes: 15 });
      fetchSchedules();
    } catch (error) {
      alert("Gagal menambahkan jadwal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/attendance/schedule/${selectedSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal mengupdate jadwal");
        return;
      }

      setShowEditModal(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (error) {
      alert("Gagal mengupdate jadwal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/attendance/schedule/${selectedSchedule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menghapus jadwal");
        return;
      }

      setShowDeleteModal(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (error) {
      alert("Gagal menghapus jadwal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menugaskan jadwal");
        return;
      }

      setShowAssignModal(false);
      setAssignData({
        employeeId: "",
        scheduleId: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
      });
      fetchAssignments();
    } catch (error) {
      alert("Gagal menugaskan jadwal");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart: schedule.breakStart || "",
      breakEnd: schedule.breakEnd || "",
      overtimeStart: schedule.overtimeStart || "",
      overtimeRate: schedule.overtimeRate,
      graceMinutes: schedule.graceMinutes,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Absensi", href: "/dashboard/attendance" },
          { label: "Jadwal Kerja" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-on-surface">Jadwal Kerja</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Kelola jadwal kerja dan penugasan karyawan</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => setShowAssignModal(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Assign Jadwal
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowAddModal(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* Schedules List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : schedules.length === 0 ? (
          <Card variant="glass" className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-on-surface-variant">Belum ada jadwal kerja</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} variant="glass-high">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-on-surface">{schedule.name}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">{schedule.startTime} - {schedule.endTime}</p>
                  </div>
                  <Badge variant={schedule.isActive ? "success" : "default"} size="sm">
                    {schedule.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Toleransi Terlambat</span>
                    <span className="text-on-surface">{schedule.graceMinutes} menit</span>
                  </div>
                  {schedule.breakStart && schedule.breakEnd && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">Jam Istirahat</span>
                      <span className="text-on-surface">{schedule.breakStart} - {schedule.breakEnd}</span>
                    </div>
                  )}
                  {schedule.overtimeStart && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">Lembur Mulai</span>
                      <span className="text-on-surface">{schedule.overtimeStart} ({schedule.overtimeRate}x)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Karyawan Ditugaskan</span>
                    <span className="text-on-surface">{schedule._count.employees}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(schedule)}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-white/[0.08]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(schedule)}
                    className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/10"
                  >
                    Hapus
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assignments Table */}
      {assignments.length > 0 && (
        <Card variant="glass-high">
          <CardContent className="p-0">
            <div className="border-b border-white/[0.08] px-6 py-4">
              <h3 className="text-sm font-semibold text-on-surface">Penugasan Jadwal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Karyawan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">PIN</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Jadwal</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Jam</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Berlaku Dari</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-on-surface-variant">Berlaku Sampai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {assignments.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4 text-sm text-on-surface">{a.employee.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-on-surface">{a.employee.pin}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{a.schedule.name}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{a.schedule.startTime} - {a.schedule.endTime}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{new Date(a.effectiveFrom).toLocaleDateString("id-ID")}</td>
                      <td className="px-6 py-4 text-sm text-on-surface">{a.effectiveTo ? new Date(a.effectiveTo).toLocaleDateString("id-ID") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <h3 className="text-lg font-semibold text-on-surface">Tambah Jadwal Baru</h3>
            <div className="mt-6 space-y-4">
              <Input label="Nama Jadwal *" placeholder="Contoh: SM1" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jam Mulai *" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                <Input label="Jam Selesai *" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Istirahat Mulai" type="time" value={formData.breakStart} onChange={(e) => setFormData({ ...formData, breakStart: e.target.value })} />
                <Input label="Istirahat Selesai" type="time" value={formData.breakEnd} onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lembur Mulai" type="time" value={formData.overtimeStart} onChange={(e) => setFormData({ ...formData, overtimeStart: e.target.value })} />
                <Input label="Rate Lembur" type="number" step="0.1" min="1" max="5" value={formData.overtimeRate} onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 1.5 })} />
              </div>
              <Input label="Toleransi (menit)" type="number" value={formData.graceMinutes} onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value) || 15 })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button variant="primary" onClick={handleAddSchedule} disabled={submitting || !formData.name}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <h3 className="text-lg font-semibold text-on-surface">Edit Jadwal</h3>
            <div className="mt-6 space-y-4">
              <Input label="Nama Jadwal *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jam Mulai *" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                <Input label="Jam Selesai *" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Istirahat Mulai" type="time" value={formData.breakStart} onChange={(e) => setFormData({ ...formData, breakStart: e.target.value })} />
                <Input label="Istirahat Selesai" type="time" value={formData.breakEnd} onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lembur Mulai" type="time" value={formData.overtimeStart} onChange={(e) => setFormData({ ...formData, overtimeStart: e.target.value })} />
                <Input label="Rate Lembur" type="number" step="0.1" min="1" max="5" value={formData.overtimeRate} onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 1.5 })} />
              </div>
              <Input label="Toleransi (menit)" type="number" value={formData.graceMinutes} onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value) || 15 })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Batal</Button>
              <Button variant="primary" onClick={handleEditSchedule} disabled={submitting}>{submitting ? "Menyimpan..." : "Update"}</Button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
              <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-on-surface">Hapus Jadwal</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Yakin ingin menghapus jadwal <strong>{selectedSchedule.name}</strong>?</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Batal</Button>
              <Button variant="danger" onClick={handleDeleteSchedule} disabled={submitting}>{submitting ? "Menghapus..." : "Hapus"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass mx-4 w-full max-w-md rounded-3xl border border-white/[0.08] p-6">
            <h3 className="text-lg font-semibold text-on-surface">Assign Jadwal ke Karyawan</h3>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">Karyawan *</label>
                <select value={assignData.employeeId} onChange={(e) => setAssignData({ ...assignData, employeeId: e.target.value })} className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.name} ({emp.pin})</option>))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">Jadwal *</label>
                <select value={assignData.scheduleId} onChange={(e) => setAssignData({ ...assignData, scheduleId: e.target.value })} className="h-11 w-full rounded-xl border border-white/[0.08] bg-surface-container px-4 text-sm text-on-surface focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Pilih Jadwal</option>
                  {schedules.map((sch) => (<option key={sch.id} value={sch.id}>{sch.name} ({sch.startTime} - {sch.endTime})</option>))}
                </select>
              </div>
              <Input label="Berlaku Dari *" type="date" value={assignData.effectiveFrom} onChange={(e) => setAssignData({ ...assignData, effectiveFrom: e.target.value })} />
              <Input label="Berlaku Sampai" type="date" value={assignData.effectiveTo} onChange={(e) => setAssignData({ ...assignData, effectiveTo: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Batal</Button>
              <Button variant="primary" onClick={handleAssign} disabled={submitting || !assignData.employeeId || !assignData.scheduleId}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
