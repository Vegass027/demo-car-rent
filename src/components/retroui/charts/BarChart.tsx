import { cn } from "@/lib/utils"
import React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  index: string
  categories: string[]
  categoryLabels?: Record<string, string>
  indexLabel?: string
  strokeColors?: string[]
  fillColors?: string[]
  tooltipBgColor?: string
  tooltipBorderColor?: string
  gridColor?: string
  valueFormatter?: (value: number) => string
  showGrid?: boolean
  showTooltip?: boolean
  stacked?: boolean
  alignment?: "vertical" | "horizontal"
  barSize?: number
  barRadius?: number
  className?: string
}

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      data = [],
      index,
      categories = [],
      categoryLabels,
      indexLabel,
      strokeColors = ["var(--foreground)"],
      fillColors = ["var(--primary)", "var(--secondary)"],
      tooltipBgColor = "var(--background)",
      tooltipBorderColor = "var(--border)",
      gridColor = "var(--muted)",
      valueFormatter = (value: number) => value.toString(),
      showGrid = true,
      showTooltip = true,
      stacked = false,
      alignment = "vertical",
      barSize,
      barRadius = 8,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("h-80 w-full", className)} {...props}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            layout={alignment === "horizontal" ? "vertical" : undefined}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
            barCategoryGap="20%"
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            )}

            {alignment === "horizontal" ? (
              <>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={valueFormatter}
                />

                <YAxis
                  type="category"
                  dataKey={index}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={index}
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={valueFormatter}
                />
              </>
            )}

            {showTooltip && (
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null

                  return (
                    <div
                      className="border p-2 shadow"
                      style={{
                        backgroundColor: tooltipBgColor,
                        borderColor: tooltipBorderColor
                      }}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {indexLabel || index}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {categoryLabels?.[String(entry.dataKey)] || entry.dataKey}
                            </span>
                            <span className="font-bold" style={{ color: strokeColors[0] }}>
                              {valueFormatter(entry.value as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }}
              />
            )}

            {categories.map((category, index) => {
              const fillColor = fillColors[index] || fillColors[0]
              const strokeColor = strokeColors[index] || strokeColors[0]

              return (
                <Bar
                  key={category}
                  dataKey={category}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1}
                  radius={alignment === "horizontal" ? [0, barRadius, barRadius, 0] : [barRadius, barRadius, 0, 0]}
                  stackId={stacked ? "strokeId" : undefined}
                >
                  {/* Поддержка разных цветов для каждого бара */}
                  {data.map((entry, entryIndex) => (
                    <Cell
                      key={`cell-${entryIndex}`}
                      fill={entry.color || fillColor}
                      stroke={entry.color || strokeColor}
                    />
                  ))}
                </Bar>
              )
            })}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    )
  }
)

BarChart.displayName = "BarChart"

export { BarChart, type BarChartProps }