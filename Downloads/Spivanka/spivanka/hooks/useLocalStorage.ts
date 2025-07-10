import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue] as const
}

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