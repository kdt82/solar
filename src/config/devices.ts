export type FroniusDevice = {
  id: string;
  label: string;
  url: string;
  headers?: Record<string, string>;
};

const nelsonHeaders =
  process.env.FRONIUS_NELSONS_CF_ID && process.env.FRONIUS_NELSONS_CF_SECRET
    ? {
        "CF-Access-Client-Id": process.env.FRONIUS_NELSONS_CF_ID,
        "CF-Access-Client-Secret": process.env.FRONIUS_NELSONS_CF_SECRET,
      }
    : undefined;

const grannyHeaders =
  process.env.FRONIUS_GRANNY_CF_ID && process.env.FRONIUS_GRANNY_CF_SECRET
    ? {
        "CF-Access-Client-Id": process.env.FRONIUS_GRANNY_CF_ID,
        "CF-Access-Client-Secret": process.env.FRONIUS_GRANNY_CF_SECRET,
      }
    : undefined;

export const devices: FroniusDevice[] = [
  {
    id: "nelsons-house",
    label: "Nelsons House",
    url: process.env.FRONIUS_NELSONS_URL ?? "http://192.168.50.97",
    headers: nelsonHeaders,
  },
  {
    id: "granny-flat",
    label: "Granny Flat",
    url: process.env.FRONIUS_GRANNY_URL ?? "http://192.168.50.27",
    headers: grannyHeaders,
  },
];

export const propertyLabel = process.env.FRONIUS_PROPERTY_LABEL ?? "5 Oxford Road";
