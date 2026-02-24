/**
 * Calcula la cobertura de un equipo basándose en los horarios de sus miembros.
 * 
 * Para cada día de la semana, determina:
 * - Si hay al menos un miembro trabajando ese día
 * - El rango horario mínimo (min startTime) y máximo (max endTime) de los miembros que trabajan
 */

interface MemberSchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
}

interface DayCoverage {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
}

const DAY_NAMES = [
  { dayOfWeek: 0, name: "Domingo", short: "Dom" },
  { dayOfWeek: 1, name: "Lunes", short: "Lun" },
  { dayOfWeek: 2, name: "Martes", short: "Mar" },
  { dayOfWeek: 3, name: "Miércoles", short: "Mié" },
  { dayOfWeek: 4, name: "Jueves", short: "Jue" },
  { dayOfWeek: 5, name: "Viernes", short: "Vie" },
  { dayOfWeek: 6, name: "Sábado", short: "Sáb" },
];

/**
 * Calcula la cobertura del equipo para cada día de la semana.
 */
export function computeTeamCoverage(
  membersSchedules: Array<Array<MemberSchedule>>
): DayCoverage[] {
  const coverage: DayCoverage[] = [];

  // Para cada día de la semana (0-6)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayName = DAY_NAMES.find((d) => d.dayOfWeek === dayOfWeek);
    
    // Recopilar todos los horarios de miembros que trabajan este día
    const workingSchedules: Array<{ startTime: string; endTime: string }> = [];

    for (const memberSchedule of membersSchedules) {
      const daySchedule = memberSchedule.find((s) => s.dayOfWeek === dayOfWeek);
      
      if (daySchedule?.isWorking && daySchedule.startTime && daySchedule.endTime) {
        workingSchedules.push({
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
        });
      }
    }

    if (workingSchedules.length === 0) {
      // No hay miembros trabajando este día
      coverage.push({
        dayOfWeek,
        dayName: dayName?.name || "",
        isAvailable: false,
        startTime: null,
        endTime: null,
      });
    } else {
      // Calcular min startTime y max endTime
      const startTimes = workingSchedules.map((s) => s.startTime).sort();
      const endTimes = workingSchedules.map((s) => s.endTime).sort();
      
      coverage.push({
        dayOfWeek,
        dayName: dayName?.name || "",
        isAvailable: true,
        startTime: startTimes[0], // Min startTime
        endTime: endTimes[endTimes.length - 1], // Max endTime
      });
    }
  }

  return coverage;
}

/**
 * Formatea un rango horario para mostrar.
 */
export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return "No disponible";
  
  // Formato simple: "HH:mm - HH:mm" (24 horas)
  return `${startTime} - ${endTime}`;
}

/**
 * Compacta días consecutivos con el mismo rango horario.
 * Retorna un array de objetos con { days, startTime, endTime }
 */
export function compactCoverage(coverage: DayCoverage[]): Array<{
  days: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
}> {
  const result: Array<{
    days: string;
    startTime: string | null;
    endTime: string | null;
    isAvailable: boolean;
  }> = [];

  let currentGroup: {
    startDay: number;
    endDay: number;
    startTime: string | null;
    endTime: string | null;
    isAvailable: boolean;
  } | null = null;

  for (let i = 0; i < coverage.length; i++) {
    const day = coverage[i];
    const key = `${day.startTime || "none"}-${day.endTime || "none"}-${day.isAvailable}`;

    if (!currentGroup) {
      // Iniciar nuevo grupo
      currentGroup = {
        startDay: i,
        endDay: i,
        startTime: day.startTime,
        endTime: day.endTime,
        isAvailable: day.isAvailable,
      };
    } else {
      const currentKey = `${currentGroup.startTime || "none"}-${currentGroup.endTime || "none"}-${currentGroup.isAvailable}`;
      
      if (key === currentKey && day.isAvailable === currentGroup.isAvailable) {
        // Extender el grupo actual
        currentGroup.endDay = i;
      } else {
        // Finalizar grupo actual y empezar uno nuevo
        const dayNames = DAY_NAMES;
        if (currentGroup.startDay === currentGroup.endDay) {
          result.push({
            days: dayNames[currentGroup.startDay].short,
            startTime: currentGroup.startTime,
            endTime: currentGroup.endTime,
            isAvailable: currentGroup.isAvailable,
          });
        } else {
          result.push({
            days: `${dayNames[currentGroup.startDay].short}–${dayNames[currentGroup.endDay].short}`,
            startTime: currentGroup.startTime,
            endTime: currentGroup.endTime,
            isAvailable: currentGroup.isAvailable,
          });
        }
        
        currentGroup = {
          startDay: i,
          endDay: i,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        };
      }
    }
  }

  // Agregar el último grupo
  if (currentGroup) {
    const dayNames = DAY_NAMES;
    if (currentGroup.startDay === currentGroup.endDay) {
      result.push({
        days: dayNames[currentGroup.startDay].short,
        startTime: currentGroup.startTime,
        endTime: currentGroup.endTime,
        isAvailable: currentGroup.isAvailable,
      });
    } else {
      result.push({
        days: `${dayNames[currentGroup.startDay].short}–${dayNames[currentGroup.endDay].short}`,
        startTime: currentGroup.startTime,
        endTime: currentGroup.endTime,
        isAvailable: currentGroup.isAvailable,
      });
    }
  }

  return result;
}

