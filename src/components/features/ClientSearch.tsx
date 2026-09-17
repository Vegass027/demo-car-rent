// ============================================================
// FEATURE: CLIENT SEARCH
// Компонент поиска клиента с автозаполнением полей
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/retroui/Label'
import { useClientSearch } from '@/hooks/useClients'
import type { Client } from '@/types'

interface ClientSearchProps {
  // Текущее значение ФИО (для отображ и синхронизации)
  value: string
  // Callback при изменении ФИО
  onChange: (value: string) => void
  // Callback при выборе клиента из списка
  onSelectClient: (client: Client) => void
  // Placeholder для поля ввода
  placeholder?: string
  // Отключить поиск
  disabled?: boolean
  // ID для accessibility
  id?: string
  // Дополнитель className
  className?: string
}

export function ClientSearch({
  value,
  onChange,
  onSelectClient,
  placeholder = 'Поиск по ФИО или телефону...',
  disabled = false,
  id = 'client-search',
  className = '',
}: ClientSearchProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Поиск клиентов при изменении значения
  const { data: searchResults = [], isFetching } = useClientSearch(value)

  // Закры dropdown при клике вне компонента
    useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Обработка клавиатуры
  useEffect(() => {
    if (!isDropdownOpen || !searchResults.length) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setHighlightedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          event.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
            handleSelectClient(searchResults[highlightedIndex])
          }
          break
        case 'Escape':
          setIsDropdownOpen(false)
          inputRef.current?.blur()
          break
      }
    }

    const listener = (e: KeyboardEvent) => handleKeyDown(e)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [isDropdownOpen, searchResults, highlightedIndex])

  // Открыть dropdown при фокусе
  const handleFocus = () => {
    if (!disabled && value.length >= 2) {
      setIsDropdownOpen(true)
    }
  }

  // Обработка ввода
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    // Открываем dropdown при вводе 2+ символов
    if (newValue.length >= 2) {
      setIsDropdownOpen(true)
    }
  }

  // Выбор клиента
  const handleSelectClient = (client: Client) => {
    onChange(client.fullName)
    onSelectClient(client)
    setIsDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  // Форматирование телефона для отображения
  const formatPhone = (phone: string | null) => {
    if (!phone) return ''
    return phone
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Label htmlFor={id} className="sr-only">
        Поиск клиента
      </Label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        className="px-4 py-2 w-full rounded border-2 shadow-md transition focus:outline-hidden focus:shadow-xs text-foreground placeholder:text-muted-foreground bg-white"
      />

      {/* Dropdown с результатами поиска */}
      {isDropdownOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isFetching && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Поиск...
            </div>
          )}

          {!isFetching && searchResults.length === 0 && value.length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Клиент не найден. Введите данные нового клиента ниже.
            </div>
          )}

          {!isFetching && searchResults.map((client, index) => (
            <button
              key={client.id}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                index === highlightedIndex ? 'bg-muted/50' : ''
              }`}
              onClick={() => handleSelectClient(client)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="font-medium">{client.fullName}</div>
              {client.phone && (
                <div className="text-sm text-muted-foreground">
                  {formatPhone(client.phone)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
