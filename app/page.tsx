'use client'

import { useState } from 'react'
import { Utensils, Clock, Shield, ArrowRight, FileText } from 'lucide-react'

export default function Home() {
  const [logoClicks, setLogoClicks] = useState(0)

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1
      if (newCount >= 8) {
        window.location.href = '/admin'
        return 0
      }
      return newCount
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-amber-950">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div 
            className="flex items-center justify-center gap-3 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <Utensils className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Restoran<span className="text-amber-400">Kita</span>
              </h1>
              <p className="text-amber-200/80 text-sm">Sistem Absensi Digital</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6">
            {/* Welcome Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Selamat Datang
              </h2>
              <p className="text-amber-200/80 text-lg mb-8">
                Sistem absensi karyawan dengan validasi GPS & deteksi wajah
              </p>

              {/* Action Cards */}
              <div className="space-y-4">
                <a
                  href="/absen"
                  className="group flex items-center justify-between p-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Absensi Karyawan</h3>
                      <p className="text-red-200 text-xs">Catat kehadiran Anda</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="/izin"
                  className="group flex items-center justify-between p-5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Permohonan Izin</h3>
                      <p className="text-amber-200 text-xs">Ajukan cuti atau izin</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-green-400" />
                </div>
                <h4 className="text-white font-semibold mb-1">Real-Time</h4>
                <p className="text-gray-400 text-xs">Validasi GPS instan</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-white font-semibold mb-1">Aman</h4>
                <p className="text-gray-400 text-xs">Deteksi wajah AI</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-white/40 text-sm">
            © 2024 RestoranKita. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}
