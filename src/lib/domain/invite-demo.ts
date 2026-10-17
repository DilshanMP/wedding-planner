import { contentFromWedding, designFromTemplate, initials, type InviteContent, type InviteDesign } from "./invite-studio";

/** Sample couple for the landing page and template previews. */
export function demoContent(): InviteContent {
  const c = contentFromWedding({ brideName: "Amaya", groomName: "Kavindu", weddingDate: "2027-05-27", venue: "The Lakeside Atrium", location: "Bolgoda, Sri Lanka" }, [
    { time: "17:00", title: "Guests arrive" },
    { time: "17:30", title: "Poruwa ceremony" },
    { time: "19:00", title: "Reception & first dance" },
    { time: "20:30", title: "Dinner" },
    { time: "23:30", title: "Going-away" },
  ]);
  return {
    ...c,
    brideFull: "Amaya Perera",
    groomFull: "Kavindu Silva",
    brideParents: "Mr. & Mrs. Perera",
    groomParents: "Mr. & Mrs. Silva",
    time: "17:00",
    ceremonyVenue: "Lakeside lawn",
    receptionVenue: "The Crystal Atrium",
    dressCode: "Ivory, champagne or dusty pink",
    rsvpDeadline: "2027-04-30",
    contacts: "Amaya · 077 123 4567\nKavindu · 071 765 4321",
  };
}

export function demoDesign(templateId: string): InviteDesign {
  const d = designFromTemplate(templateId);
  d.seal.text = initials("Amaya", "Kavindu");
  return d;
}
