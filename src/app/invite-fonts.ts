import { Bodoni_Moda, Cinzel, Jost, Noto_Sans_Sinhala, Noto_Serif_Sinhala, Parisienne, Pinyon_Script, Playfair_Display } from "next/font/google";

/**
 * Typefaces for EverAfter Studio invitations. Fonts are declared once; the
 * browser only downloads a file when a design actually uses it.
 */
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap", variable: "--font-playfair" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-cinzel" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-bodoni" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-pinyon" });
const parisienne = Parisienne({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-parisienne" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "swap", variable: "--font-jost" });
const serifSinhala = Noto_Serif_Sinhala({ subsets: ["sinhala"], weight: ["400", "600"], display: "swap", variable: "--font-serif-sinhala" });
const sansSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "600"], display: "swap", variable: "--font-sans-sinhala" });

export const inviteFontVars = [playfair, cinzel, bodoni, pinyon, parisienne, jost, serifSinhala, sansSinhala].map((f) => f.variable).join(" ");
