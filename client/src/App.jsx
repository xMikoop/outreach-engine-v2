import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, FileText, Play, CheckCircle2, AlertCircle, Loader2, Download, Terminal, Activity, Clock } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const GrainOverlay = () => (
  <svg className="grain-overlay" xmlns="http://www.w3.org/2000/svg">
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
  </svg>
)

const MagneticButton = ({ children, className, onClick, disabled }) => {
  const buttonRef = useRef(null)
  
  const handleMouseMove = (e) => {
    if (disabled) return
    const { clientX, clientY } = e
    const { width, height, left, top } = buttonRef.current.getBoundingClientRect()
    const x = clientX - (left + width / 2)
    const y = clientY - (top + height / 2)
    gsap.to(buttonRef.current, {
      x: x * 0.3,
      y: y * 0.3,
      duration: 0.1,
      ease: "power2.out"
    })
  }

  const handleMouseLeave = () => {
    if (disabled) return
    gsap.to(buttonRef.current, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)"
    })
  }

  return (
    <button 
      ref={buttonRef}
      className={`magnetic-btn ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function App() {
  const containerRef = useRef(null)

  // -- OUTREACH ENGINE STATE --
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle, uploading, processing, done, error
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState([])
  const fileInputRef = useRef(null)

  // -- OUTREACH ENGINE LOGIC --
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else alert('Please upload a valid CSV file.')
    }
  }
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0])
  }

  const handleUploadAndRun = async () => {
    if (!file) return
    setStatus('uploading')
    setLogs(prev => [...prev, 'Uploading CSV file...'])
    const formData = new FormData()
    formData.append('csvFile', file)
    try {
      const uploadRes = await fetch('http://localhost:3001/api/upload', {
        method: 'POST', body: formData
      })
      if (!uploadRes.ok) throw new Error('Upload failed')
      setStatus('processing')
      setLogs(prev => [...prev, 'File uploaded successfully. Starting AI generation...'])
      
      const eventSource = new EventSource('http://localhost:3001/api/generate')
      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.type === 'log') setLogs(prev => [...prev, data.message])
        else if (data.type === 'progress') setProgress(Math.round((data.current / data.total) * 100))
        else if (data.type === 'result') setResults(prev => [...prev, data.data])
        else if (data.type === 'done') {
          setStatus('done')
          setLogs(prev => [...prev, '✅ All leads processed successfully!'])
          eventSource.close()
        } else if (data.type === 'error') {
          setStatus('error')
          setLogs(prev => [...prev, `❌ Error: ${data.message}`])
          eventSource.close()
        }
      }
      eventSource.onerror = (err) => {
        setStatus('error')
        eventSource.close()
      }
    } catch (err) {
      setStatus('error')
      setLogs(prev => [...prev, `Error: ${err.message}`])
    }
  }

  const handleDownload = () => window.open('http://localhost:3001/api/download', '_blank')

  // -- GSAP ANIMATIONS --
  useGSAP(() => {
    // Reveal animations
    const revealElements = document.querySelectorAll('.reveal')
    revealElements.forEach((el) => {
      gsap.fromTo(el, 
        { y: 100, rotateX: -20, opacity: 0 },
        {
          y: 0, rotateX: 0, opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      )
    })

    // Navbar scroll interaction
    const navBar = document.querySelector('.celestial-anchor')
    const navContent = document.querySelector('.nav-content')
    ScrollTrigger.create({
      start: "top -80",
      onUpdate: (self) => {
        if (self.direction === 1) { // scrolling down
          gsap.to(navBar, { width: "80px", borderRadius: "4rem", duration: 0.5, ease: "power2.out" })
          gsap.to(navContent, { opacity: 0, duration: 0.2 })
        } else {
          gsap.to(navBar, { width: "100%", borderRadius: "0", duration: 0.5, ease: "power2.out" })
          gsap.to(navContent, { opacity: 1, duration: 0.2, delay: 0.2 })
        }
      }
    })

    // Ascension Steps Pinning
    const steps = document.querySelectorAll('.ascension-card')
    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: "top 20%",
        end: "bottom top",
        pin: true,
        pinSpacing: false,
        animation: gsap.to(step, { scale: 0.95 - (i * 0.02), opacity: 0.8 }),
        scrub: true
      })
    })

    // Wave EKG interact
    const wave = document.querySelector('.pulse-wave')
    window.addEventListener('mousemove', (e) => {
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY)
      if (wave && speed > 0) {
        gsap.to(wave, {
          attr: { "stroke-width": 0.5 + (speed * 0.01) },
          y: speed * 0.1,
          duration: 0.5,
          ease: "power2.out"
        })
      }
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="bg-background text-primary min-h-screen overflow-x-hidden selection:bg-primary selection:text-background">
      <GrainOverlay />

      {/* THE CELESTIAL ANCHOR */}
      <nav className="celestial-anchor fixed top-0 left-1/2 -translate-x-1/2 w-full h-20 glass z-50 flex items-center justify-center transition-all duration-300 group hover:!w-full hover:!rounded-none border-t-0 border-x-0">
        <div className="nav-content flex items-center justify-between w-full max-w-7xl px-8 opacity-100 group-hover:!opacity-100 transition-opacity">
          <div className="font-heading font-extrabold text-2xl tracking-tighter uppercase text-primary">AI dupa</div>
          <div className="hidden md:flex gap-8 font-data text-sm font-semibold tracking-widest text-primary/70">
            <a href="#features" className="hover:text-pulse transition-colors">PILLARS</a>
            <a href="#manifesto" className="hover:text-pulse transition-colors">TRUTH</a>
            <a href="#protocol" className="hover:text-pulse transition-colors">PROTOCOL</a>
          </div>
          <MagneticButton className="bg-primary text-background px-6 py-2 rounded-relic font-heading font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(58,12,163,0.3)] hover:shadow-[0_0_30px_rgba(76,201,240,0.6)] hover:bg-pulse transition-colors">
            Initialize neural link
          </MagneticButton>
        </div>
      </nav>

      {/* THE HORIZON EVENT */}
      <section className="relative h-screen flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply pointer-events-none" />
        <img 
          src="https://images.unsplash.com/photo-1554188248-986adbb73be4?q=80&w=2500&auto=format&fit=crop" 
          alt="Classical Glitch" 
          className="absolute inset-0 w-full h-full object-cover filter contrast-[1.2] brightness-75 blur-[2px] scale-105 transform-gpu"
        />
        <div className="relative z-20 text-center w-full max-w-7xl px-4 mt-20">
          <p className="font-drama text-4xl md:text-5xl lg:text-6xl text-accent mb-[-1rem] md:mb-[-2rem] text-shadow-xl z-30 relative ml-[-20%] italic font-light reveal">
            Classical noun meets
          </p>
          <h1 className="font-heading text-7xl md:text-[10rem] font-extrabold text-background leading-none tracking-tighter mix-blend-overlay drop-shadow-2xl reveal w-[120%] ml-[-10%] whitespace-nowrap">
            GLITCHED FUTURE.
          </h1>
        </div>
      </section>

      {/* THE KINETIC ARTIFACTS */}
      <section id="features" className="py-32 px-4 max-w-7xl mx-auto space-y-32">
        <div className="text-center mb-24 reveal">
          <h2 className="font-drama text-3xl text-accent mb-4 italic">The Kinetic Artifacts</h2>
          <div className="h-px w-32 bg-primary/30 mx-auto" />
        </div>

        {/* Feature 1: The Pulse Chamber */}
        <div className="grid md:grid-cols-2 gap-12 items-center reveal glass p-12 rounded-relic">
          <div>
            <div className="w-12 h-12 bg-pulse/20 rounded-full flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-pulse" />
            </div>
            <h3 className="font-heading text-4xl font-bold mb-4">Real-Time Analysis</h3>
            <p className="font-data text-primary/70 leading-relaxed text-sm">
              Every data point injected into the system causes a resonant ripple. The Pulse Chamber reads the emotional velocity of your prospects and adjusts the hyper-personalized delivery vectors automatically.
            </p>
          </div>
          <div className="h-64 bg-darker rounded-relic flex items-center justify-center overflow-hidden border border-primary/20 relative">
             <svg className="w-full h-32 text-pulse opacity-50" viewBox="0 0 100 20" preserveAspectRatio="none">
               <path className="pulse-wave" d="M0,10 L20,10 L25,5 L30,15 L35,10 L100,10" fill="none" stroke="currentColor" strokeWidth="0.5" />
             </svg>
             <div className="absolute inset-0 bg-gradient-to-r from-darker via-transparent to-darker" />
          </div>
        </div>

        {/* Feature 2: The Obsidian Terminal (The actual tool) */}
        <div className="reveal glass p-8 md:p-12 rounded-relic border border-primary/30 shadow-[0_0_50px_rgba(58,12,163,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-12">
            <Terminal className="w-8 h-8 text-primary" />
            <h3 className="font-heading text-4xl font-bold">The Obsidian Terminal</h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {/* Upload Area */}
            <div className="lg:col-span-1 space-y-6">
              <div 
                className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all duration-300 ${
                  isDragging ? 'border-pulse bg-pulse/5 scale-105' : 'border-primary/20 hover:border-primary/50'
                } ${file ? 'border-accent bg-accent/5' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                
                {file ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-accent" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-primary truncate max-w-[200px]">{file.name}</p>
                      <p className="font-data text-xs text-primary/60 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {status === 'idle' && (
                      <button onClick={() => setFile(null)} className="font-data text-xs text-red-500 hover:text-red-600 transition-colors cursor-pointer relative z-20">
                        [ DESTROY FILE ]
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 cursor-pointer relative z-20" onClick={() => fileInputRef.current.click()}>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-primary">Manifest CSV Data</p>
                      <p className="font-data text-xs text-primary/50 mt-1">Drag to synthesize</p>
                    </div>
                  </div>
                )}
              </div>

              <MagneticButton
                onClick={handleUploadAndRun}
                disabled={!file || status !== 'idle'}
                className={`w-full py-4 rounded-[2rem] font-heading font-bold uppercase tracking-wider text-sm flex items-center justify-center space-x-2 transition-all duration-300 ${
                  !file || status !== 'idle'
                    ? 'bg-primary/10 text-primary/40 cursor-not-allowed'
                    : 'bg-primary hover:bg-pulse text-background shadow-[0_0_20px_rgba(58,12,163,0.3)]'
                }`}
              >
                {status === 'idle' && <><Play className="w-4 h-4" /><span>Synthesize Leads</span></>}
                {status === 'uploading' && <><Loader2 className="w-4 h-4 animate-spin" /><span>Uplinking...</span></>}
                {status === 'processing' && <><Loader2 className="w-4 h-4 animate-spin" /><span>Neural Mapping... {progress}%</span></>}
                {status === 'done' && <><CheckCircle2 className="w-4 h-4 text-accent" /><span>Synthesis Complete</span></>}
                {status === 'error' && <><AlertCircle className="w-4 h-4 text-red-500" /><span>Anomalous Error</span></>}
              </MagneticButton>

              {status === 'done' && (
                <MagneticButton
                  onClick={handleDownload}
                  className="w-full py-4 rounded-[2rem] font-heading font-bold uppercase tracking-wider text-sm flex items-center justify-center space-x-2 bg-accent hover:bg-accent/80 text-background shadow-[0_0_20px_rgba(247,183,49,0.3)]"
                >
                  <Download className="w-4 h-4" /><span>Extract Relic</span>
                </MagneticButton>
              )}
            </div>

            {/* Live Feed */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0f172a] rounded-[2rem] p-6 h-[400px] flex flex-col shadow-inner border border-primary/20">
                <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-4">
                  <h4 className="font-heading font-bold text-pulse flex items-center">
                    <div className="w-2 h-2 rounded-full bg-pulse mr-3 animate-pulse"></div>
                    Neural Log Stream
                  </h4>
                  <span className="font-data text-xs text-primary/50 bg-primary/10 px-2 py-1 rounded">SYS_OUT</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-data text-sm">
                  {results.length === 0 && status === 'idle' && (
                    <div className="h-full flex flex-col items-center justify-center text-primary/30">
                      <Terminal className="w-12 h-12 mb-4 opacity-50" />
                      <p>Awaiting data injection...</p>
                    </div>
                  )}
                  
                  {results.map((res, i) => (
                    <div key={i} className="bg-primary/5 rounded-xl p-4 border border-primary/10 hover:border-pulse/50 transition-colors">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-accent">{'>>'}</span>
                        <span className="text-primary/70">{res.FirstName || res.first_name || 'Unknown'} @</span>
                        <span className="text-pulse font-bold">{res.Company || res.organization_name || 'Unknown Co'}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed pl-6 border-l w-full border-primary/30">
                        {res.icebreaker_ai}
                      </p>
                    </div>
                  ))}
                  
                  {status === 'processing' && (
                    <div className="flex items-center space-x-3 text-pulse/70 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Alchemical engines burning...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: The Chronos Wheel */}
        <div className="grid md:grid-cols-2 gap-12 items-center reveal glass p-12 rounded-relic text-right">
          <div className="order-2 md:order-1 h-64 bg-darker rounded-relic flex items-center justify-center relative overflow-hidden border border-primary/20">
            <div className="w-32 h-32 rounded-full border-4 border-dashed border-accent/50 animate-[spin_10s_linear_infinite]" />
            <div className="absolute w-24 h-24 rounded-full border-4 border-solid border-pulse/50 animate-[spin_5s_linear_infinite_reverse]" />
            <Clock className="w-8 h-8 text-primary absolute z-10" />
          </div>
          <div className="order-1 md:order-2">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-6 ml-auto">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-heading text-4xl font-bold mb-4">Glitched Future</h3>
            <p className="font-data text-primary/70 leading-relaxed text-sm">
              We do not predict the future; we write it. The Chronos Wheel bends time, allowing you to preview the success of your campaigns before they are even launched. A reality warp for your sales pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* THE VOID MANIFESTO */}
      <section id="manifesto" className="relative py-48 overflow-hidden bg-primary text-background">
        <div className="absolute inset-0 opacity-20 filter contrast-150 brightness-50 mix-blend-overlay pointer-events-none">
           <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Void" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center reveal">
          <p className="font-drama text-4xl md:text-6xl leading-tight mb-8">
            "Sharp edges are for primitive minds. The web is too clean; we need texture."
          </p>
          <div className="font-data text-pulse tracking-[0.2em] uppercase text-sm font-bold">
            — The Architect's Codex
          </div>
        </div>
      </section>

      {/* THE ASCENSION STEPS */}
      <section id="protocol" className="py-32 px-4 max-w-3xl mx-auto relative">
        <div className="text-center mb-24 reveal">
          <h2 className="font-heading text-5xl font-bold mb-4">The Protocol</h2>
          <p className="font-drama text-xl text-accent italic">Ascend the logical hierarchy.</p>
        </div>

        <div className="space-y-32 pb-32">
          {[
            { step: '01', title: 'Data Upload', desc: 'Inject your raw CSV data into the Obsidian Terminal.' },
            { step: '02', title: 'Neural Synthesis', desc: 'Our algorithms dismantle and reconstruct each prospect.' },
            { step: '03', title: 'Manifestation', desc: 'Extract the relic. Your hyper-personalized icebreakers are ready.' }
          ].map((item, i) => (
            <div key={i} className="ascension-card glass p-12 rounded-[4rem] flex flex-col items-center text-center shadow-2xl border-t border-primary/30 relative bg-background">
              <span className="font-data text-6xl font-bold text-pulse/20 absolute -top-8 left-12">{item.step}</span>
              <h3 className="font-heading text-3xl font-bold mb-4 mt-8">{item.title}</h3>
              <p className="font-data text-primary/70">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center border-t border-primary/10 font-data text-sm text-primary/50 bg-darker">
        <p>INITIATING NEURAL LINK... [OK]</p>
        <p className="mt-2 text-pulse">© 2026 AI dupa. The Reality Architect.</p>
      </footer>
    </div>
  )
}

export default App
