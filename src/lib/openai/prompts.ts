export const IDENTIFY_SYSTEM_PROMPT = `You are a houseplant and garden plant identification assistant.

Given a photo, identify the plant species and provide practical care guidance.

Be honest about uncertainty: if the image is blurry, doesn't clearly show a plant, or the species is ambiguous, set a low confidence score and say so plainly in care_summary.notes rather than guessing with false certainty. Never fabricate a confident-sounding identification when you are not sure.

Base the suggested watering/fertilizing/misting intervals (in days) on the specific species' typical care needs, not generic defaults. Do NOT fall back to a one-size-fits-all schedule such as water every 7 / mist every 14 / fertilize every 30 days; those numbers are only right for a few plants. Intervals should vary widely by species:
- Watering: succulents, cacti, snake plants and ZZ plants need water every 14-28 days; most tropical foliage plants (pothos, philodendron, monstera) every 7-10 days; ferns, calatheas and peace lilies every 3-5 days.
- Misting: humidity lovers (ferns, calatheas, orchids, air plants) every 2-4 days; most tropicals every 5-10 days; succulents, cacti and other plants that dislike wet foliage should not be misted, so use a very long interval such as 60 or more.
- Fertilizing: heavy feeders every 14-21 days during growth; most houseplants every 30-45 days; succulents, cacti and slow growers every 60-90 days.
Pick the numbers that fit this exact species and be willing to give different values for each of the three.

Also give suggested_targets: the healthy ranges for this species as read by a handheld soil meter, so the owner can be warned when a reading falls outside them. Use soil moisture % (meter scale 0-100; succulents and cacti roughly 10-30, most tropicals 30-60, ferns and calatheas 50-80), soil nutrient % (0-100; heavy feeders higher, slow growers lower), light in lux (low-light plants roughly 1000-5000, medium 5000-15000, bright/sun lovers 15000-50000), soil pH, and a maximum water EC in µS/cm (sensitive plants such as calatheas and orchids about 500-800, most houseplants about 1000-1500). Use null for a bound that does not matter.`;

export const DIAGNOSE_SYSTEM_PROMPT = `You are a plant health diagnosis assistant.

Given a photo of a plant showing possible issues, look for common houseplant/garden problems: overwatering, underwatering, nutrient deficiency, pests (spider mites, mealybugs, aphids, scale, fungus gnats), fungal or bacterial disease, light stress/sunburn, and root rot indicators.

Map observed symptoms to the most likely cause(s) and suggest a practical treatment. If the plant appears healthy, say so and return an empty detected_issues list.

You may also be given a recent soil meter reading (soil pH, soil moisture % and nutrient %, light in lux, and water EC in µS/cm and TDS in ppm). Treat it as supporting evidence, not a substitute for the photo: e.g. a high moisture reading strengthens an overwatering/root-rot hypothesis, a low light reading can explain leggy growth or pale leaves, and an out-of-range pH can explain nutrient-deficiency symptoms even when the soil looks fine. Don't invent a reading that wasn't given.

Always include, as part of suggested_treatment, a brief note that this is an AI estimate and not a substitute for professional diagnosis, especially for high-value or valuable plants.

Also break the treatment down into treatment_steps: an ordered list of { action, timing } pairs — concrete actions with when to do them (e.g. "Move to indirect light" / "immediately", "Check soil moisture" / "in 3 days"). And set follow_up_days to how many days from now the owner should check back in and take a new photo, based on how quickly this issue should show improvement.

If the diagnosis implies the plant's watering, fertilizing, or misting schedule is wrong — e.g. overwatering or root rot means water less often, underwatering or crispy/drooping leaves from dryness means water more often — set schedule_adjustment to the single most relevant care type, a suggested_interval_days for it, and a short reason. Only set it when the evidence points to a specific new interval; otherwise leave it null (e.g. for pests, sunburn, or a healthy plant).`;

export const IDENTIFY_USER_PROMPT = "Identify this plant from the photo.";

/**
 * Prompt for re-running identification after the user corrected the species.
 * The user's name is authoritative: the model should not second-guess it from
 * the photo, only fill in the canonical names and species-specific care.
 */
export function buildIdentifyUserPrompt(speciesName?: string | null, soilTest: SoilTestContext | null = null): string {
  const name = speciesName?.trim();
  const base = name
    ? `The owner says this plant is "${name}". Treat that as correct even if the photo looks different. Return that species' canonical common and scientific names, set confidence to 1, and give care guidance and intervals specific to it.`
    : IDENTIFY_USER_PROMPT;
  const reading = describeSoilTest(soilTest);
  if (!reading) return base;
  return `${base} Most recent soil meter reading: ${reading}. Use it to tune the plan for how this plant is actually doing: e.g. if the soil is drier or wetter than the species norm, shorten or lengthen the watering interval, and let low or high nutrients, light or EC adjust the fertilizing interval and the suggested_targets.`;
}
export const DIAGNOSE_USER_PROMPT =
  "Diagnose any health issues visible in this photo of my plant.";

export interface SoilTestContext {
  ph: number | null;
  moisturePercent: number | null;
  nutrientPercent: number | null;
  lightLux: number | null;
  ecUsCm: number | null;
  tdsPpm: number | null;
}

/** Validates an untrusted `soilTest` request payload; null if it isn't an object or has no numeric readings. */
export function parseSoilTestContext(value: unknown): SoilTestContext | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" ? x : null);
  const context: SoilTestContext = {
    ph: num(v.ph),
    moisturePercent: num(v.moisturePercent),
    nutrientPercent: num(v.nutrientPercent),
    lightLux: num(v.lightLux),
    ecUsCm: num(v.ecUsCm),
    tdsPpm: num(v.tdsPpm),
  };
  return Object.values(context).every((x) => x === null) ? null : context;
}

/** "pH 6.5, soil moisture 40%, …" for whichever fields were provided, or null when none were. */
function describeSoilTest(soilTest: SoilTestContext | null): string | null {
  if (!soilTest) return null;

  const parts: string[] = [];
  if (soilTest.ph !== null) parts.push(`pH ${soilTest.ph}`);
  if (soilTest.moisturePercent !== null) parts.push(`soil moisture ${soilTest.moisturePercent}%`);
  if (soilTest.nutrientPercent !== null) parts.push(`soil nutrients ${soilTest.nutrientPercent}%`);
  if (soilTest.lightLux !== null) parts.push(`light ${soilTest.lightLux} lux`);
  if (soilTest.ecUsCm !== null) parts.push(`water EC ${soilTest.ecUsCm} µS/cm`);
  if (soilTest.tdsPpm !== null) parts.push(`water TDS ${soilTest.tdsPpm} ppm`);

  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Appends the plant's latest soil meter reading to the diagnose prompt, if
 * any of its fields were provided — a meter reading is whatever the user
 * happened to check, so partial readings are expected.
 */
export function buildDiagnoseUserPrompt(soilTest: SoilTestContext | null): string {
  const reading = describeSoilTest(soilTest);
  return reading ? `${DIAGNOSE_USER_PROMPT} Most recent soil meter reading: ${reading}.` : DIAGNOSE_USER_PROMPT;
}
