import type { SimulatorScene } from "./types";

export const SCENE_LABEL: Record<SimulatorScene, string> = {
  preparation: "Preparation",
  venue: "Venue opens",
  arrival: "Guests arrive",
  groom: "Groom's arrival",
  bride: "Bride's arrival",
  poruwa: "Poruwa ceremony",
  photos: "Family photos",
  reception: "Reception",
  dinner: "Lunch or dinner",
  entertainment: "Entertainment",
  cake: "Cake",
  going_away: "Going-away",
  other: "Other",
};

/** Words the simulator uses to set each scene. Restrained, specific, never cartoonish. */
export const SCENE_COPY: Record<SimulatorScene, string> = {
  preparation: "Jasmine is pinned, the saree pleats are set, and the photographer catches the quiet before the day begins.",
  venue: "The hall is ready. White and red roses, the Poruwa dressed in fresh flowers, and the first light through the windows.",
  arrival: "Families arrive, elders are seated first, and the welcome drinks are poured.",
  groom: "Kandyan drummers lead the groom in, his National Suit catching the light.",
  bride: "The bride arrives, welcomed by the groom's family. Everyone turns.",
  poruwa: "At the auspicious time, you step onto the Poruwa. The Jayamangala Gatha begins, and the thread is tied.",
  photos: "Family by family, the photographer works through the list while the light is still kind.",
  reception: "The couple's entrance. The room stands, then settles into celebration.",
  dinner: "Food is served hot, the vegetarian spread is generous, and conversations get louder.",
  entertainment: "Music, a first dance and a few speeches that run a little long.",
  cake: "The cake is cut, and the first slices go to the parents.",
  going_away: "At the going-away nekath, you leave together, waved off at the entrance.",
  other: "",
};
