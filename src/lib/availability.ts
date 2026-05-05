import { AvailabilityRange, DateWindowOption, TripMember } from "@/lib/types";
import { daysBetween, isDateWithinRange } from "@/lib/utils";

export function computeDateWindowOptions(
  tentativeStart: string,
  tentativeEnd: string,
  members: TripMember[],
  ranges: AvailabilityRange[],
  tripDuration?: number
) {
  const totalMembers = members.length;
  if (!tentativeStart || !tentativeEnd || totalMembers === 0) {
    return [];
  }

  const minDays = tripDuration && tripDuration > 0 ? tripDuration : 1;

  const coverageByDate = daysBetween(tentativeStart, tentativeEnd).map((date) => {
    const coverage = members.reduce((count, member) => {
      const memberHasDate = ranges.some(
        (range) =>
          range.profileId === member.profileId &&
          isDateWithinRange(date, range.startDate, range.endDate)
      );
      return memberHasDate ? count + 1 : count;
    }, 0);

    return { date, coverage };
  });

  // Build contiguous windows where coverage > 0
  // Adjacent days with the same coverage are grouped together
  const rawWindows: DateWindowOption[] = [];
  let current: DateWindowOption | null = null;

  coverageByDate.forEach(({ date, coverage }) => {
    if (coverage === 0) {
      current = null;
      return;
    }

    if (!current || current.coverage !== coverage) {
      current = {
        id: `${date}_${coverage}`,
        startDate: date,
        endDate: date,
        coverage
      };
      rawWindows.push(current);
      return;
    }

    current.endDate = date;
  });

  // Merge adjacent windows into longer stretches using minimum coverage
  // This finds the best contiguous runs of at least minDays where everyone overlaps
  const mergedWindows: DateWindowOption[] = [];

  if (minDays > 1) {
    // Sliding window approach: find all contiguous runs of coverage > 0
    // that are at least minDays long, using the minimum coverage in the run
    const datesWithCoverage = coverageByDate.filter((d) => d.coverage > 0);

    // Group into contiguous runs (consecutive calendar days)
    const runs: { dates: { date: string; coverage: number }[] }[] = [];
    let currentRun: { date: string; coverage: number }[] = [];

    for (let i = 0; i < datesWithCoverage.length; i++) {
      if (currentRun.length === 0) {
        currentRun.push(datesWithCoverage[i]);
      } else {
        const prevDate = new Date(currentRun[currentRun.length - 1].date + "T00:00:00");
        const thisDate = new Date(datesWithCoverage[i].date + "T00:00:00");
        const diffDays = (thisDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          currentRun.push(datesWithCoverage[i]);
        } else {
          runs.push({ dates: currentRun });
          currentRun = [datesWithCoverage[i]];
        }
      }
    }
    if (currentRun.length > 0) {
      runs.push({ dates: currentRun });
    }

    // For each run, find the best window of exactly minDays length
    for (const run of runs) {
      if (run.dates.length < minDays) {
        continue;
      }

      // Slide a window of minDays across this run
      let bestWindow: { startIdx: number; minCoverage: number } | null = null;

      for (let i = 0; i <= run.dates.length - minDays; i++) {
        let minCov = Infinity;
        for (let j = i; j < i + minDays; j++) {
          minCov = Math.min(minCov, run.dates[j].coverage);
        }
        if (!bestWindow || minCov > bestWindow.minCoverage) {
          bestWindow = { startIdx: i, minCoverage: minCov };
        }
      }

      if (bestWindow && bestWindow.minCoverage > 0) {
        const start = run.dates[bestWindow.startIdx].date;
        const end = run.dates[bestWindow.startIdx + minDays - 1].date;
        mergedWindows.push({
          id: `${start}_${bestWindow.minCoverage}`,
          startDate: start,
          endDate: end,
          coverage: bestWindow.minCoverage
        });

        // Also find second-best non-overlapping window in same run if possible
        for (let i = 0; i <= run.dates.length - minDays; i++) {
          const windowStart = run.dates[i].date;
          const windowEnd = run.dates[i + minDays - 1].date;

          // Skip if overlaps with best window
          if (windowStart <= end && windowEnd >= start) {
            continue;
          }

          let minCov = Infinity;
          for (let j = i; j < i + minDays; j++) {
            minCov = Math.min(minCov, run.dates[j].coverage);
          }

          if (minCov > 0) {
            mergedWindows.push({
              id: `${windowStart}_${minCov}`,
              startDate: windowStart,
              endDate: windowEnd,
              coverage: minCov
            });
            break;
          }
        }
      }
    }
  }

  // Use merged windows if tripDuration is specified, otherwise raw windows
  const candidates = minDays > 1 ? mergedWindows : rawWindows;

  return candidates
    .sort((left, right) => {
      if (right.coverage !== left.coverage) {
        return right.coverage - left.coverage;
      }
      const leftLength = daysBetween(left.startDate, left.endDate).length;
      const rightLength = daysBetween(right.startDate, right.endDate).length;
      return rightLength - leftLength;
    })
    .slice(0, 6);
}
