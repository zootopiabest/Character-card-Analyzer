// The optional "immersion module" system: extra creative report sections the
// user can toggle per mode. Only the selected modules are requested from the
// model (the schema prompt is assembled at request time), so unchecked
// modules cost zero output tokens. Pure data here — the picker UI and its
// localStorage hook live in components/ImmersionModulesPanel.tsx, the prompt
// fragments in systemInstructions.ts.

export type AppModeId = "audit" | "comparison" | "group" | "multichar";

export type ImmersionModuleId =
  | "datingProfile"
  | "shoppingList"
  | "topSongs"
  | "demise"
  | "psychoanalysis"
  | "emotionalRegisters"
  | "boringTuesday"
  | "pissThemOff";

export interface ImmersionModuleMeta {
  id: ImmersionModuleId;
  label: string;
  blurb: string;
}

export const IMMERSION_MODULES: ImmersionModuleMeta[] = [
  {
    id: "datingProfile",
    label: "Dating App Profile",
    blurb: "Their Tinder/Grindr bio, adapted to whatever dating looks like in their universe.",
  },
  {
    id: "shoppingList",
    label: "Against-Type Shopping List",
    blurb: "An in-universe shopping run for things OUTSIDE their usual likes.",
  },
  {
    id: "topSongs",
    label: "Top 5 Songs",
    blurb: "Their most-listened tracks, in-universe adjusted.",
  },
  {
    id: "demise",
    label: "Demise & Obituary",
    blurb: "The most fitting way they'd die, plus their in-universe obituary.",
  },
  {
    id: "psychoanalysis",
    label: "Psychoanalysis",
    blurb: "A grounded psychological reading of the character.",
  },
  {
    id: "emotionalRegisters",
    label: "Emotional Registers",
    blurb: "How they react to sad, angry, happy, grief, and comedy beats.",
  },
  {
    id: "boringTuesday",
    label: "The Boring Tuesday Test",
    blurb: "One ordinary, low-stakes inconvenience and what they actually notice, say, and do about it.",
  },
  {
    id: "pissThemOff",
    label: "Three Ways to Piss Them Off",
    blurb: "A trivial irritation, a personal hurt, and something they claim doesn't bother them.",
  },
];

// Heavy modes (comparison doubles every field; group/multichar multiply by
// roster size) default to everything off so runs stay cheap unless opted in.
export const DEFAULT_IMMERSION_MODULES: Record<AppModeId, ImmersionModuleId[]> = {
  audit: ["datingProfile", "shoppingList"],
  comparison: [],
  group: [],
  multichar: [],
};

export function isImmersionModuleId(v: unknown): v is ImmersionModuleId {
  return typeof v === "string" && IMMERSION_MODULES.some((m) => m.id === v);
}
