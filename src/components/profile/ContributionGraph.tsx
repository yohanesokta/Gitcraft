import { useMemo } from 'react'
import { ForgejoHeatmapItem } from '../../types/forgejo'

export interface ContributionGraphProps {
  heatmapData?: ForgejoHeatmapItem[]
}

export function ContributionGraph({ heatmapData }: ContributionGraphProps) {
  const { days, totalContributions } = useMemo(() => {
    const contributionMap = new Map<string, number>()
    let total = 0

    if (heatmapData && Array.isArray(heatmapData)) {
      for (const item of heatmapData) {
        const dateStr = new Date(item.timestamp * 1000).toISOString().split('T')[0]
        const current = contributionMap.get(dateStr) || 0
        contributionMap.set(dateStr, current + item.contributions)
        total += item.contributions
      }
    }

    const today = new Date()
    const resultDays: { dateStr: string; count: number; level: number }[] = []

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = contributionMap.get(dateStr) || 0

      let level = 0
      if (count >= 8) level = 4
      else if (count >= 5) level = 3
      else if (count >= 3) level = 2
      else if (count >= 1) level = 1

      resultDays.push({ dateStr, count, level })
    }

    return { days: resultDays, totalContributions: total }
  }, [heatmapData])

  const weeks = useMemo(() => {
    const result: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  const levelColors = [
    'bg-canvas-subtle border border-border-default/60',
    'bg-success-fg/30 border border-success-fg/30',
    'bg-success-fg/55 border border-success-fg/55',
    'bg-success-fg/80 border border-success-fg/80',
    'bg-success-fg border border-success-fg',
  ]

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="border border-border-default rounded-lg p-4 bg-canvas-default space-y-3">
      <div className="flex items-center justify-between text-sm">
        <h2 className="font-semibold text-fg-default">
          {totalContributions.toLocaleString()} contributions in the last year
        </h2>
        <div className="text-xs text-fg-muted">
          Contribution settings
        </div>
      </div>

      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="min-w-[720px]">
          <div className="flex text-[10px] text-fg-muted mb-1.5 pl-6 justify-between pr-2">
            {months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          <div className="flex gap-1 items-start">
            <div className="flex flex-col gap-1 text-[9px] text-fg-muted pr-2 select-none h-[88px] justify-between">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      title={`${day.count} contributions on ${day.dateStr}`}
                      className={`w-[10px] h-[10px] rounded-[2px] transition-colors cursor-pointer ${
                        levelColors[day.level]
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-fg-muted pt-1 border-t border-border-default">
        <a
          href="https://docs.github.com/articles/why-are-my-contributions-not-showing-up-on-my-profile"
          target="_blank"
          rel="noreferrer"
          className="text-accent-fg hover:underline"
        >
          Learn how we count contributions
        </a>

        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {levelColors.map((colorClass, idx) => (
            <div
              key={idx}
              className={`w-[10px] h-[10px] rounded-[2px] ${colorClass}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
