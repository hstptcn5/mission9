import { useState, useEffect } from 'react'

const AVAILABLE_MODELS = [
  { id: 'chog', path: '/models/chog.glb', name: 'Mini Chog', preview: '/minichog.png' },
  { id: 'chog2', path: '/models/chog2.glb', name: 'Mushroom Chog', preview: '/mushroomchog.png' },
  { id: 'chog3', path: '/models/chog3.glb', name: 'Farm Chog', preview: '/farmchog.png' },
]

export default function ModelSelector({ onSelect }) {
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedAvatarModel') || AVAILABLE_MODELS[0].id
  })

  useEffect(() => {
    const savedModel = localStorage.getItem('selectedAvatarModel')
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])

  const handleSelect = (modelId) => {
    setSelectedModel(modelId)
    localStorage.setItem('selectedAvatarModel', modelId)
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
    if (model && onSelect) {
      onSelect(model.path)
    }
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-[#05012a] flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-black/80 via-purple-900/80 to-blue-900/80 text-white shadow-[0_30px_70px_rgba(8,4,40,0.75)] backdrop-blur-xl p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-indigo-100 drop-shadow-lg">
            Choose Your Avatar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = selectedModel === model.id
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                      : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                  }`}
                >
                  {/* Model Preview Image */}
                  <div className="aspect-square w-full rounded-lg bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center mb-4 border border-white/10 overflow-hidden">
                    <img 
                      src={model.preview} 
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-center text-indigo-100 mb-2">
                    {model.name}
                  </h3>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const model = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
                if (model && onSelect) {
                  onSelect(model.path)
                }
              }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 hover:scale-105"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


