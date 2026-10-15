/**
 * Schematic ink sketches for the reference sheets on the home page
 * ("Prosjektark"). They stand in for project photos we do not have yet, and
 * are captioned "Skisse": they show the kind of job, never the actual
 * building. 4:3, 1px ink, drawn on with Strek when the sheet enters.
 * When the client sends photos tied to a reference, they replace the sketch.
 */
import { LineDrawing, type Stroke } from "@/components/ui";

/** Three gabled two-storey units in elevation (rekkehus). */
function rowHouses(): Stroke[] {
  const strokes: Stroke[] = [{ d: "M16 262H384", o: 0 }];
  const units = [50, 150, 250];
  units.forEach((x, i) => {
    strokes.push({ d: `M${x} 262V150`, o: 0.08 + i * 0.05 });
  });
  strokes.push({ d: "M350 262V150", o: 0.23 });
  units.forEach((x, i) => {
    // Gable roof with a small overhang.
    strokes.push({ d: `M${x - 7} 157L${x + 50} 96L${x + 107} 157`, o: 0.3 + i * 0.07 });
    // Front door, ground-floor window, upper window, gable vent.
    strokes.push({ d: `M${x + 12} 262V214H${x + 32}V262`, o: 0.55 + i * 0.05 });
    strokes.push({ d: `M${x + 48} 214H${x + 88}V244H${x + 48}Z`, o: 0.62 + i * 0.05 });
    strokes.push({ d: `M${x + 30} 168H${x + 70}V196H${x + 30}Z`, o: 0.72 + i * 0.05 });
    strokes.push({ d: `M${x + 45} 122H${x + 55}V132H${x + 45}Z`, o: 0.88 + i * 0.04 });
  });
  return strokes;
}

/** A three-storey block with six flats, a stair core and a window grid (Vestheim). */
function apartmentBlock(): Stroke[] {
  const strokes: Stroke[] = [
    { d: "M16 262H384", o: 0 },
    { d: "M56 262V82H344V262", o: 0.08 },
    { d: "M50 82H350", o: 0.2 },
    { d: "M56 202H344M56 142H344", o: 0.28 },
    { d: "M186 262V82M214 262V82", o: 0.36 },
    // Entrance in the stair core.
    { d: "M191 262V226H209V262", o: 0.44 },
  ];
  const floors = [212, 152, 92];
  const xs = [74, 114, 148, 236, 270, 310];
  floors.forEach((y, fi) => {
    xs.forEach((x, xi) => {
      strokes.push({ d: `M${x} ${y}H${x + 22}V${y + 32}H${x}Z`, o: 0.5 + fi * 0.14 + xi * 0.018 });
    });
  });
  // Stair-core windows, one per landing.
  floors.forEach((y, fi) => strokes.push({ d: `M194 ${y + 6}H206V${y + 26}H194Z`, o: 0.92 + fi * 0.025 }));
  return strokes;
}

/**
 * A floor plan: the old bathroom wall dashed, the new one solid (a larger
 * bathroom), and an arrow from the old kitchen into the dining room, where
 * the new kitchen goes. The old kitchen becomes a bedroom.
 */
function bathAndKitchen(): Stroke[] {
  return [
    { d: "M40 40H360V262H40Z", o: 0, weight: 1.6 },
    // Interior walls with door openings.
    { d: "M40 132H96M126 132H214M244 132H360", o: 0.18 },
    { d: "M176 40V132M270 40V132", o: 0.26 },
    // Removed wall: the old bathroom ended here.
    { d: "M132 40V132", o: 0.36, dashed: true },
    // New bathroom fittings: tub and basin.
    { d: "M50 50H122V78H50Z", o: 0.46 },
    { d: "M142 50H166V68H142Z", o: 0.52 },
    // Bed in the old kitchen (now a bedroom).
    { d: "M196 52H252V112H196ZM196 68H252", o: 0.6 },
    // New kitchen run along the dining room wall.
    { d: "M210 248H346V226H232V248", o: 0.7 },
    // Arrow: the kitchen moves into the dining room.
    { d: "M226 120C238 150 250 172 268 196", o: 0.82 },
    { d: "M256 194L268 197L266 184", o: 0.96 },
  ];
}

const SKETCHES: Record<string, { strokes: Stroke[]; label: string }> = {
  rekkehus: {
    strokes: rowHouses(),
    label: "Skisse av et rekkehus med tre boenheter, sett forfra.",
  },
  "askoy-vestheim": {
    strokes: apartmentBlock(),
    label: "Skisse av en bygning i tre etasjer med seks leiligheter og trapperom i midten.",
  },
  kjerrgarden: {
    strokes: bathAndKitchen(),
    label: "Skisse av en planløsning: badet blir større, kjøkkenet flyttes inn i spisestuen, og det gamle kjøkkenet blir soverom.",
  },
};

export function hasReferenceSketch(id: string): boolean {
  return id in SKETCHES;
}

export function ReferenceSketch({ id, className }: { id: string; className?: string }) {
  const sketch = SKETCHES[id];
  if (!sketch) return null;
  return (
    <LineDrawing
      viewBox="0 0 400 300"
      strokes={sketch.strokes}
      strokeWidth={1.35}
      label={sketch.label}
      span={1000}
      strokeDuration={700}
      className={className}
    />
  );
}
