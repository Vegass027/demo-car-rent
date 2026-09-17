// ============================================================
// PAGE: CARS (МАШИНЫ)
// Список всех машин с возможностью добавления новой
// ============================================================

import { useState } from 'react'
import { Car, Plus } from 'lucide-react'
import { Card } from '@/components/retroui/Card'
import { Button } from '@/components/retroui/Button'
import { CarCard, AddCarCard } from '@/components/features/CarCard'
import { AddCarModal } from '@/components/features/AddCarModal'
import { PageContainer } from '@/components/features/AppLayout'
import { useCarsWithStats } from '@/hooks/useCars'
import { Loader } from '@/components/retroui/Loader'

export function Cars() {
  const [addCarModalOpen, setAddCarModalOpen] = useState(false)
  
  // Получаем текущий год и месяц для статистики
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const { data: cars, isLoading } = useCarsWithStats(currentYear, currentMonth)

  const handleAddCar = () => {
    setAddCarModalOpen(true)
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      {/* Список машин */}
      {cars && cars.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(400px,1fr))] items-start">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
            />
          ))}
          <AddCarCard onClick={handleAddCar} />
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Нет добавленных машин</p>
          <Button onClick={handleAddCar} className="flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            <span>Добавить первую машину</span>
          </Button>
        </Card>
      )}

      {/* Модальное окно добавления машины */}
      <AddCarModal
        open={addCarModalOpen}
        onOpenChange={setAddCarModalOpen}
        onSuccess={() => {
          setAddCarModalOpen(false)
        }}
      />
    </PageContainer>
  )
}
