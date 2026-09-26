/** Cell in the 4 × 5 code-native SVG atlas. Unknown equipment keeps its normal text presentation. */
export function shipLootIconIndex(label: string): number | null {
  const text = label.toLocaleLowerCase('es');
  if (/vino fino|botellas? de vino/.test(text)) return 0;
  if (/clavo de olor/.test(text)) return 1;
  if (/lingotes? de plata/.test(text)) return 2;
  if (/candelabros? de hueso/.test(text)) return 3;
  if (/laúd|laud/.test(text)) return 4;
  if (/pergamino|orden imperiosa/.test(text)) return 5;
  if (/\b(?:50|55|200) po\b|bolsa con|monedas? de oro/.test(text)) return 6;
  if (/turquesas?/.test(text)) return 7;
  if (/botas? (?:de|élficas?|elficas?)/.test(text)) return 8;
  if (/paquete encerado/.test(text)) return 9;
  if (/diario|bitácora/.test(text)) return 10;
  if (/talismán|talisman/.test(text)) return 11;
  if (/antorchas?/.test(text)) return 12;
  if (/cartógraf/.test(text)) return 13;
  if (/dagas?/.test(text)) return 14;
  if (/brújula|brujula/.test(text)) return 15;
  if (/pulsera/.test(text)) return 16;
  if (/pendiente/.test(text)) return 17;
  if (/ojo de tigre/.test(text)) return 18;
  if (/heliotropo/.test(text)) return 19;
  return null;
}
