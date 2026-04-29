import { AvailabilityRange, DateWindowOption, TripMember } from "@/lib/types";
import { daysBetween, isDateWithinRange } from "@/lib/utils";

export function computeDateWindowOptions(
  tentativeStart: string,
  tentativeEnd: string,
  members: TripMember[],
  ranges: AvailabilityRange[]
) {
  const totalMembers = members.length;
  if (!tentativeStart || !tentativeEnd || totalMembers === 0) {
    return [];
  }

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

  const windows: DateWindowOption[] = [];
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
      windows.push(current);
      return;
    }

    current.endDate = date;
  });

  return windows
    .sort((left, right) => {
      if (right.coverage !== left.coverage) {
        return right.coverage - left.coverage;
      }
      const leftLength = daysBetween(left.startDate, left.endDate).length;
      const rightLength = daysBetween(right.startDate, right.endDate).length;
      return rightLength - leftLength;
    })
    .slice(0, 4);
}
