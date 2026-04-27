import { useState, useRef, useEffect } from 'react'
import { UploadCloud, FileText, Play, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react'

function App() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle, uploading, processing, done, error
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState([])
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else {
        alert('Please upload a valid CSV file.')
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUploadAndRun = async () => {
    if (!file) return
    setStatus('uploading')
    setLogs(prev => [...prev, 'Uploading CSV file...'])
    
    const formData = new FormData()
    formData.append('csvFile', file)

    try {
      const uploadRes = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadRes.ok) throw new Error('Upload failed')
      
      setStatus('processing')
      setLogs(prev => [...prev, 'File uploaded successfully. Starting AI generation...'])
      
      // Setup SSE for progress
      const eventSource = new EventSource('http://localhost:3001/api/generate')
      
      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data)
        
        if (data.type === 'log') {
          setLogs(prev => [...prev, data.message])
        } else if (data.type === 'progress') {
          setProgress(Math.round((data.current / data.total) * 100))
        } else if (data.type === 'result') {
          setResults(prev => [...prev, data.data])
        } else if (data.type === 'done') {
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
        console.error('EventSource failed:', err)
        setStatus('error')
        eventSource.close()
      }

    } catch (err) {
      console.error(err)
      setStatus('error')
      setLogs(prev => [...prev, `Error: ${err.message}`])
    }
  }

  const handleDownload = () => {
    window.open('http://localhost:3001/api/download', '_blank')
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12 text-center mt-8">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-medium text-sm mb-4 border border-blue-500/20">
          AI Outreach Engine V2
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Intelligent Cold Email Generation
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Upload your Apollo.io or LinkedIn CSV export. Our AI will analyze each prospect and generate hyper-personalized, plausible-deniability icebreakers.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            className={`glass p-8 text-center transition-all duration-300 ${
              isDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-slate-700/50 hover:border-slate-600'
            } ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv" 
              className="hidden" 
            />
            
            {file ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {status === 'idle' && (
                  <button 
                    onClick={() => setFile(null)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Remove file
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 cursor-pointer" onClick={() => fileInputRef.current.click()}>
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">Drag & drop your CSV here</p>
                  <p className="text-sm text-slate-500 mt-1">or click to browse files</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleUploadAndRun}
            disabled={!file || status !== 'idle'}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg ${
              !file || status !== 'idle'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/25 border border-blue-400/20 hover:-translate-y-1'
            }`}
          >
            {status === 'idle' ? (
              <>
                <Play className="w-5 h-5" />
                <span>Generate Icebreakers</span>
              </>
            ) : status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : status === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI Processing... {progress}%</span>
              </>
            ) : status === 'done' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400">Generation Complete</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">Error Occurred</span>
              </>
            )}
          </button>

          {status === 'done' && (
            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/20 hover:-translate-y-1"
            >
              <Download className="w-5 h-5" />
              <span>Download Enriched CSV</span>
            </button>
          )}

          {/* Progress Bar */}
          {(status === 'processing' || status === 'done') && (
            <div className="glass p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-300">Progress</span>
                <span className="text-sm font-bold text-blue-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Results & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6 min-h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-slate-200 border-b border-slate-700/50 pb-4 flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
              Live Processing Stream
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {results.length === 0 && status === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p>Upload a CSV to see live AI generations here.</p>
                </div>
              )}
              
              {results.map((res, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-medium">
                        {res.FirstName || res.first_name || 'Unknown'}
                      </div>
                      <span className="text-slate-500 text-sm">@</span>
                      <div className="text-emerald-400 text-sm font-medium">
                        {res.Company || res.organization_name || 'Unknown Co'}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed border-l-2 border-blue-500 pl-3 italic">
                    "{res.icebreaker_ai}"
                  </p>
                </div>
              ))}
              
              {status === 'processing' && (
                <div className="bg-slate-800/20 rounded-xl p-4 border border-slate-700/30 flex items-center justify-center space-x-3 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
            </div>
          </div>

          {/* System Logs */}
          <div className="glass p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-400">System Logs</h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">Terminal</span>
            </div>
            <div className="bg-darker rounded-lg p-4 font-mono text-xs text-slate-400 h-32 overflow-y-auto border border-slate-800">
              {logs.length === 0 ? (
                <span className="opacity-50">Waiting for engine start...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 opacity-80 hover:opacity-100">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
