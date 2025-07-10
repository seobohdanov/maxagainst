export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white px-4">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Технические работы
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8">
            Мы улучшаем сервис для вас
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <p className="text-lg text-white/70 mb-8">
            Приложение временно недоступно из-за технических работ. 
            Мы скоро вернемся с улучшениями!
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-white/60">
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></span>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
            </div>
            
            <p className="text-sm text-white/50">
              Ожидаемое время: несколько минут
            </p>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm">
            По вопросам обращайтесь: support@spivanka.com
          </p>
        </div>
      </div>
    </div>
  )
} 