// Функции для работы с localStorage без React хуков
// Используется в серверных компонентах и API роутах

export const setActiveGeneration = (taskId: string | null): void => {
  if (typeof window === 'undefined') return
  
  try {
    if (taskId) {
      localStorage.setItem('activeGeneration', taskId)
    } else {
      localStorage.removeItem('activeGeneration')
    }
  } catch (error) {
    console.error('Помилка збереження активної генерації:', error)
  }
}

export const getActiveGeneration = (): string | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const activeGeneration = localStorage.getItem('activeGeneration')
    return activeGeneration
  } catch (error) {
    console.error('Помилка отримання активної генерації:', error)
    return null
  }
}

export const clearActiveGeneration = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('activeGeneration')
  } catch (error) {
    console.error('Помилка очищення активної генерації:', error)
  }
} 