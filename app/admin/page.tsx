'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Download, Calendar, Clock, Users, CheckCircle, XCircle, LogOut, Image as ImageIcon, Filter, Eye, EyeOff, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Cabang {
  id: number
  nama: string
  password_admin: string
}

interface RiwayatAbsen {
  id: number
  nama_karyawan: string
  cabang_nama: string
  shift: string
  foto_url: string
  jarak_meter: number
  status_validasi: string
  waktu_absen: string
  status_telat: boolean
  menit_telat: number
  created_at: string
}

interface Perizinan {
  id: number
  nama_karyawan: string
  cabang_nama: string
  jenis_izin: string
  tanggal_mulai: string
  tanggal_selesai: string
  alasan: string
  status: string
  foto_bukti_url: string | null
  created_at: string
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [selectedCabang, setSelectedCabang] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [cabangList, setCabangList] = useState<Cabang[]>([])
  const [riwayatAbsen, setRiwayatAbsen] = useState<RiwayatAbsen[]>([])
  const [perizinanList, setPerizinanList] = useState<Perizinan[]>([])
  const [filteredData, setFilteredData] = useState<RiwayatAbsen[]>([])
  const [dateFilter, setDateFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [shiftFilter, setShiftFilter] = useState<'Semua' | 'Shift 1' | 'Shift 2' | 'Shift Mid'>('Semua')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'absensi' | 'perizinan'>('absensi')

  useEffect(() => {
    fetchCabang()
    const today = new Date().toISOString().split('T')[0]
    setDateFilter(today)
    
    // Restore login state from localStorage
    const savedLogin = localStorage.getItem('adminLogin')
    if (savedLogin) {
      const { isLoggedIn, isSuperAdmin, selectedCabang } = JSON.parse(savedLogin)
      setIsLoggedIn(isLoggedIn)
      setIsSuperAdmin(isSuperAdmin)
      setSelectedCabang(selectedCabang)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchRiwayatAbsen()
      fetchPerizinan()
    }
  }, [isLoggedIn, selectedCabang, isSuperAdmin])

  useEffect(() => {
    filterData()
  }, [riwayatAbsen, dateFilter, shiftFilter, periodFilter])

  const fetchCabang = async () => {
    try {
      const { data, error } = await supabase
        .from('cabang')
        .select('*')
      
      if (error) throw error
      setCabangList(data || [])
    } catch (error) {
      console.error('Error fetching cabang:', error)
    }
  }

  const fetchRiwayatAbsen = async () => {
    try {
      let query = supabase
        .from('riwayat_absen')
        .select('*')
        .order('created_at', { ascending: false })

      if (!isSuperAdmin && selectedCabang) {
        query = query.eq('cabang_id', selectedCabang)
      }

      const { data, error } = await query
      
      if (error) throw error
      setRiwayatAbsen(data || [])
    } catch (error) {
      console.error('Error fetching riwayat absen:', error)
      setMessage({ type: 'error', text: 'Gagal memuat data absensi' })
    }
  }

  const fetchPerizinan = async () => {
    try {
      let query = supabase
        .from('perizinan')
        .select('*')
        .order('created_at', { ascending: false })

      if (!isSuperAdmin && selectedCabang) {
        query = query.eq('cabang_id', selectedCabang)
      }

      const { data, error } = await query
      
      if (error) throw error
      setPerizinanList(data || [])
    } catch (error) {
      console.error('Error fetching perizinan:', error)
      setMessage({ type: 'error', text: 'Gagal memuat data perizinan' })
    }
  }

  const filterData = () => {
    let filtered = [...riwayatAbsen]
    
    if (periodFilter === 'daily' && dateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0]
        return itemDate === dateFilter
      })
    } else if (periodFilter === 'weekly' && dateFilter) {
      const filterDate = new Date(dateFilter)
      const weekStart = new Date(filterDate)
      weekStart.setDate(filterDate.getDate() - filterDate.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= weekStart && itemDate <= weekEnd
      })
    } else if (periodFilter === 'monthly' && dateFilter) {
      const filterDate = new Date(dateFilter)
      const monthStart = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1)
      const monthEnd = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0)
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= monthStart && itemDate <= monthEnd
      })
    }
    
    if (shiftFilter !== 'Semua') {
      filtered = filtered.filter(item => item.shift === shiftFilter)
    }
    
    setFilteredData(filtered)
  }

  const stats = useMemo(() => ({
    total: filteredData.length,
    valid: filteredData.filter(item => item.status_validasi === 'Valid').length,
    invalid: filteredData.filter(item => item.status_validasi === 'Invalid').length,
    late: filteredData.filter(item => item.status_telat).length
  }), [filteredData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (password === 'superadmin123') {
        setIsSuperAdmin(true)
        setIsLoggedIn(true)
        localStorage.setItem('adminLogin', JSON.stringify({ isLoggedIn: true, isSuperAdmin: true, selectedCabang: null }))
        setMessage({ type: 'success', text: 'Login sebagai Super Admin berhasil' })
        setPassword('')
        return
      }

      if (!selectedCabang) {
        setMessage({ type: 'error', text: 'Pilih cabang terlebih dahulu' })
        setIsLoading(false)
        return
      }

      const cabang = cabangList.find(c => c.id === selectedCabang)
      if (!cabang) {
        setMessage({ type: 'error', text: 'Cabang tidak ditemukan' })
        setIsLoading(false)
        return
      }

      if (password === cabang.password_admin) {
        setIsSuperAdmin(false)
        setIsLoggedIn(true)
        localStorage.setItem('adminLogin', JSON.stringify({ isLoggedIn: true, isSuperAdmin: false, selectedCabang }))
        setMessage({ type: 'success', text: `Login berhasil untuk ${cabang.nama}` })
        setPassword('')
      } else {
        setMessage({ type: 'error', text: 'Password salah' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat login' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setIsSuperAdmin(false)
    setSelectedCabang(null)
    setPassword('')
    setRiwayatAbsen([])
    setPerizinanList([])
    setActiveTab('absensi')
    setFilteredData([])
    setMessage(null)
    localStorage.removeItem('adminLogin')
  }

  const handleApproveIzin = async (id: number) => {
    try {
      console.log('Approving izin ID:', id)
      const { error } = await supabase
        .from('perizinan')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('Approve error:', error)
        throw error
      }
      console.log('Approve successful')
      setMessage({ type: 'success', text: 'Permohonan izin disetujui' })
      fetchPerizinan()
    } catch (error) {
      console.error('Approve catch error:', error)
      setMessage({ type: 'error', text: 'Gagal menyetujui permohonan' })
    }
  }

  const handleRejectIzin = async (id: number) => {
    try {
      console.log('Rejecting izin ID:', id)
      const { error } = await supabase
        .from('perizinan')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('Reject error:', error)
        throw error
      }
      console.log('Reject successful')
      setMessage({ type: 'success', text: 'Permohonan izin ditolak' })
      fetchPerizinan()
    } catch (error) {
      console.error('Reject catch error:', error)
      setMessage({ type: 'error', text: 'Gagal menolak permohonan' })
    }
  }

  const exportToExcel = () => {
    const worksheetData = filteredData.map(item => ({
      'Tanggal': new Date(item.created_at).toLocaleString('id-ID'),
      'Nama Karyawan': item.nama_karyawan,
      'Cabang': item.cabang_nama,
      'Shift': item.shift,
      'Jarak (meter)': item.jarak_meter,
      'Status Validasi': item.status_validasi,
      'Status Telat': item.status_telat ? 'Telat' : 'Tepat Waktu',
      'Menit Telat': item.menit_telat,
      'Foto URL': item.foto_url
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi')
    
    const periodLabel = periodFilter === 'daily' ? 'Harian' : periodFilter === 'weekly' ? 'Mingguan' : 'Bulanan'
    const fileName = `Laporan_Absensi_${periodLabel}_${dateFilter}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-amber-950 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTIgMi00IDJTNCAzMiA0IDM0czItNCAyLTRjMCAwIDIgMiA0IDJzMiAyIDIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Portal Admin</h1>
              <p className="text-amber-200/80 text-sm">Login untuk mengakses dashboard absensi</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
              {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Pilih Cabang</label>
                  <select
                    value={selectedCabang || ''}
                    onChange={(e) => setSelectedCabang(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                  >
                    <option value="" className="bg-gray-900">-- Pilih Cabang --</option>
                    {cabangList.map((cabang) => (
                      <option key={cabang.id} value={cabang.id} className="bg-gray-900">{cabang.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Password Admin</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                      placeholder="Masukkan password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-xl"
                >
                  {isLoading ? 'Memproses...' : 'Login'}
                </button>

                <div className="text-center pt-4">
                  <p className="text-white/50 text-xs">
                    Gunakan password <span className="text-amber-400 font-semibold">superadmin123</span> untuk akses semua cabang
                  </p>
                </div>
              </form>
            </div>

            <div className="mt-6 text-center">
              <a href="/" className="text-white/60 hover:text-white transition text-sm">
                ← Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-amber-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTIgMi00IDJTNCAzMiA0IDM0czItNCAyLTRjMCAwIDIgMiA0IDJzMiAyIDIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard Absensi</h1>
              <p className="text-amber-200/80 text-sm mt-1">
                {isSuperAdmin ? 'Super Admin - Semua Cabang' : cabangList.find(c => c.id === selectedCabang)?.nama}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('absensi')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                  activeTab === 'absensi'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Clock className="w-5 h-5" />
                Absensi
              </button>
              <button
                onClick={() => setActiveTab('perizinan')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                  activeTab === 'perizinan'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <FileText className="w-5 h-5" />
                Perizinan
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {message && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Stats Cards */}
            {activeTab === 'absensi' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <Users className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Hadir</p>
                      <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Lokasi Valid</p>
                      <p className="text-3xl font-bold text-white">{stats.valid}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Di Luar Radius</p>
                      <p className="text-3xl font-bold text-white">{stats.invalid}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-7 h-7 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Telat</p>
                      <p className="text-3xl font-bold text-white">{stats.late}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'perizinan' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Permohonan</p>
                      <p className="text-3xl font-bold text-white">{perizinanList.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-7 h-7 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Pending</p>
                      <p className="text-3xl font-bold text-white">{perizinanList.filter(p => p.status === 'Pending').length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Disetujui</p>
                      <p className="text-3xl font-bold text-white">{perizinanList.filter(p => p.status === 'Approved').length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Ditolak</p>
                      <p className="text-3xl font-bold text-white">{perizinanList.filter(p => p.status === 'Rejected').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Table */}
            {activeTab === 'absensi' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-white">
                    <Filter className="w-5 h-5" />
                    <span className="font-semibold">Filter:</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-white/60" />
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-white/60" />
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 outline-none"
                    >
                      <option value="daily" className="bg-gray-900">Harian</option>
                      <option value="weekly" className="bg-gray-900">Mingguan</option>
                      <option value="monthly" className="bg-gray-900">Bulanan</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-white/60" />
                    <select
                      value={shiftFilter}
                      onChange={(e) => setShiftFilter(e.target.value as 'Semua' | 'Shift 1' | 'Shift 2' | 'Shift Mid')}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 outline-none"
                    >
                      <option value="Semua" className="bg-gray-900">Semua Shift</option>
                      <option value="Shift 1" className="bg-gray-900">Shift 1</option>
                      <option value="Shift Mid" className="bg-gray-900">Shift Mid</option>
                      <option value="Shift 2" className="bg-gray-900">Shift 2</option>
                    </select>
                  </div>

                  <button
                    onClick={exportToExcel}
                    className="md:ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Export Excel
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Tanggal/Jam</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Nama</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Cabang</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Shift</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Status GPS</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Status Telat</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Foto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-white/50">
                            Tidak ada data absensi
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((item) => (
                          <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition">
                            <td className="py-4 px-4 text-white/70 text-sm">
                              {new Date(item.waktu_absen || item.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-white font-medium">{item.nama_karyawan}</td>
                            <td className="py-4 px-4 text-white/70">{item.cabang_nama}</td>
                            <td className="py-4 px-4 text-white/70">{item.shift}</td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                item.status_validasi === 'Valid' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {item.status_validasi === 'Valid' ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {item.jarak_meter.toFixed(0)}m
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {item.status_telat ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400">
                                  <Clock className="w-3 h-3" />
                                  {item.menit_telat}m
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  Tepat Waktu
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => setSelectedPhoto(item.foto_url)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
                              >
                                <ImageIcon className="w-5 h-5 text-white/70" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'perizinan' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Tanggal Request</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Nama</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Cabang</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Jenis Izin</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Periode</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Alasan</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Bukti</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Status</th>
                        <th className="text-left py-3 px-4 text-white/80 font-semibold text-sm">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perizinanList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-white/50">
                            Tidak ada permohonan izin
                          </td>
                        </tr>
                      ) : (
                        perizinanList.map((item) => (
                          <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition">
                            <td className="py-4 px-4 text-white/70 text-sm">
                              {new Date(item.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-white font-medium">{item.nama_karyawan}</td>
                            <td className="py-4 px-4 text-white/70">{item.cabang_nama}</td>
                            <td className="py-4 px-4 text-white/70">{item.jenis_izin}</td>
                            <td className="py-4 px-4 text-white/70 text-sm">
                              {new Date(item.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(item.tanggal_selesai).toLocaleDateString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-white/70 text-sm max-w-xs truncate">{item.alasan}</td>
                            <td className="py-4 px-4">
                              {item.foto_bukti_url ? (
                                <button
                                  onClick={() => setSelectedPhoto(item.foto_bukti_url)}
                                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
                                >
                                  <ImageIcon className="w-5 h-5 text-white/70" />
                                </button>
                              ) : (
                                <span className="text-white/50 text-sm">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                item.status === 'Approved' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : item.status === 'Rejected'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {item.status === 'Pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveIzin(item.id)}
                                    className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectIzin(item.id)}
                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition"
                                  >
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <img 
              src={selectedPhoto} 
              alt="Preview Foto" 
              className="max-w-full object-contain rounded-2xl"
              draggable={false}
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="fixed top-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition z-10"
            >
              <XCircle className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
