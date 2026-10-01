'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, FileText, Upload, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface Cabang {
  id: number
  nama: string
}

export default function IzinPage() {
  const [nama, setNama] = useState('')
  const [cabangList, setCabangList] = useState<Cabang[]>([])
  const [selectedCabang, setSelectedCabang] = useState<number | null>(null)
  const [jenisIzin, setJenisIzin] = useState<'Cuti' | 'Sakit' | 'Izin' | 'Lainnya'>('Cuti')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [alasan, setAlasan] = useState('')
  const [fotoBukti, setFotoBukti] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchCabang()
  }, [])

  const fetchCabang = async () => {
    try {
      const { data, error } = await supabase.from('cabang').select('*')
      if (error) throw error
      setCabangList(data || [])
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat cabang' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nama || !selectedCabang || !tanggalMulai || !tanggalSelesai || !alasan) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi' })
      return
    }

    if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
      setMessage({ type: 'error', text: 'Tanggal mulai tidak boleh setelah tanggal selesai' })
      return
    }

    setIsLoading(true)

    try {
      const cabang = cabangList.find(c => c.id === selectedCabang)
      if (!cabang) throw new Error('Cabang tidak ditemukan')

      let fotoUrl = ''
      if (fotoBukti) {
        const fileName = `${Date.now()}_${fotoBukti.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('foto-absen')
          .upload(fileName, fotoBukti)
        
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('foto-absen')
          .getPublicUrl(fileName)
        
        fotoUrl = publicUrl
      }

      const { error } = await supabase.from('perizinan').insert({
        nama_karyawan: nama,
        cabang_id: selectedCabang,
        cabang_nama: cabang.nama,
        jenis_izin: jenisIzin,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: alasan,
        foto_bukti_url: fotoUrl || null,
        status: 'Pending'
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Permohonan izin berhasil dikirim' })
      
      // Reset form
      setNama('')
      setSelectedCabang(null)
      setJenisIzin('Cuti')
      setTanggalMulai('')
      setTanggalSelesai('')
      setAlasan('')
      setFotoBukti(null)
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal mengirim permohonan izin' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-amber-950">
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-6">
        {/* Header */}
        <header className="mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </a>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Permohonan Izin</h1>
          <p className="text-white/60">Ajukan cuti, sakit, atau izin lainnya</p>
        </header>

        {/* Form */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl">
            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nama */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Nama Karyawan</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              {/* Cabang */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Cabang</label>
                <select
                  value={selectedCabang || ''}
                  onChange={(e) => setSelectedCabang(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                  required
                >
                  <option value="" className="bg-gray-900">-- Pilih Cabang --</option>
                  {cabangList.map((cabang) => (
                    <option key={cabang.id} value={cabang.id} className="bg-gray-900">{cabang.nama}</option>
                  ))}
                </select>
              </div>

              {/* Jenis Izin */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Jenis Izin</label>
                <select
                  value={jenisIzin}
                  onChange={(e) => setJenisIzin(e.target.value as 'Cuti' | 'Sakit' | 'Izin' | 'Lainnya')}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                  required
                >
                  <option value="Cuti" className="bg-gray-900">Cuti</option>
                  <option value="Sakit" className="bg-gray-900">Sakit</option>
                  <option value="Izin" className="bg-gray-900">Izin</option>
                  <option value="Lainnya" className="bg-gray-900">Lainnya</option>
                </select>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Alasan</label>
                <textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition resize-none"
                  rows={4}
                  placeholder="Jelaskan alasan izin..."
                  required
                />
              </div>

              {/* Foto Bukti */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Foto Bukti (Opsional)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoBukti(e.target.files?.[0] || null)}
                    className="hidden"
                    id="foto-bukti"
                  />
                  <label
                    htmlFor="foto-bukti"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 border border-white/20 border-dashed rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    {fotoBukti ? fotoBukti.name : 'Upload foto bukti'}
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                {isLoading ? 'Mengirim...' : 'Kirim Permohonan'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
