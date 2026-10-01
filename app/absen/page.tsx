'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, MapPin, CheckCircle, XCircle, Loader2, User, Building2, Clock, RefreshCw, Shield } from 'lucide-react'
import * as faceapi from 'face-api.js'

interface Cabang {
  id: number
  nama: string
  latitude: number
  longitude: number
  radius_meter: number
  shift_1_start: string
  shift_1_end: string
  shift_2_start: string
  shift_2_end: string
  shift_mid_start: string
  shift_mid_end: string
}

export default function AbsenPage() {
  const [nama, setNama] = useState('')
  const [cabangList, setCabangList] = useState<Cabang[]>([])
  const [selectedCabang, setSelectedCabang] = useState<number | null>(null)
  const [shift, setShift] = useState<'Shift 1' | 'Shift 2' | 'Shift Mid'>('Shift 1')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isLocationValid, setIsLocationValid] = useState(false)
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchCabang()
    loadFaceApiModels()
    return () => {
      stopCamera()
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  const loadFaceApiModels = async () => {
    setIsLoadingModels(true)
    try {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      
      setModelsLoaded(true)
    } catch (error) {
      console.error('Error loading face-api models:', error)
      setMessage({ type: 'error', text: 'Gagal memuat model deteksi wajah' })
    } finally {
      setIsLoadingModels(false)
    }
  }

  const fetchCabang = async () => {
    try {
      console.log('Fetching cabang...')
      const { data, error } = await supabase
        .from('cabang')
        .select('*')
      
      if (error) {
        console.error('Error fetching cabang:', error)
        setMessage({ type: 'error', text: `Gagal memuat cabang: ${error.message}` })
        return
      }
      
      console.log('Cabang data:', data)
      setCabangList(data || [])
    } catch (err) {
      console.error('Fetch cabang error:', err)
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat memuat cabang' })
    }
  }

  const getCurrentLocation = () => {
    setIsLoadingLocation(true)
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Browser tidak mendukung geolocation' })
      setIsLoadingLocation(false)
      return
    }

    console.log('Requesting GPS location...')
    
    // Try with high accuracy first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        console.log('GPS location obtained:', { latitude, longitude, accuracy: position.coords.accuracy })
        setUserLocation({ lat: latitude, lng: longitude })
        setIsLoadingLocation(false)
      },
      (error) => {
        console.error('GPS error with high accuracy:', error)
        
        // Fallback: Try without high accuracy
        console.log('Retrying without high accuracy...')
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            console.log('GPS location obtained (fallback):', { latitude, longitude })
            setUserLocation({ lat: latitude, lng: longitude })
            setIsLoadingLocation(false)
          },
          (fallbackError) => {
            console.error('GPS error (fallback):', fallbackError)
            let errorMsg = 'Gagal mendapatkan lokasi GPS'
            switch(fallbackError.code) {
              case fallbackError.PERMISSION_DENIED:
                errorMsg = 'Izin GPS ditolak. Izinkan akses lokasi di browser.'
                break
              case fallbackError.POSITION_UNAVAILABLE:
                errorMsg = 'Lokasi GPS tidak tersedia. Pastikan GPS aktif di device.'
                break
              case fallbackError.TIMEOUT:
                errorMsg = 'Waktu habis untuk mendapatkan lokasi GPS. Coba lagi.'
                break
            }
            setMessage({ type: 'error', text: errorMsg })
            setIsLoadingLocation(false)
          },
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (userLocation && selectedCabang) {
      const cabang = cabangList.find(c => c.id === selectedCabang)
      if (cabang) {
        const dist = calculateDistance(
          userLocation.lat, userLocation.lng,
          cabang.latitude, cabang.longitude
        )
        setDistance(dist)
        setIsLocationValid(dist <= cabang.radius_meter)
      }
    }
  }, [userLocation, selectedCabang, cabangList])

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const calculateLateStatus = (cabang: Cabang, currentShift: string) => {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    let shiftStart: string
    switch (currentShift) {
      case 'Shift 1':
        shiftStart = cabang.shift_1_start
        break
      case 'Shift 2':
        shiftStart = cabang.shift_2_start
        break
      case 'Shift Mid':
        shiftStart = cabang.shift_mid_start
        break
      default:
        shiftStart = '08:00:00'
    }
    
    const [hours, minutes] = shiftStart.split(':').map(Number)
    const shiftStartMinutes = hours * 60 + minutes
    
    const isLate = currentTime > shiftStartMinutes
    const minutesLate = isLate ? currentTime - shiftStartMinutes : 0
    
    return { isLate, minutesLate }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraActive(true)
        
        if (modelsLoaded) {
          startFaceDetection()
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setMessage({ type: 'error', text: 'Gagal mengakses kamera' })
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsCameraActive(false)
    setIsFaceDetected(false)
  }

  const startFaceDetection = () => {
    if (!videoRef.current || !modelsLoaded) return

    const detect = async () => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) return

      try {
        const detections = await faceapi.detectAllFaces(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        )
        
        setIsFaceDetected(detections.length > 0)
      } catch (error) {
        console.error('Face detection error:', error)
      }
    }

    detect()
    detectionIntervalRef.current = setInterval(detect, 500)
  }

  const captureAndSubmit = async () => {
    if (!isLocationValid || !isFaceDetected || !selectedCabang || !nama) {
      setMessage({ type: 'error', text: 'Pastikan semua validasi terpenuhi' })
      return
    }

    setIsSubmitting(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) throw new Error('Kamera tidak tersedia')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context error')
      
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
      })

      const fileName = `absen_${Date.now()}_${nama.replace(/\s/g, '_')}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('foto-absen')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('foto-absen')
        .getPublicUrl(fileName)

      const cabang = cabangList.find(c => c.id === selectedCabang)!
      
      const { isLate, minutesLate } = calculateLateStatus(cabang, shift)
      const waktuAbsen = new Date().toISOString()
      
      const { error: insertError } = await supabase
        .from('riwayat_absen')
        .insert({
          nama_karyawan: nama,
          cabang_id: selectedCabang,
          cabang_nama: cabang.nama,
          shift: shift,
          foto_url: publicUrl,
          jarak_meter: distance,
          status_validasi: isLocationValid ? 'Valid' : 'Invalid',
          waktu_absen: waktuAbsen,
          status_telat: isLate,
          menit_telat: minutesLate,
          created_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      setMessage({ type: 'success', text: 'Absensi berhasil dicatat! Selamat bekerja! 🍽️' })
      setNama('')
      setSelectedCabang(null)
      setDistance(null)
      setIsLocationValid(false)
      setIsFaceDetected(false)
      stopCamera()
    } catch (error) {
      console.error('Error submitting attendance:', error)
      setMessage({ type: 'error', text: 'Gagal menyimpan absensi' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = nama && selectedCabang && isLocationValid && isFaceDetected && !isSubmitting

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-amber-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTIgMi00IDJTNCAzMiA0IDM0czItNCAyLTRjMCAwIDIgMiA0IDJzMiAyIDIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <a href="/" className="text-white/80 hover:text-white transition">
              ← Kembali
            </a>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Absensi Karyawan
            </h1>
            <div className="w-16"></div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl backdrop-blur border transition ${
                isLocationValid 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isLocationValid ? 'bg-green-500' : 'bg-white/10'
                  }`}>
                    <MapPin className={`w-5 h-5 ${isLocationValid ? 'text-white' : 'text-white/50'}`} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">GPS</p>
                    <p className={`text-sm font-semibold ${isLocationValid ? 'text-green-400' : 'text-white/80'}`}>
                      {isLocationValid ? 'Valid' : 'Belum'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl backdrop-blur border transition ${
                isFaceDetected 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isFaceDetected ? 'bg-green-500' : 'bg-white/10'
                  }`}>
                    <Shield className={`w-5 h-5 ${isFaceDetected ? 'text-white' : 'text-white/50'}`} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">Wajah</p>
                    <p className={`text-sm font-semibold ${isFaceDetected ? 'text-green-400' : 'text-white/80'}`}>
                      {isFaceDetected ? 'Terdeteksi' : 'Belum'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
              {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nama Karyawan
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                {/* Cabang */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Pilih Cabang
                  </label>
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

                {/* Shift */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Shift Kerja
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setShift('Shift 1')}
                      className={`py-3 px-4 rounded-xl font-semibold transition ${
                        shift === 'Shift 1' 
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Shift 1
                    </button>
                    <button
                      onClick={() => setShift('Shift Mid')}
                      className={`py-3 px-4 rounded-xl font-semibold transition ${
                        shift === 'Shift Mid' 
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Shift Mid
                    </button>
                    <button
                      onClick={() => setShift('Shift 2')}
                      className={`py-3 px-4 rounded-xl font-semibold transition ${
                        shift === 'Shift 2' 
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Shift 2
                    </button>
                  </div>
                </div>

                {/* GPS */}
                <div>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg"
                  >
                    {isLoadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    {isLoadingLocation ? 'Mendeteksi Lokasi...' : 'Dapatkan Lokasi GPS'}
                  </button>

                  {distance !== null && (
                    <div className={`mt-3 p-4 rounded-xl flex items-center gap-3 ${
                      isLocationValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {isLocationValid ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="text-sm font-medium">
                        {isLocationValid ? 'Lokasi Valid' : 'Di Luar Radius'} ({distance.toFixed(0)} meter)
                      </span>
                    </div>
                  )}
                </div>

                {/* Camera */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Foto Selfie
                  </label>
                  <div className="relative">
                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                          <p className="text-white/60 text-sm">Kamera belum aktif</p>
                        </div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <button
                      onClick={isCameraActive ? stopCamera : startCamera}
                      className="absolute bottom-4 right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition"
                    >
                      {isCameraActive ? <RefreshCw className="w-6 h-6 text-gray-800" /> : <Camera className="w-6 h-6 text-gray-800" />}
                    </button>
                  </div>

                  {isLoadingModels && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-500/20 text-blue-300 text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memuat model deteksi wajah...
                    </div>
                  )}

                  {isFaceDetected && (
                    <div className="mt-3 p-4 rounded-xl bg-green-500/20 text-green-300 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Wajah Terdeteksi ✓</span>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={captureAndSubmit}
                  disabled={!canSubmit}
                  className={`w-full py-4 px-6 font-bold text-white rounded-xl text-lg transition shadow-xl ${
                    canSubmit 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                      : 'bg-white/10 cursor-not-allowed text-white/50'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </span>
                  ) : (
                    'Ambil Foto & Absen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
